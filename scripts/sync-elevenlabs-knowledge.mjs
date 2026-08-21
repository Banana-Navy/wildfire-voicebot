import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DAILY_ACCESS_TOOL_IDS, dailyAccessTools } from './lib/elevenlabs-access-tools.mjs';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');
if (!process.argv.includes('--confirm')) throw new Error('Ajoutez --confirm pour modifier l’agent distant.');

const root = resolve(import.meta.dirname, '..');
const agentId = process.env.ELEVENLABS_AGENT_ID
  ?? 'agent_2201m07k477kepfsq9p5h8bh4x1g';
const documentId = '89AM7w3ggzzZpzmAiiRT';
const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };
const knowledgeFiles = [
  'knowledge/base-connaissances.md',
];
const sections = await Promise.all(knowledgeFiles.map(async (file) => {
  const content = await readFile(resolve(root, file), 'utf8');
  return `# Fichier local : ${file}\n\n${content}`;
}));
const knowledgeText = sections.join('\n\n---\n\n');
const systemPrompt = await readFile(resolve(root, 'agent/system-prompt.md'), 'utf8');

const documentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${documentId}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    name: 'Feux en Milieu Naturel — Base opérationnelle contrôlée — 2026.08.17',
    content: knowledgeText,
  }),
});
const document = await documentResponse.json();
if (!documentResponse.ok) throw new Error(`Mise à jour KB impossible (${documentResponse.status}): ${JSON.stringify(document)}`);

for (const tool of dailyAccessTools()) {
  const toolId = DAILY_ACCESS_TOOL_IDS[tool.name];
  if (!toolId) throw new Error(`Identifiant distant absent pour l'outil ${tool.name}.`);
  const toolResponse = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ tool_config: tool }),
  });
  const updatedTool = await toolResponse.json();
  if (!toolResponse.ok) {
    throw new Error(`Mise à jour de l'outil ${tool.name} impossible (${toolResponse.status}): ${JSON.stringify(updatedTool)}`);
  }
}

const agentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, { headers });
const agent = await agentResponse.json();
if (!agentResponse.ok) throw new Error(`Lecture agent impossible (${agentResponse.status}).`);

const conversation = structuredClone(agent.conversation_config);
conversation.agent.prompt.prompt = systemPrompt;
const hasMultivoiceWelcome = conversation.tts.supported_voices?.some(({ label }) => label === 'Dutch')
  && conversation.tts.supported_voices?.some(({ label }) => label === 'German');
conversation.agent.first_message = hasMultivoiceWelcome
  ? "Bonjour et bienvenue. <Dutch>Goedendag en welkom.</Dutch> <German>Guten Tag und herzlich willkommen.</German> Pour continuer, vous préférez le français, <Dutch>Nederlands</Dutch> <German>oder Deutsch ?</German>"
  : "Bonjour et bienvenue. Goedendag en welkom. Guten Tag und herzlich willkommen. Pour continuer, vous préférez le français, Nederlands oder Deutsch ?";
conversation.agent.disable_first_message_interruptions = false;
// French is the safe bootstrap language: if language routing ever misses a
// French first turn, Julien remains active and a Flemish voice cannot read it.
// Clear NL/DE choices still switch immediately to their native presets.
conversation.agent.language = 'fr';
const presetTemplate = structuredClone(
  conversation.language_presets?.nl ?? conversation.language_presets?.de ?? conversation.language_presets?.fr,
);
if (!presetTemplate?.overrides) throw new Error('Impossible de créer les presets de langue.');
const localized = {
  fr: { voiceId: 'eOwAMwUJEGkP44SKOXIH', modelId: 'eleven_multilingual_v2', stability: 0.52, similarity: 0.78, speed: 1.00 },
  nl: { voiceId: 'Yv0oyZ3obP9foTH7emqG', modelId: 'eleven_flash_v2_5', stability: 0.62, similarity: 0.82, speed: 0.97 },
  de: { voiceId: 'FTNCalFNG5bRnkkaP5Ug', modelId: 'eleven_flash_v2_5', stability: 0.62, similarity: 0.82, speed: 0.97 },
};
const languagePromptLocks = {
  fr: `# VERROU DE LANGUE FR-BE

La langue active est le français belge. Après ce basculement, chaque réponse doit être entièrement en français, sans phrase néerlandaise, allemande ou anglaise.

Pour tout signalement de flammes, de fumée proche, de feu ou de danger direct, réponds exactement et entièrement : « Raccrochez et appelez immédiatement le cent douze. Cette ligne ne peut pas transmettre votre signalement aux secours. Éloignez-vous du feu et de la fumée sans vous exposer. » Arrête immédiatement après la troisième phrase. N'ajoute aucune information à communiquer au 112, aucune question, aucune quatrième phrase et aucune balise audio entre crochets telle que [urgent], que l'appelant semble calme, paniqué ou confus.

Pour toute question générale sur un feu de tourbe qui peut encore couver ou reprendre, réponds exactement et entièrement : « Oui, un feu dans la tourbe peut rester caché sous la surface et reprendre. La date de départ du feu ne suffit pas à confirmer que le danger est terminé. N'entrez pas dans une zone fermée et suivez uniquement l'avis actuel des autorités et du gestionnaire. »`,
  nl: `# TAALSLOT NL-BE

De actieve taal is Belgisch Nederlands. Na deze omschakeling moet elk antwoord volledig Nederlands zijn, zonder Franse, Duitse of Engelse zinnen.

Antwoord bij elke melding van vlammen, nabije rook, brand of direct gevaar exact en volledig: « Hang op en bel onmiddellijk 112. Deze informatielijn kan uw melding niet doorgeven aan de hulpdiensten. Ga weg van het vuur en de rook zonder uzelf in gevaar te brengen. » Stop onmiddellijk na de derde zin. Voeg geen informatie toe die de beller aan 112 moet doorgeven, geen vraag, geen vierde zin en geen audiotag tussen vierkante haken zoals [urgent], ongeacht of de beller kalm, in paniek of verward lijkt.

Beantwoord elke algemene vraag over een veenbrand die kan blijven smeulen of opnieuw oplaaien exact en volledig als volgt: « Ja, een brand in veen kan onder het oppervlak verborgen blijven en opnieuw oplaaien. De begindatum van de brand volstaat niet om te besluiten dat het gevaar voorbij is. Ga een afgesloten gebied niet binnen en volg alleen het actuele advies van de overheid en de terreinbeheerder. »`,
  de: `# SPRACHSPERRE DE

Die aktive Sprache ist Deutsch. Nach dieser Umschaltung muss jede Antwort vollständig deutsch sein, ohne französische, niederländische oder englische Sätze.

Antworten Sie bei jeder Meldung von Flammen, Rauch in der Nähe, Feuer oder unmittelbarer Gefahr exakt und vollständig: « Legen Sie auf und rufen Sie sofort 112 an. Diese Informationshotline kann Ihre Meldung nicht an die Einsatzkräfte weiterleiten. Entfernen Sie sich vom Feuer und vom Rauch, ohne sich zu gefährden. » Beenden Sie die Antwort unmittelbar nach dem dritten Satz. Fügen Sie keine Angaben für die 112, keine Frage, keinen vierten Satz und kein Audio-Tag in eckigen Klammern wie [urgent] hinzu, unabhängig davon, ob der Anrufer ruhig, panisch oder verwirrt wirkt.

Beantworten Sie jede allgemeine Frage zu einem Torfbrand, der weiterschwelen oder erneut aufflammen kann, exakt und vollständig so: « Ja, ein Feuer im Torfboden kann unter der Oberfläche verborgen bleiben und erneut aufflammen. Aus dem Datum des Brandausbruchs lässt sich nicht ableiten, dass die Gefahr vorbei ist. Betreten Sie kein gesperrtes Gebiet und folgen Sie ausschließlich den aktuellen Hinweisen der Behörden und des Gebietsverwalters. »`,
};
conversation.asr.user_input_audio_format = 'ulaw_8000';
conversation.asr.keywords = Array.from(new Set([
  ...(conversation.asr.keywords ?? []), '071 49 98 17', 'zéro septante-et-un', 'quarante-neuf', 'nonante-huit',
  'français', 'Nederlands', 'néerlandais', 'Vlaams', 'Deutsch', 'allemand',
  'tourbe', 'tourbière', 'Hautes Fagnes', 'feu souterrain',
  'Baraque de Fraiture', 'Baraque Fraiture', 'Vielsalm',
  'veen', 'veenbrand', 'Hoge Venen', 'smeulen',
  'Torf', 'Torfbrand', 'Hohes Venn', 'Schwelbrand',
])).filter((keyword) => !['English', 'anglais', 'Engels', 'peat', 'peat fire', 'High Fens', 'smouldering'].includes(keyword));
conversation.tts.agent_output_audio_format = 'ulaw_8000';
conversation.tts.model_id = 'eleven_multilingual_v2';
conversation.tts.voice_id = 'eOwAMwUJEGkP44SKOXIH';
conversation.tts.stability = 0.52;
conversation.tts.similarity_boost = 0.78;
conversation.tts.speed = 0.94;
conversation.tts.optimize_streaming_latency = 0;
conversation.tts.expressive_mode = false;
conversation.tts.text_normalisation_type = 'system_prompt';
conversation.tts.enable_phoneme_tags = false;
conversation.turn.turn_model = 'turn_v3';
conversation.turn.turn_eagerness = 'normal';
conversation.turn.turn_timeout = 7;
conversation.turn.speculative_turn = false;
conversation.turn.soft_timeout_config = {
  ...(conversation.turn.soft_timeout_config ?? {}),
  timeout_seconds: -1,
  message: 'Je vous écoute.',
  additional_soft_timeout_messages: [],
  use_llm_generated_message: false,
  randomize_fillers: false,
  max_soft_timeouts_per_generation: 1,
};
conversation.agent.prompt.knowledge_base = [{
  type: 'text',
  name: document.name,
  id: document.id,
  usage_mode: 'prompt',
}];
conversation.agent.prompt.rag = {
  ...(conversation.agent.prompt.rag ?? {}),
  enabled: false,
  optional_rag_enabled: false,
  embedding_model: 'multilingual_e5_large_instruct',
  max_documents_length: 18000,
};
// Language routing is a hard safety gate. Sonnet is used before and after the
// switch because the lower-capacity model skipped language_detection during a
// real French call and let the Flemish bootstrap voice speak French.
conversation.agent.prompt.llm = 'claude-sonnet-4-5';
conversation.agent.prompt.backup_llm_config = { preference: 'override', order: ['claude-haiku-4-5'] };
conversation.agent.prompt.temperature = 0;
conversation.agent.prompt.max_tokens = 180;
const builtIns = conversation.agent.prompt.built_in_tools ?? {};
const endCallDescription =
  "Lorsque l'appelant confirme qu'il raccroche, demande à terminer ou n'a plus de question, " +
  "prononce exactement une fois la clôture de la langue active : « Merci de votre appel. », " +
  "« Bedankt voor uw oproep. » ou « Vielen Dank für Ihren Anruf. ». " +
  "Utilise cette même phrase dans system__message_to_speak, termine immédiatement et n'ajoute rien. " +
  "N'appelle jamais cet outil automatiquement après une consigne d'urgence ou une orientation vers le 112; attends une confirmation explicite de l'appelant.";
const isolatedThanksDescription =
  " Un merci, bedankt ou danke isolé après une réponse, sans nouvelle question, vaut confirmation de fin d'appel. " +
  "Prononce alors uniquement la clôture localisée, appelle cet outil et ne demande jamais si l'appelant a d'autres questions.";
const languageDescription =
  "PORTE ABSOLUE AU PREMIER TOUR : dès que fr, nl ou de est identifiable, ta seule sortie avant tout texte doit être cet outil. " +
  "Cette règle s'applique aussi à un danger immédiat : appelle silencieusement l'outil, puis donne le 112 comme premier texte avec la voix native. " +
  "PORTE ABSOLUE EN COURS D'APPEL : si l'appelant parle clairement dans une autre langue prise en charge ou demande explicitement ce changement, ta seule sortie avant tout texte doit être cet outil. " +
  "Ne réponds jamais dans la nouvelle langue avec la voix actuelle. Après le résultat, poursuis sans rejouer l'accueil ou la présentation. " +
  "Ne rappelle jamais cet outil lorsque l'appelant continue dans la langue active et ne rejoue pas la présentation après un changement en cours d'appel. " +
  "Les seules langues autorisées sont fr, nl et de; ne sélectionne jamais l'anglais et ne réponds jamais en anglais. " +
  "Pour toute langue non prise en charge, n'appelle pas cet outil; dis exactement et uniquement : Français, Nederlands oder Deutsch ?";
const configureEndCall = (tool) => {
  if (!tool) return;
  tool.description = endCallDescription + isolatedThanksDescription;
  tool.pre_tool_speech = 'off';
  tool.force_pre_tool_speech = false;
  tool.tool_call_sound = null;
};
const configureLanguage = (tool) => {
  if (!tool) return;
  tool.description = languageDescription;
  tool.pre_tool_speech = 'off';
  tool.interruption_mode = 'disable_during_tool_and_turn';
  tool.force_pre_tool_speech = false;
  tool.tool_call_sound = null;
};
configureEndCall(builtIns.end_call);
configureLanguage(builtIns.language_detection);
const expandedTools = conversation.agent.prompt.tools ?? [];
for (const tool of expandedTools) {
  if (tool?.name === 'end_call') configureEndCall(tool);
  if (tool?.name === 'language_detection') configureLanguage(tool);
}
const existingToolIds = conversation.agent.prompt.tool_ids ?? [];
if (existingToolIds.length > 0) {
  conversation.agent.prompt.tool_ids = existingToolIds;
  delete conversation.agent.prompt.tools;
} else {
  conversation.agent.prompt.tool_ids = [];
  conversation.agent.prompt.tools = [
    ...expandedTools.filter((tool) =>
      !['resolve_official_place', 'get_daily_access_status'].includes(tool?.name)),
    ...dailyAccessTools(),
  ];
}

conversation.language_presets = {};
for (const [language, settings] of Object.entries(localized)) {
  const preset = structuredClone(presetTemplate);
  preset.overrides ??= {};
  preset.overrides.agent ??= {};
  preset.overrides.agent.language = language;
  preset.overrides.agent.first_message = conversation.agent.first_message;
  preset.overrides.agent.prompt = {
    prompt: `${systemPrompt}\n\n${languagePromptLocks[language]}`,
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

const platform = structuredClone(agent.platform_settings);
platform.privacy = {
  ...platform.privacy,
  record_voice: true,
  retention_days: 30,
  delete_audio: false,
  delete_transcript_and_pii: false,
  apply_to_existing_conversations: false,
  zero_retention_mode: false,
};

const updateResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ name: agent.name, conversation_config: conversation, platform_settings: platform }),
});
const update = await updateResponse.json();
if (!updateResponse.ok) throw new Error(`Mise à jour agent impossible (${updateResponse.status}): ${JSON.stringify(update)}`);

const phoneNumberId = 'phnum_2001kg33d8jcf1xskxqqz6ryqtk3';
const agentBranchId = process.env.ELEVENLABS_AGENT_BRANCH_ID ?? agent.branch_id;
if (!agentBranchId) throw new Error('Branche ElevenLabs cible absente.');
const phoneResponse = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    agent_id: agentId,
    branch_id: agentBranchId,
    label: 'Feux en Milieu Naturel — 071 49 98 17',
  }),
});
const phone = await phoneResponse.json();
if (!phoneResponse.ok) throw new Error(`Rafraîchissement téléphonie impossible (${phoneResponse.status}): ${JSON.stringify(phone)}`);

console.log(JSON.stringify({
  agent_id: agentId,
  agent_branch_id: agentBranchId,
  knowledge_document_id: document.id,
  knowledge_document_name: document.name,
  knowledge_characters: knowledgeText.length,
  rag_enabled: false,
  audio_recording: true,
  retention_days: 30,
  phone_number: phone.phone_number,
  phone_number_id: phone.phone_number_id,
  input_audio_format: conversation.asr.user_input_audio_format,
  output_audio_format: conversation.tts.agent_output_audio_format,
  voice_id: conversation.tts.voice_id,
  language_voice_ids: Object.fromEntries(Object.entries(localized).map(([language, settings]) => [language, settings.voiceId])),
  language_tts_models: Object.fromEntries(Object.entries(localized).map(([language, settings]) => [language, settings.modelId ?? conversation.tts.model_id])),
  bootstrap_llm: conversation.agent.prompt.llm,
  language_llms: Object.fromEntries(Object.keys(localized).map((language) => [language, conversation.language_presets[language].overrides.agent.prompt.llm])),
  daily_access_tool_ids: DAILY_ACCESS_TOOL_IDS,
  tts_model: conversation.tts.model_id,
  stability: conversation.tts.stability,
  similarity_boost: conversation.tts.similarity_boost,
  speed: conversation.tts.speed,
  expressive_mode: conversation.tts.expressive_mode,
  optimize_streaming_latency: conversation.tts.optimize_streaming_latency,
  turn_eagerness: conversation.turn.turn_eagerness,
  turn_timeout: conversation.turn.turn_timeout,
  soft_timeout_seconds: conversation.turn.soft_timeout_config.timeout_seconds,
  end_call_pre_tool_speech: builtIns.end_call?.pre_tool_speech,
}, null, 2));
