import {
  DAILY_ACCESS_TOOL_IDS,
  DAILY_ACCESS_TOOL_NAMES,
} from './lib/elevenlabs-access-tools.mjs';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');
if (!process.argv.includes('--confirm')) {
  throw new Error('Ajoutez --confirm pour renommer les outils distants.');
}

const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };
const expectedNames = new Map([
  [DAILY_ACCESS_TOOL_IDS.Incendie_resolve_official_place, DAILY_ACCESS_TOOL_NAMES.resolvePlace],
  [DAILY_ACCESS_TOOL_IDS.Incendie_get_daily_access_status, DAILY_ACCESS_TOOL_NAMES.getStatus],
]);
const promptNameReplacements = new Map([
  ['resolve_official_place', DAILY_ACCESS_TOOL_NAMES.resolvePlace],
  ['get_daily_access_status', DAILY_ACCESS_TOOL_NAMES.getStatus],
]);

const stableLinkState = (tool) => ({
  id: tool.id,
  type: tool.tool_config?.type,
  url: tool.tool_config?.api_schema?.url,
  method: tool.tool_config?.api_schema?.method,
  path_params_schema: tool.tool_config?.api_schema?.path_params_schema,
  query_params_schema: tool.tool_config?.api_schema?.query_params_schema,
  request_body_schema: tool.tool_config?.api_schema?.request_body_schema,
});

const results = [];
for (const [toolId, expectedName] of expectedNames) {
  const getResponse = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, { headers });
  const current = await getResponse.json();
  if (!getResponse.ok) {
    throw new Error(`Lecture de l'outil ${toolId} impossible (${getResponse.status}): ${JSON.stringify(current)}`);
  }

  const beforeLinks = stableLinkState(current);
  let updated = current;
  if (current.tool_config?.name !== expectedName) {
    const patchResponse = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        tool_config: { ...current.tool_config, name: expectedName },
        response_mocks: current.response_mocks ?? null,
      }),
    });
    updated = await patchResponse.json();
    if (!patchResponse.ok) {
      throw new Error(`Renommage de l'outil ${toolId} impossible (${patchResponse.status}): ${JSON.stringify(updated)}`);
    }
  }

  const verifyResponse = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, { headers });
  const verified = await verifyResponse.json();
  if (!verifyResponse.ok) {
    throw new Error(`Vérification de l'outil ${toolId} impossible (${verifyResponse.status}): ${JSON.stringify(verified)}`);
  }
  const afterLinks = stableLinkState(verified);
  if (verified.tool_config?.name !== expectedName) {
    throw new Error(`Nom distant inattendu pour ${toolId}: ${verified.tool_config?.name}`);
  }
  if (JSON.stringify(beforeLinks) !== JSON.stringify(afterLinks)) {
    throw new Error(`Le lien ou le schéma de ${toolId} a changé pendant le renommage.`);
  }
  results.push({
    tool_id: toolId,
    previous_name: current.tool_config?.name,
    current_name: verified.tool_config?.name,
    link_unchanged: true,
    url: verified.tool_config?.api_schema?.url,
  });
}

const replaceLegacyNames = (value) => {
  let updated = value;
  let replacements = 0;
  for (const [legacyName, currentName] of promptNameReplacements) {
    const pattern = new RegExp(`(?<!Incendie_)${legacyName}`, 'gu');
    const matches = updated.match(pattern) ?? [];
    replacements += matches.length;
    updated = updated.replace(pattern, currentName);
  }
  return { updated, replacements };
};

const listResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents?page_size=100', { headers });
const list = await listResponse.json();
if (!listResponse.ok) {
  throw new Error(`Inventaire des agents impossible (${listResponse.status}): ${JSON.stringify(list)}`);
}

const linkedAgentResults = [];
const accessToolIds = new Set(expectedNames.keys());
const agentDetails = await Promise.all((list.agents ?? []).map(async (summary) => {
  const getResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${summary.agent_id}`, { headers });
  const agent = await getResponse.json();
  if (!getResponse.ok) {
    throw new Error(`Lecture de l'agent ${summary.agent_id} impossible (${getResponse.status}): ${JSON.stringify(agent)}`);
  }
  return { summary, agent };
}));

for (const { summary, agent } of agentDetails) {
  const prompt = agent.conversation_config?.agent?.prompt;
  const attachedIds = (prompt?.tool_ids ?? []).filter((toolId) => accessToolIds.has(toolId));
  if (attachedIds.length === 0) continue;

  const conversation = structuredClone(agent.conversation_config);
  let replacements = 0;
  const basePrompt = conversation.agent?.prompt?.prompt;
  if (typeof basePrompt === 'string') {
    const migrated = replaceLegacyNames(basePrompt);
    conversation.agent.prompt.prompt = migrated.updated;
    replacements += migrated.replacements;
  }
  for (const preset of Object.values(conversation.language_presets ?? {})) {
    const presetPrompt = preset?.overrides?.agent?.prompt?.prompt;
    if (typeof presetPrompt !== 'string') continue;
    const migrated = replaceLegacyNames(presetPrompt);
    preset.overrides.agent.prompt.prompt = migrated.updated;
    replacements += migrated.replacements;
  }
  if ((conversation.agent?.prompt?.tool_ids ?? []).length > 0) {
    delete conversation.agent.prompt.tools;
  }

  if (replacements > 0) {
    const patchResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${summary.agent_id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        name: agent.name,
        conversation_config: conversation,
        platform_settings: agent.platform_settings,
      }),
    });
    const updated = await patchResponse.json();
    if (!patchResponse.ok) {
      throw new Error(`Migration du prompt ${summary.agent_id} impossible (${patchResponse.status}): ${JSON.stringify(updated)}`);
    }
  }

  const verifyResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${summary.agent_id}`, { headers });
  const verified = await verifyResponse.json();
  if (!verifyResponse.ok) {
    throw new Error(`Vérification de l'agent ${summary.agent_id} impossible (${verifyResponse.status}): ${JSON.stringify(verified)}`);
  }
  const verifiedPrompts = [
    verified.conversation_config?.agent?.prompt?.prompt,
    ...Object.values(verified.conversation_config?.language_presets ?? {})
      .map((preset) => preset?.overrides?.agent?.prompt?.prompt),
  ].filter((value) => typeof value === 'string');
  const remainingLegacyReferences = verifiedPrompts.reduce((total, value) => {
    return total + [...promptNameReplacements.keys()]
      .reduce((count, legacyName) => count + (value.match(new RegExp(`(?<!Incendie_)${legacyName}`, 'gu')) ?? []).length, 0);
  }, 0);
  if (remainingLegacyReferences > 0) {
    throw new Error(`Références historiques restantes dans ${summary.agent_id}: ${remainingLegacyReferences}`);
  }
  linkedAgentResults.push({
    agent_id: summary.agent_id,
    agent_name: agent.name,
    attached_tool_ids: attachedIds,
    prompt_replacements: replacements,
    remaining_legacy_references: 0,
  });
}

console.log(JSON.stringify({
  renamed_tools: results,
  linked_agents_checked: linkedAgentResults,
}, null, 2));
