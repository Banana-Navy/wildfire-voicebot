const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const agentId = 'agent_2201m07k477kepfsq9p5h8bh4x1g';
const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };
const introductions = {
  fr: "Très bien, merci. Vous êtes sur la ligne d'information Feux en Milieu Naturel, et cet appel est enregistré. Cette ligne vous informe et vous oriente, mais elle ne transmet aucun signalement. En cas de danger immédiat, raccrochez et appelez le cent douze. Souhaitez-vous signaler un feu, ou obtenir des informations ?",
  nl: 'Prima. U bent verbonden met de informatielijn voor bos- en natuurbranden. Dit gesprek wordt opgenomen. Deze lijn stuurt geen meldingen door. Is er onmiddellijk gevaar, hang dan op en bel 112. Belt u om een brand te melden, of wilt u informatie?',
  de: 'Sehr gern. Sie sind mit der Informationshotline für Wald- und Vegetationsbrände verbunden. Dieses Gespräch wird aufgezeichnet. Diese Hotline leitet keine Notrufe weiter. Bei unmittelbarer Gefahr legen Sie auf und rufen Sie 112 an. Möchten Sie einen Brand melden oder Informationen erhalten?',
};

const scenarios = [
  {
    name: 'fr-kalmthoutse-heide',
    language: 'fr',
    placeSlug: 'kalmthoutse-heide',
    request: "La Kalmthoutse Heide est-elle accessible aujourd'hui ?",
    expectedTools: ['resolve_official_place', 'get_daily_access_status'],
    forbiddenTools: [],
    validate(answer) {
      return [
        [/code officiel|niveau officiel|vigilance officielle/iu, 'niveau officiel absent'],
        [/ne confirme pas|ne permet pas de confirmer/iu, 'ouverture individuelle déduite du code'],
        [/change(?:r)? chaque jour|changer quotidiennement/iu, 'avis de changement quotidien absent'],
      ].filter(([pattern]) => !pattern.test(answer)).map(([, issue]) => issue);
    },
  },
  {
    name: 'nl-zonienwoud-ambigu',
    language: 'nl',
    placeSlug: 'zonienwoud',
    request: 'Is het Zoniënwoud vandaag toegankelijk?',
    expectedTools: ['resolve_official_place'],
    forbiddenTools: ['get_daily_access_status'],
    validate(answer) {
      return /Brussel/iu.test(answer) && /Vlaams-Brabant/iu.test(answer)
        ? []
        : ['le lieu ambigu n’a pas été clarifié'];
    },
  },
  {
    name: 'fr-chimay-sans-deduction',
    language: 'fr',
    placeSlug: 'chimay',
    request: "La forêt de Chimay est-elle accessible aujourd'hui ?",
    expectedTools: ['resolve_official_place', 'get_daily_access_status'],
    forbiddenTools: [],
    validate(answer) {
      const issues = [];
      if (!/publication officielle|mesure régionale/iu.test(answer) || !/Chimay/iu.test(answer)) {
        issues.push('absence de la publication officielle non explicitée pour Chimay');
      }
      if (!/ne (?:peux|permet) (?:donc )?(?:pas )?confirmer|ne peux donc ni confirmer/iu.test(answer)) {
        issues.push('accès de Chimay non laissé explicitement non confirmé');
      }
      if (/ne fait pas partie|n['’]est pas concern|hors (?:du )?périmètre|(?:est|reste) (?:accessible|ouvert)/iu.test(answer)) {
        issues.push('exclusion ou ouverture déduite sans preuve cartographique');
      }
      if (!/change(?:r)? chaque jour|peut changer/iu.test(answer)) {
        issues.push('avis de changement quotidien absent');
      }
      return issues;
    },
  },
  {
    name: 'fr-hautes-fagnes-fermeture-nommee',
    language: 'fr',
    placeSlug: 'hautes-fagnes',
    request: "Les Hautes Fagnes sont-elles accessibles aujourd'hui ?",
    expectedTools: ['resolve_official_place', 'get_daily_access_status'],
    forbiddenTools: [],
    validate(answer) {
      const issues = [];
      if (!/(?:accès|circulation)[^.]{0,90}interdit|interdit[^.]{0,90}(?:accès|circulation)/iu.test(answer)) {
        issues.push('interdiction officiellement nommée absente');
      }
      if (!/change(?:r)? chaque jour|peut changer/iu.test(answer)) {
        issues.push('avis de changement quotidien absent');
      }
      return issues;
    },
  },
  {
    name: 'fr-verviers-commune-pas-cantonnement',
    language: 'fr',
    placeSlug: 'verviers',
    request: "La commune de Verviers est-elle soumise à l'interdiction d'accès aujourd'hui ?",
    expectedTools: ['resolve_official_place', 'get_daily_access_status'],
    forbiddenTools: [],
    validate(answer) {
      const issues = [];
      if (!/Verviers/iu.test(answer) || !/ne (?:peux|permet)[^.]{0,60}confirmer|ni confirmer/iu.test(answer)) {
        issues.push('homonymie commune-cantonnement non laissée non confirmée');
      }
      if (/commune[^.]{0,90}(?:interdite|fermée|soumise)|(?:interdite|fermée)[^.]{0,90}commune/iu.test(answer)) {
        issues.push('fermeture du cantonnement appliquée à tort à la commune');
      }
      return issues;
    },
  },
  {
    name: 'nl-kalmthoutse-heide',
    language: 'nl',
    placeSlug: 'kalmthoutse-heide',
    request: 'Is de Kalmthoutse Heide vandaag toegankelijk?',
    expectedTools: ['resolve_official_place', 'get_daily_access_status'],
    forbiddenTools: [],
    validate(answer) {
      const issues = [];
      if (!/code oranje|officiële code/iu.test(answer)) issues.push('officiële Vlaamse code ontbreekt');
      if (!/bevestigt niet|niet bevestigen/iu.test(answer)) issues.push('individuele toegang wordt ten onrechte afgeleid');
      if (!/elke dag wijzigen|dagelijks wijzigen/iu.test(answer)) issues.push('dagelijkse wijzigingsmelding ontbreekt');
      if (/\b(?:cette|information est|province d['’]|accès)\b/iu.test(answer)) issues.push('Franse woorden in Nederlands antwoord');
      return issues;
    },
  },
  {
    name: 'de-fagne-de-malchamps',
    language: 'de',
    placeSlug: 'fagne-de-malchamps',
    request: 'Ist die Fagne de Malchamps heute zugänglich?',
    expectedTools: ['resolve_official_place', 'get_daily_access_status'],
    forbiddenTools: [],
    validate(answer) {
      const issues = [];
      if (!/(?:Zugang|Betreten)[^.]{0,90}(?:untersagt|gesperrt)|(?:untersagt|gesperrt)[^.]{0,90}(?:Zugang|Betreten)/iu.test(answer)) {
        issues.push('offizielle Sperrung fehlt im deutschen Antworttext');
      }
      if (!/täglich|jeden Tag/iu.test(answer)) issues.push('täglicher Änderungshinweis fehlt');
      if (/\b(?:cette|aujourd['’]hui|accès|interdit)\b/iu.test(answer)) issues.push('französische Wörter in deutscher Antwort');
      return issues;
    },
  },
];

async function simulate(scenario) {
  const resolverResponse = await fetch(
    `https://banana-navy.github.io/wildfire-voicebot/data/access/places/${scenario.placeSlug}.json`,
  );
  if (!resolverResponse.ok) throw new Error(`${scenario.name}: résolveur public indisponible.`);
  const resolverPayload = await resolverResponse.json();
  const toolMockConfig = {
    resolve_official_place: { default_return_value: JSON.stringify(resolverPayload), default_is_error: false },
  };
  if (resolverPayload.status_url) {
    const statusResponse = await fetch(resolverPayload.status_url);
    if (!statusResponse.ok) throw new Error(`${scenario.name}: statut public indisponible.`);
    toolMockConfig.get_daily_access_status = {
      default_return_value: JSON.stringify(await statusResponse.json()),
      default_is_error: false,
    };
  }
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
                ? "Vous simulez un appelant. Après la réponse à votre question, dites seulement merci et terminez. N'ajoutez aucune nouvelle demande."
                : scenario.language === 'nl'
                  ? 'U simuleert een beller. Zeg na het antwoord alleen bedankt en beëindig het gesprek. Stel geen nieuwe vraag.'
                  : 'Sie simulieren einen Anrufer. Sagen Sie nach der Antwort nur danke und beenden Sie das Gespräch. Stellen Sie keine weitere Frage.',
              llm: 'claude-haiku-4-5',
              temperature: 0,
              max_tokens: 40,
            },
          },
          partial_conversation_history: [
            { role: 'agent', message: introductions[scenario.language], time_in_call_secs: 3 },
            { role: 'user', message: scenario.request, time_in_call_secs: 12 },
          ],
          tool_mock_config: toolMockConfig,
          dynamic_variables: { system__conversation_id: `live_daily_${scenario.name}` },
        },
        new_turns_limit: 4,
      }),
    },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`${scenario.name} (${response.status}): ${JSON.stringify(body)}`);

  const transcript = body.simulated_conversation ?? [];
  const calledTools = transcript.flatMap(({ tool_calls: calls = [] }) => calls.map(({ tool_name: name }) => name));
  const toolErrors = transcript.flatMap(({ tool_results: results = [] }) =>
    results.filter(({ is_error: isError }) => isError));
  const followupUserIndex = transcript.findIndex(({ role }, index) => index > 1 && role === 'user');
  const answer = transcript
    .slice(2, followupUserIndex >= 0 ? followupUserIndex : undefined)
    .filter(({ role, message }) => role === 'agent' && message)
    .at(-1)?.message ?? '';
  const issues = scenario.validate(answer);
  for (const tool of scenario.expectedTools) {
    if (!calledTools.includes(tool)) issues.push(`outil attendu absent: ${tool}`);
  }
  for (const tool of scenario.forbiddenTools) {
    if (calledTools.includes(tool)) issues.push(`outil interdit appelé: ${tool}`);
  }
  if (toolErrors.length > 0) issues.push(`${toolErrors.length} résultat(s) d'outil en erreur`);
  return {
    scenario: scenario.name,
    answer,
    called_tools: calledTools,
    tool_errors: toolErrors,
    tool_results: transcript.flatMap(({ tool_results: toolResults = [] }) =>
      toolResults.map(({ tool_name: toolName, result_value: resultValue, is_error: isError }) => ({
        tool_name: toolName,
        result_value: resultValue,
        is_error: isError,
      }))),
    agent_messages: transcript.filter(({ role, message }) => role === 'agent' && message).map(({ message }) => message),
    passed: issues.length === 0,
    issues,
    transcript,
  };
}

const results = [];
for (const scenario of scenarios) results.push(await simulate(scenario));
console.log(JSON.stringify({
  results: results.map(({ transcript, ...result }) => result),
}, null, 2));
if (results.some(({ passed }) => !passed)) process.exitCode = 1;
