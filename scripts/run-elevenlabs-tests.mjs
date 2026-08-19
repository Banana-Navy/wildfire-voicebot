const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const agentId = 'agent_2201m07k477kepfsq9p5h8bh4x1g';
const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };
const baseUrl = 'https://api.elevenlabs.io/v1/convai';
const filters = process.argv.slice(2).filter((value) => !value.startsWith('--'));

async function request(url, options = {}) {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { headers, ...options });
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise((resolveWait) => setTimeout(resolveWait, attempt * 1_500));
      continue;
    }
    const body = await response.json();
    if (response.ok) return body;
    const retryableStatus = response.status === 429 || response.status >= 500;
    if (!retryableStatus || attempt === maxAttempts) {
      throw new Error(`${options.method ?? 'GET'} ${url} (${response.status}): ${JSON.stringify(body)}`);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, attempt * 1_500));
  }
  throw new Error(`${options.method ?? 'GET'} ${url}: nombre maximal de tentatives dépassé.`);
}

const catalogue = await request(`${baseUrl}/agent-testing?page_size=100`);
const projectTests = (catalogue.tests ?? [])
  .filter(({ name }) => name?.startsWith('Feux '))
  .filter(({ name }) => filters.length === 0
    || filters.some((filter) => name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())))
  .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

if (projectTests.length === 0) {
  throw new Error(`Aucun test Feux ne correspond à : ${filters.join(', ') || 'tous'}.`);
}

const invocation = await request(`${baseUrl}/agents/${agentId}/run-tests`, {
  method: 'POST',
  body: JSON.stringify({
    tests: projectTests.map(({ id }) => ({ test_id: id })),
    repeat_count: 1,
  }),
});

let result = invocation;
let previousProgress = '';
const deadline = Date.now() + 15 * 60 * 1000;
while (result.test_runs?.some(({ status }) => status === 'pending')) {
  const counts = Object.groupBy(result.test_runs, ({ status }) => status);
  const progress = ['pending', 'passed', 'failed']
    .map((status) => `${status}:${counts[status]?.length ?? 0}`)
    .join(' ');
  if (progress !== previousProgress) {
    console.error(`Tests ${result.id} — ${progress}`);
    previousProgress = progress;
  }
  if (Date.now() >= deadline) throw new Error(`Délai dépassé pour l'invocation ${result.id}.`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 4_000));
  result = await request(`${baseUrl}/test-invocations/${result.id}`);
}

const summaries = (result.test_runs ?? []).map((run) => ({
  test_id: run.test_id,
  test_invocation_id: run.test_invocation_id,
  conversation_id: run.metadata?.conversation_id ?? null,
  name: run.test_name,
  status: run.status,
  condition_result: run.condition_result,
  agent_responses: run.status === 'failed' ? run.agent_responses : undefined,
}));
const failed = summaries.filter(({ status }) => status !== 'passed');

console.log(JSON.stringify({
  suite_invocation_id: result.id,
  total: summaries.length,
  passed: summaries.length - failed.length,
  failed: failed.length,
  results: failed.length > 0 ? summaries : summaries.map(({ agent_responses, ...summary }) => summary),
}, null, 2));

if (failed.length > 0) process.exitCode = 1;
