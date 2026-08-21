const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');
if (!process.argv.includes('--confirm-create')) {
  throw new Error('Création désactivée par défaut. Ajoutez --confirm-create explicitement.');
}

const sourceAgentId = process.env.ELEVENLABS_SOURCE_AGENT_ID
  ?? 'agent_2201m07k477kepfsq9p5h8bh4x1g';
const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };

const voices = {
  Dutch: {
    voice_id: 'Yv0oyZ3obP9foTH7emqG',
    description: 'Use only for the Belgian Dutch or Flemish greeting and Dutch words.',
    language: 'nl',
    model_family: 'flash',
    optimize_streaming_latency: 0,
    stability: 0.62,
    speed: 0.97,
    similarity_boost: 0.82,
  },
  German: {
    voice_id: 'FTNCalFNG5bRnkkaP5Ug',
    description: 'Use only for the German greeting and German words.',
    language: 'de',
    model_family: 'flash',
    optimize_streaming_latency: 0,
    stability: 0.62,
    speed: 0.97,
    similarity_boost: 0.82,
  },
};

const firstMessage = [
  'Bonjour et bienvenue.',
  '<Dutch>Goedendag en welkom.</Dutch>',
  '<German>Guten Tag und herzlich willkommen.</German>',
  'Pour continuer, vous préférez le français,',
  '<Dutch>Nederlands</Dutch>',
  '<German>oder Deutsch ?</German>',
].join(' ');

const sourceResponse = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${sourceAgentId}`,
  { headers },
);
const source = await sourceResponse.json();
if (!sourceResponse.ok) {
  throw new Error(`Lecture de l'agent source impossible (${sourceResponse.status}): ${JSON.stringify(source)}`);
}

const conversation = structuredClone(source.conversation_config);
conversation.agent.first_message = firstMessage;
if ((conversation.agent.prompt.tool_ids?.length ?? 0) > 0) {
  delete conversation.agent.prompt.tools;
}
conversation.tts.supported_voices = Object.entries(voices).map(([label, settings]) => ({
  label,
  ...settings,
}));
conversation.tts.model_id = 'eleven_multilingual_v2';
conversation.tts.voice_id = 'eOwAMwUJEGkP44SKOXIH';
conversation.tts.stability = 0.42;
conversation.tts.similarity_boost = 0.78;
conversation.tts.speed = 0.94;

for (const preset of Object.values(conversation.language_presets ?? {})) {
  if (preset?.overrides?.agent?.first_message) {
    preset.overrides.agent.first_message = firstMessage;
  }
}
if (conversation.language_presets?.fr?.overrides?.tts) {
  conversation.language_presets.fr.overrides.tts = {
    ...conversation.language_presets.fr.overrides.tts,
    model_id: 'eleven_multilingual_v2',
    voice_id: 'eOwAMwUJEGkP44SKOXIH',
    stability: 0.38,
    similarity_boost: 0.78,
    speed: 1.00,
  };
}

const platform = structuredClone(source.platform_settings);
platform.archived = false;
delete platform.webhook;

const payload = {
  name: 'Feux en Milieu Naturel — Accueil trois voix — TEST',
  tags: [...new Set([...(source.tags ?? []), 'experimental', 'multi-voice-welcome'])],
  conversation_config: conversation,
  platform_settings: platform,
};

const createResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
  method: 'POST',
  headers,
  body: JSON.stringify(payload),
});
const result = await createResponse.json();
if (!createResponse.ok) {
  throw new Error(`Création impossible (${createResponse.status}): ${JSON.stringify(result)}`);
}

console.log(JSON.stringify({
  agent_id: result.agent_id,
  source_agent_id: sourceAgentId,
  name: payload.name,
  first_message: firstMessage,
  default_voice: {
    label: 'French',
    voice_id: conversation.tts.voice_id,
    language: 'fr',
    model_family: 'multilingual',
  },
  supported_voices: conversation.tts.supported_voices.map((voice) => ({
    label: voice.label,
    voice_id: voice.voice_id,
    language: voice.language,
    model_family: voice.model_family,
  })),
  phone_number_attached: false,
}, null, 2));
