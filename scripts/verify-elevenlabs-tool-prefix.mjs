import {
  DAILY_ACCESS_TOOL_IDS,
  dailyAccessTools,
} from './lib/elevenlabs-access-tools.mjs';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const agentId = process.env.ELEVENLABS_AGENT_ID
  ?? 'agent_6301m0hrk7vbeyeadt55q1rc1xzv';
const headers = { 'xi-api-key': apiKey };
const expectedSystemTools = {
  end_call: { name: 'end_call', systemToolType: 'end_call', descriptionPrefix: 'INCENDIE —' },
  language_detection: { name: 'language_detection', systemToolType: 'language_detection', descriptionPrefix: 'INCENDIE —' },
};
const desiredAccessTools = new Map(dailyAccessTools().map((tool) => [tool.name, tool]));

const agentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, { headers });
const agent = await agentResponse.json();
if (!agentResponse.ok) {
  throw new Error(`Lecture agent impossible (${agentResponse.status}): ${JSON.stringify(agent)}`);
}

const prompt = agent.conversation_config?.agent?.prompt ?? {};
const systemResults = [];
for (const [key, expected] of Object.entries(expectedSystemTools)) {
  const tool = prompt.built_in_tools?.[key];
  if (!tool) throw new Error(`Outil système absent: ${key}`);
  if (tool.name !== expected.name) {
    throw new Error(`Nom inattendu pour ${key}: ${tool.name}`);
  }
  if (tool.params?.system_tool_type !== expected.systemToolType) {
    throw new Error(`Type système modifié pour ${key}: ${tool.params?.system_tool_type}`);
  }
  if (!tool.description?.startsWith(expected.descriptionPrefix)) {
    throw new Error(`Description Incendie absente pour ${key}.`);
  }
  systemResults.push({
    key,
    name: tool.name,
    system_tool_type: tool.params.system_tool_type,
    description_identified: true,
  });
}

const attachedIds = prompt.tool_ids ?? [];
const disabledAccessIds = new Set(Object.values(DAILY_ACCESS_TOOL_IDS));
const attachedDisabledIds = attachedIds.filter((toolId) => disabledAccessIds.has(toolId));
if (attachedDisabledIds.length > 0) {
  throw new Error(`Outils d'accès réattachés par erreur: ${attachedDisabledIds.join(', ')}`);
}

const accessResults = [];
for (const [name, toolId] of Object.entries(DAILY_ACCESS_TOOL_IDS)) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, { headers });
  const remote = await response.json();
  if (!response.ok) {
    throw new Error(`Lecture de l'outil ${toolId} impossible (${response.status}): ${JSON.stringify(remote)}`);
  }
  const expected = desiredAccessTools.get(name);
  if (!expected) throw new Error(`Configuration locale absente pour ${name}`);
  if (remote.tool_config?.name !== name) {
    throw new Error(`Nom distant inattendu pour ${toolId}: ${remote.tool_config?.name}`);
  }
  if (remote.tool_config?.api_schema?.url !== expected.api_schema.url) {
    throw new Error(`URL modifiée pour ${name}`);
  }
  if (remote.tool_config?.api_schema?.method !== expected.api_schema.method) {
    throw new Error(`Méthode modifiée pour ${name}`);
  }
  accessResults.push({
    tool_id: toolId,
    name,
    attached: attachedIds.includes(toolId),
    url: remote.tool_config.api_schema.url,
    method: remote.tool_config.api_schema.method,
  });
}

if (!accessResults.every(({ name }) => name.startsWith('Incendie_'))) {
  throw new Error('Au moins un outil personnalisable du voicebot ne porte pas le préfixe Incendie_.');
}

console.log(JSON.stringify({
  agent_id: agentId,
  agent_name: agent.name,
  system_tools: systemResults,
  system_tool_names_reserved_by_elevenlabs: true,
  access_tools: accessResults,
  disabled_access_tools_attached: false,
  links_unchanged: true,
}, null, 2));
