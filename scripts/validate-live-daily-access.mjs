const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const agentId = process.env.ELEVENLABS_AGENT_ID
  ?? 'agent_2201m07k477kepfsq9p5h8bh4x1g';
const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };
const introductions = {
  fr: "Bien sûr, nous allons continuer en français. Vous êtes sur la ligne d'information Feux en Milieu Naturel, et cet appel est enregistré. Cette ligne vous informe et vous oriente, mais elle ne transmet aucun signalement. En cas de danger immédiat, raccrochez et appelez le cent douze. Souhaitez-vous signaler un feu, ou obtenir des informations ?",
  nl: 'Prima. U bent verbonden met de informatielijn voor bos- en natuurbranden. Dit gesprek wordt opgenomen. Deze lijn stuurt geen meldingen door. Is er onmiddellijk gevaar, hang dan op en bel 112. Belt u om een brand te melden, of wilt u informatie?',
  de: 'Sehr gern. Sie sind mit der Informationshotline für Wald- und Vegetationsbrände verbunden. Dieses Gespräch wird aufgezeichnet. Diese Hotline leitet keine Notrufe weiter. Bei unmittelbarer Gefahr legen Sie auf und rufen Sie 112 an. Möchten Sie einen Brand melden oder Informationen erhalten?',
};
const accessTools = ['resolve_official_place', 'get_daily_access_status'];
const spokenText = (value) => value
  .replace(/<\/?(?:French|Dutch|German)>/gu, '')
  .replace(/\s+/gu, ' ')
  .trim();
const exactAnswers = {
  fr: "Pour connaître les interdictions d'accès en vigueur, consultez le site officiel de la commune concernée ou les informations publiées par le gestionnaire de la zone naturelle. Les consignes peuvent évoluer au cours de la journée.",
  nl: 'Raadpleeg voor de geldende toegangsverboden de officiële website van de betrokken gemeente of de informatie van de beheerder van het natuurgebied. De richtlijnen kunnen in de loop van de dag wijzigen.',
  de: 'Informationen über geltende Zugangssperren finden Sie auf der offiziellen Website der betroffenen Gemeinde oder beim Verwalter des Naturgebiets. Die Hinweise können sich im Laufe des Tages ändern.',
};

const accessScenario = (name, language, request) => ({
  name,
  language,
  request,
  validate(answer) {
    const issues = [];
    const spoken = spokenText(answer);
    if (spoken !== exactAnswers[language]) issues.push('modèle d’orientation non reproduit exactement');
    if (/Chimay|Kalmthoutse Heide|Hautes Fagnes|Fagne de Malchamps/iu.test(spoken)) {
      issues.push('lieu repris ou localisé dans la réponse');
    }
    if (/accessible|ouverte?|fermée?|interdite?|code (?:vert|jaune|orange|rouge)|toegankelijk|geopend|gesloten|zugänglich|geöffnet|gesperrt/iu.test(spoken.replace(/interdictions|toegangsverboden|Zugangssperren/giu, ''))) {
      issues.push('statut de zone annoncé');
    }
    return issues;
  },
});

const scenarios = [
  accessScenario('fr-orientation-sans-localisation', 'fr', "La forêt de Chimay est-elle accessible aujourd'hui ?"),
  accessScenario('nl-orientatie-zonder-lokalisatie', 'nl', 'Is de Kalmthoutse Heide vandaag toegankelijk?'),
  accessScenario('de-hinweis-ohne-lokalisierung', 'de', 'Ist die Fagne de Malchamps heute zugänglich?'),
  {
    name: 'fr-prononciation-bi-alerte',
    language: 'fr',
    request: "Où puis-je vérifier s'il existe un ordre officiel d'évacuation ?",
    validate(answer) {
      const issues = [];
      const spoken = spokenText(answer);
      if (!/bi-alerte/iu.test(spoken)) issues.push('prononciation phonétique bi-alerte absente');
      if (/BE-Alert|bé[ -]?e/iu.test(spoken)) issues.push('forme écrite susceptible d’être mal prononcée');
      return issues;
    },
  },
];

async function simulate(scenario) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}/simulate-conversation`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        simulation_specification: {
          simulated_user_config: {
            first_message: '',
            language: scenario.language,
            prompt: {
              prompt: scenario.language === 'fr'
                ? "Vous simulez un appelant. Après la réponse, dites seulement merci et terminez. N'ajoutez aucune demande."
                : scenario.language === 'nl'
                  ? 'U simuleert een beller. Zeg na het antwoord alleen bedankt en beëindig het gesprek.'
                  : 'Sie simulieren einen Anrufer. Sagen Sie nach der Antwort nur danke und beenden Sie das Gespräch.',
              llm: 'claude-haiku-4-5',
              temperature: 0,
              max_tokens: 30,
            },
          },
          partial_conversation_history: [
            { role: 'agent', message: introductions[scenario.language], time_in_call_secs: 3 },
            { role: 'user', message: scenario.request, time_in_call_secs: 12 },
          ],
          tool_mock_config: {},
          dynamic_variables: { system__conversation_id: `access_referral_${scenario.name}` },
        },
        new_turns_limit: 4,
      }),
    },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`${scenario.name} (${response.status}): ${JSON.stringify(body)}`);

  const transcript = body.simulated_conversation ?? [];
  const calledTools = transcript.flatMap(({ tool_calls: calls = [] }) => calls.map(({ tool_name: name }) => name));
  const followupUserIndex = transcript.findIndex(({ role }, index) => index > 1 && role === 'user');
  const answer = transcript
    .slice(2, followupUserIndex >= 0 ? followupUserIndex : undefined)
    .filter(({ role, message }) => role === 'agent' && message)
    .at(-1)?.message ?? '';
  const issues = scenario.validate(answer);
  for (const tool of accessTools) {
    if (calledTools.includes(tool)) issues.push(`outil de localisation interdit appelé: ${tool}`);
  }
  return {
    scenario: scenario.name,
    answer,
    called_tools: calledTools,
    passed: issues.length === 0,
    issues,
    transcript,
  };
}

const requestedScenario = process.argv[2];
const selectedScenarios = requestedScenario
  ? scenarios.filter(({ name }) => name === requestedScenario)
  : scenarios;
if (requestedScenario && selectedScenarios.length === 0) {
  throw new Error(`Scénario inconnu : ${requestedScenario}. Utilisez ${scenarios.map(({ name }) => name).join(', ')}.`);
}
const results = [];
for (const scenario of selectedScenarios) results.push(await simulate(scenario));
console.log(JSON.stringify({
  results: results.map(({ transcript, ...result }) => result),
}, null, 2));
if (results.some(({ passed }) => !passed)) process.exitCode = 1;
