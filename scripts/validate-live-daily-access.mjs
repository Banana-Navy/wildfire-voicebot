const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const agentId = 'agent_2201m07k477kepfsq9p5h8bh4x1g';
const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };
const introductions = {
  fr: "Très bien, merci. Vous êtes sur la ligne d'information Feux en Milieu Naturel, et cet appel est enregistré. Cette ligne vous informe et vous oriente, mais elle ne transmet aucun signalement. En cas de danger immédiat, raccrochez et appelez le cent douze. Souhaitez-vous signaler un feu, ou obtenir des informations ?",
  nl: 'Prima. U bent verbonden met de informatielijn voor bos- en natuurbranden. Dit gesprek wordt opgenomen. Deze lijn stuurt geen meldingen door. Is er onmiddellijk gevaar, hang dan op en bel 112. Belt u om een brand te melden, of wilt u informatie?',
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
                : 'U simuleert een beller. Zeg na het antwoord alleen bedankt en beëindig het gesprek. Stel geen nieuwe vraag.',
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
