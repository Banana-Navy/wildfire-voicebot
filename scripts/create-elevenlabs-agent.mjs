import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dailyAccessTools } from './lib/elevenlabs-access-tools.mjs';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');
if (!process.argv.includes('--confirm-create')) {
  throw new Error('Création désactivée par défaut pour éviter un doublon. Ajoutez --confirm-create explicitement.');
}

const root = resolve(import.meta.dirname, '..');
const referenceAgentId = 'agent_3401kvqnemkfev98yj4xq64tg1xn';
const knowledgeDocumentId = '89AM7w3ggzzZpzmAiiRT';
const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };

const referenceResponse = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${referenceAgentId}`,
  { headers }
);
if (!referenceResponse.ok) {
  throw new Error(`Lecture de l'agent de référence impossible (${referenceResponse.status}).`);
}

const reference = await referenceResponse.json();
const systemPrompt = await readFile(resolve(root, 'agent/system-prompt.md'), 'utf8');

const conversation = structuredClone(reference.conversation_config);
conversation.agent.first_message =
  "Bonjour et bienvenue. Goedendag en welkom. Guten Tag und herzlich willkommen. Vous préférez le français, Nederlands oder Deutsch ?";
conversation.agent.language = 'fr';
conversation.agent.disable_first_message_interruptions = false;
conversation.agent.prompt.prompt = systemPrompt;
conversation.agent.prompt.llm = 'claude-sonnet-4-5';
conversation.agent.prompt.temperature = 0;
conversation.agent.prompt.max_tokens = 180;
conversation.agent.prompt.enable_reasoning_summary = false;
conversation.agent.prompt.thinking_budget = null;
conversation.agent.prompt.reasoning_effort = null;
conversation.agent.prompt.backup_llm_config = {
  preference: 'override',
  order: ['claude-haiku-4-5'],
};
conversation.agent.prompt.tools = dailyAccessTools();
conversation.agent.prompt.tool_ids = [];
conversation.agent.prompt.mcp_server_ids = [];
conversation.agent.prompt.native_mcp_server_ids = [];
conversation.agent.prompt.knowledge_base = [{
  type: 'text',
  name: 'Feux en Milieu Naturel — Base opérationnelle contrôlée — 2026.08.17',
  id: knowledgeDocumentId,
  usage_mode: 'prompt',
}];
conversation.agent.prompt.rag = {
  ...(conversation.agent.prompt.rag ?? {}),
  enabled: false,
  optional_rag_enabled: false,
};

const referenceBuiltIns = conversation.agent.prompt.built_in_tools ?? {};
conversation.agent.prompt.built_in_tools = {
  ...Object.fromEntries(Object.keys(referenceBuiltIns).map((key) => [key, null])),
  language_detection: referenceBuiltIns.language_detection,
  end_call: referenceBuiltIns.end_call,
};
if (conversation.agent.prompt.built_in_tools.end_call) {
  conversation.agent.prompt.built_in_tools.end_call.description =
    "Lorsque l'appelant confirme qu'il raccroche, demande à terminer ou n'a plus de question, " +
    "prononce exactement une fois la clôture de la langue active : « Merci de votre appel. », " +
    "« Bedankt voor uw oproep. » ou « Vielen Dank für Ihren Anruf. ». " +
    "Utilise cette même phrase dans system__message_to_speak, termine immédiatement et n'ajoute rien. " +
    "N'appelle jamais cet outil automatiquement après une consigne d'urgence ou une orientation vers le 112; attends une confirmation explicite de l'appelant. " +
    "Un merci, bedankt ou danke isolé après une réponse, sans nouvelle question, vaut confirmation de fin d'appel. " +
    "Prononce alors uniquement la clôture localisée, appelle cet outil et ne demande jamais si l'appelant a d'autres questions.";
  conversation.agent.prompt.built_in_tools.end_call.pre_tool_speech = 'off';
  conversation.agent.prompt.built_in_tools.end_call.force_pre_tool_speech = false;
  conversation.agent.prompt.built_in_tools.end_call.tool_call_sound = null;
}
if (conversation.agent.prompt.built_in_tools.language_detection) {
  conversation.agent.prompt.built_in_tools.language_detection.description =
    "PORTE ABSOLUE AU PREMIER TOUR : dès que fr, nl ou de est identifiable, ta seule sortie avant tout texte doit être cet outil. " +
    "Cette règle s'applique aussi à un danger immédiat : appelle silencieusement l'outil, puis donne le 112 comme premier texte avec la voix native. " +
    "PORTE ABSOLUE EN COURS D'APPEL : si l'appelant parle clairement dans une autre langue prise en charge ou demande explicitement ce changement, ta seule sortie avant tout texte doit être cet outil. " +
    "Ne réponds jamais dans la nouvelle langue avec la voix actuelle. Après le résultat, poursuis sans rejouer l'accueil ou la présentation. " +
    "Ne rappelle jamais cet outil lorsque l'appelant continue dans la langue active et ne rejoue pas la présentation après un changement en cours d'appel. " +
    "Ne sélectionne et ne parle jamais anglais. Pour toute langue non prise en charge, n'appelle pas cet outil; dis exactement et uniquement : Français, Nederlands oder Deutsch ?";
  conversation.agent.prompt.built_in_tools.language_detection.pre_tool_speech = 'off';
  conversation.agent.prompt.built_in_tools.language_detection.interruption_mode = 'disable_during_tool_and_turn';
  conversation.agent.prompt.built_in_tools.language_detection.force_pre_tool_speech = false;
  conversation.agent.prompt.built_in_tools.language_detection.tool_call_sound = null;
}

const presetTemplate = structuredClone(
  conversation.language_presets?.nl ?? conversation.language_presets?.de ?? conversation.language_presets?.fr,
);
if (!presetTemplate?.overrides) throw new Error('Impossible de créer les presets de langue.');
const presetMessages = {
  fr: { voiceId: 'IpTJxgMFj1wbxpha4zxm', modelId: 'eleven_multilingual_v2', stability: 0.40, similarity: 0.76, speed: 0.99 },
  nl: { voiceId: 'Yv0oyZ3obP9foTH7emqG', modelId: 'eleven_flash_v2_5', stability: 0.62, similarity: 0.82, speed: 0.97 },
  de: { voiceId: 'FTNCalFNG5bRnkkaP5Ug', modelId: 'eleven_flash_v2_5', stability: 0.62, similarity: 0.82, speed: 0.97 },
};
conversation.language_presets = {};
for (const [language, settings] of Object.entries(presetMessages)) {
  const preset = structuredClone(presetTemplate);
  preset.overrides ??= {};
  preset.overrides.agent ??= {};
  preset.overrides.agent.language = language;
  preset.overrides.agent.first_message = conversation.agent.first_message;
  preset.overrides.agent.prompt = {
    llm: 'claude-sonnet-4-5',
    backup_llm_config: { preference: 'override', order: ['claude-haiku-4-5'] },
  };
  preset.overrides.tts = {
    model_id: settings.modelId ?? conversation.tts.model_id,
    voice_id: settings.voiceId,
    stability: settings.stability,
    similarity_boost: settings.similarity,
    speed: settings.speed,
  };
  conversation.language_presets[language] = preset;
}

conversation.asr.keywords = [
  'feu en milieu naturel', 'incendie', 'fumée', 'évacuation', 'BE-Alert', 'cent douze',
  '071 49 98 17', '1771', 'dix-sept septante-et-un', 'brûlure', 'respirer', 'forêt', 'broussailles',
  'bosbrand', 'natuurbrand', 'Waldbrand', 'wildfire',
  'français', 'Nederlands', 'néerlandais', 'Vlaams', 'Deutsch', 'allemand',
  'tourbe', 'tourbière', 'Hautes Fagnes', 'feu souterrain',
  'veen', 'veenbrand', 'Hoge Venen', 'smeulen',
  'Torf', 'Torfbrand', 'Hohes Venn', 'Schwelbrand',
];
conversation.asr.user_input_audio_format = 'ulaw_8000';
conversation.turn.turn_model = 'turn_v3';
conversation.turn.turn_eagerness = 'normal';
conversation.turn.speculative_turn = false;
conversation.turn.turn_timeout = 7;
conversation.turn.soft_timeout_config = {
  ...(conversation.turn.soft_timeout_config ?? {}),
  timeout_seconds: -1,
  message: 'Je vous écoute.',
  additional_soft_timeout_messages: [],
  use_llm_generated_message: false,
  randomize_fillers: false,
  max_soft_timeouts_per_generation: 1,
};
conversation.conversation.max_duration_seconds = 1200;
conversation.conversation.file_input.enabled = false;
conversation.tts.agent_output_audio_format = 'ulaw_8000';
conversation.tts.model_id = 'eleven_multilingual_v2';
conversation.tts.voice_id = 'IpTJxgMFj1wbxpha4zxm';
conversation.tts.speed = 0.99;
conversation.tts.stability = 0.40;
conversation.tts.similarity_boost = 0.76;
conversation.tts.optimize_streaming_latency = 0;
conversation.tts.expressive_mode = false;
conversation.tts.text_normalisation_type = 'system_prompt';
conversation.tts.enable_phoneme_tags = false;

const platform = structuredClone(reference.platform_settings);
platform.archived = false;
platform.privacy = {
  ...platform.privacy,
  record_voice: true,
  retention_days: 30,
  delete_audio: false,
  delete_transcript_and_pii: false,
  apply_to_existing_conversations: false,
  zero_retention_mode: false,
};
platform.workspace_overrides = {};
delete platform.webhook;
platform.data_collection = {};
platform.analysis_items = {};
platform.guardrails = { ...(platform.guardrails ?? {}) };
delete platform.guardrails.custom;

const payload = {
  name: 'Feux en Milieu Naturel — Inbound (BE)',
  tags: ['wildfire', 'inbound', 'belgium', 'trilingual'],
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
  name: payload.name,
  languages: ['fr', 'nl', 'de'],
  tools: conversation.agent.prompt.tools.map(({ name }) => name),
  phone_number_attached: false,
  voice_recording: true,
  transcript_retention_days: 30,
}, null, 2));
