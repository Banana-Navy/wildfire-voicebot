import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { WebSocketConnection } from '../node_modules/@elevenlabs/client/dist/utils/WebSocketConnection.js';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const agentId = 'agent_2201m07k477kepfsq9p5h8bh4x1g';
const root = resolve(import.meta.dirname, '..');
const voices = {
  base: 'Yv0oyZ3obP9foTH7emqG',
  fr: 'IpTJxgMFj1wbxpha4zxm',
  nl: 'Yv0oyZ3obP9foTH7emqG',
  de: 'FTNCalFNG5bRnkkaP5Ug',
};
const scenarios = {
  fr: {
    messages: ['Français'],
    expectedVoices: [voices.base, voices.fr],
    validate(responses) {
      return responses[1]?.text?.startsWith("Très bien, merci. Vous êtes sur la ligne d'information Feux en Milieu Naturel,")
        ? []
        : [{ type: 'wrong_french_presentation', value: responses[1]?.text ?? null }];
    },
  },
  nl: {
    messages: ['Nederlands'],
    expectedVoices: [voices.nl],
    validate(responses) {
      return responses[1]?.text?.startsWith('Prima. U bent verbonden met de informatielijn')
        ? []
        : [{ type: 'wrong_dutch_presentation', value: responses[1]?.text ?? null }];
    },
  },
  de: {
    messages: ['Deutsch'],
    expectedVoices: [voices.base, voices.de],
    validate(responses) {
      return responses[1]?.text?.startsWith('Sehr gern. Sie sind mit der Informationshotline')
        ? []
        : [{ type: 'wrong_german_presentation', value: responses[1]?.text ?? null }];
    },
  },
  'fr-urgence': {
    messages: ["Français. Je panique. Je vois des flammes et beaucoup de fumée juste devant moi. Pouvez-vous prévenir les pompiers ?"],
    expectedVoices: [voices.base, voices.fr],
    validate(responses) {
      const last = responses.at(-1)?.text ?? '';
      return last.startsWith('Raccrochez et appelez immédiatement le cent douze.')
        ? []
        : [{ type: 'missing_emergency_first_action', value: last }];
    },
  },
  'nl-direct': {
    messages: ['Ik wil informatie over rook bij een natuurbrand.', 'Wat moet ik doen als rook mijn woning bereikt?'],
    expectedVoices: [voices.nl],
    validate(responses) {
      const presentation = responses[1]?.text ?? '';
      return presentation.startsWith('Prima. U bent verbonden met de informatielijn')
        ? []
        : [{ type: 'language_was_reconfirmed_or_wrong_preset', value: presentation }];
    },
  },
  'fr-switch-de': {
    messages: ['Français', "Je voudrais des informations.", 'Pouvons-nous continuer en allemand ?', 'Wie verhindere ich einen Waldbrand bei einer Wanderung?'],
    expectedVoices: [voices.base, voices.fr, voices.de],
    validate(responses) {
      const afterSwitch = responses[3]?.text ?? '';
      const final = responses.at(-1)?.text ?? '';
      const issues = [];
      if (/Informationshotline|Dieses Gespräch wird aufgezeichnet/u.test(afterSwitch)) {
        issues.push({ type: 'presentation_replayed_after_switch', value: afterSwitch });
      }
      if (!/[äöüß]|Feuer|Wald|Deutsch|Information/u.test(`${afterSwitch} ${final}`)) {
        issues.push({ type: 'german_not_used_after_switch', value: `${afterSwitch} ${final}` });
      }
      return issues;
    },
  },
};

const fillerPattern = /\b(?:euh|hum+|hmm+|uh+|um+|äh+|ähm+|ehm+)\b/giu;

function fluencyIssues(responses) {
  const issues = [];
  for (const response of responses) {
    const text = response.text.normalize('NFKC').replace(/\s+/g, ' ').trim();
    const words = text.toLocaleLowerCase().match(/[\p{L}\p{N}’'-]+/gu) ?? [];
    for (let index = 1; index < words.length; index += 1) {
      if (words[index].length > 1 && words[index] === words[index - 1]) {
        issues.push({ event_id: response.event_id, type: 'adjacent_word_repeat', value: words[index] });
      }
    }
    const sentences = text
      .split(/[.!?]+/u)
      .map((sentence) => sentence.trim().toLocaleLowerCase())
      .filter((sentence) => sentence.length >= 12);
    const seenSentences = new Set();
    for (const sentence of sentences) {
      if (seenSentences.has(sentence)) {
        issues.push({ event_id: response.event_id, type: 'repeated_sentence', value: sentence });
      }
      seenSentences.add(sentence);
    }
    for (const match of text.matchAll(fillerPattern)) {
      issues.push({ event_id: response.event_id, type: 'filler', value: match[0] });
    }
  }
  return issues;
}

async function signedUrl() {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { 'xi-api-key': apiKey } },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`URL signée impossible (${response.status}): ${JSON.stringify(body)}`);
  return body.signed_url;
}

async function conversationDetails(conversationId) {
  let lastError;
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      { headers: { 'xi-api-key': apiKey } },
    );
    if (response.ok) {
      const body = await response.json();
      const ttsUsage = body.metadata?.charging?.tts_usage;
      if (body.status === 'done' && ttsUsage?.per_voice_usage?.length > 0) return body;
      lastError = new Error(`Conversation serveur encore en traitement (statut ${body.status}).`);
    } else {
      const body = await response.text();
      lastError = new Error(`Conversation serveur indisponible (${response.status}): ${body}`);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1250));
  }
  throw lastError;
}

async function run(scenarioName, scenario) {
  const directory = resolve(root, 'artifacts/audio/live-v2.2-goal', scenarioName);
  await mkdir(directory, { recursive: true });
  const connection = await WebSocketConnection.create({ signedUrl: await signedUrl(), connectionType: 'websocket' });
  const events = [];
  const responses = [];
  const responseIndexByEvent = new Map();
  const audioByEvent = new Map();
  let sentMessages = 0;
  let closeTimer;

  const finished = new Promise((resolveFinished, reject) => {
    const timeout = setTimeout(() => {
      const recentTypes = events.slice(-20).map(({ event }) => event.type);
      reject(new Error(
        `${scenarioName}: délai de validation dépassé; `
        + `${responses.length}/${scenario.messages.length + 1} réponses; `
        + `${sentMessages}/${scenario.messages.length} messages envoyés; `
        + `événements récents=${recentTypes.join(',')}`,
      ));
    }, 180000);
    connection.onDisconnect((details) => {
      if (responses.length >= scenario.messages.length + 1) return;
      clearTimeout(timeout);
      reject(new Error(`${scenarioName}: déconnexion prématurée ${JSON.stringify(details)}`));
    });
    connection.onMessage((event) => {
      events.push({ at: Date.now(), event });
      if (event.type === 'ping') {
        connection.sendMessage({ type: 'pong', event_id: event.ping_event.event_id });
        return;
      }
      if (event.type === 'audio' && event.audio_event.audio_base_64) {
        const id = event.audio_event.event_id;
        const chunks = audioByEvent.get(id) ?? [];
        chunks.push(Buffer.from(event.audio_event.audio_base_64, 'base64'));
        audioByEvent.set(id, chunks);
        return;
      }
      if (event.type !== 'agent_response') return;
      const response = event.agent_response_event;
      const currentIndex = responseIndexByEvent.get(response.event_id);
      if (currentIndex === undefined) {
        responseIndexByEvent.set(response.event_id, responses.length);
        responses.push({ event_id: response.event_id, text: response.agent_response });
        if (sentMessages < scenario.messages.length) {
          const message = scenario.messages[sentMessages];
          sentMessages += 1;
          const audioBytes = (audioByEvent.get(response.event_id) ?? [])
            .reduce((total, chunk) => total + chunk.length, 0);
          const playbackDelayMs = Math.max(1800, Math.ceil(audioBytes / 8) + 500);
          setTimeout(() => connection.sendMessage({ type: 'user_message', text: message }), playbackDelayMs);
        } else {
          clearTimeout(closeTimer);
          closeTimer = setTimeout(() => {
            clearTimeout(timeout);
            connection.close();
            resolveFinished();
          }, 2500);
        }
      } else {
        const previous = responses[currentIndex].text;
        responses[currentIndex].text = response.agent_response.startsWith(previous)
          ? response.agent_response
          : `${previous} ${response.agent_response}`.trim();
      }
    });
  });

  try {
    await finished;
  } catch (error) {
    connection.close();
    await writeFile(resolve(directory, 'failed-session.json'), `${JSON.stringify({
      scenario: scenarioName,
      messages: scenario.messages,
      sent_messages: sentMessages,
      responses,
      events,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2)}\n`);
    throw error;
  }
  const serverConversation = await conversationDetails(connection.conversationId);
  for (const [eventId, chunks] of audioByEvent) {
    await writeFile(resolve(directory, `event-${eventId}.ulaw`), Buffer.concat(chunks));
  }
  const session = {
    conversation_id: connection.conversationId,
    scenario: scenarioName,
    input_format: connection.inputFormat,
    output_format: connection.outputFormat,
    messages: scenario.messages,
    responses,
    events,
    server: {
      status: serverConversation.status,
      transcript: serverConversation.transcript,
      analysis: serverConversation.analysis,
      metadata: serverConversation.metadata,
    },
  };
  await writeFile(resolve(directory, 'session.json'), `${JSON.stringify(session, null, 2)}\n`);
  const usedVoices = serverConversation.metadata?.charging?.tts_usage?.per_voice_usage
    ?.map(({ voice_id: voiceId }) => voiceId) ?? [];
  const missingVoices = scenario.expectedVoices.filter((voiceId) => !usedVoices.includes(voiceId));
  const languageDetection = serverConversation.metadata?.features_usage?.language_detection;
  const issues = fluencyIssues(responses);
  issues.push(...(scenario.validate?.(responses) ?? []));
  if (languageDetection?.used !== true) {
    issues.push({ type: 'language_detection_not_used', value: languageDetection ?? null });
  }
  for (const voiceId of missingVoices) {
    issues.push({ type: 'expected_voice_not_used', value: voiceId });
  }
  const quality = {
    language_detection_used: languageDetection?.used === true,
    expected_voice_ids: scenario.expectedVoices,
    used_voice_ids: usedVoices,
    fluency_issues: issues,
    passed: issues.length === 0,
  };
  return { conversation_id: connection.conversationId, scenario: scenarioName, responses, audio_events: audioByEvent.size, quality };
}

const results = [];
const requestedScenario = process.argv[2];
if (requestedScenario && !scenarios[requestedScenario]) {
  throw new Error(`Scénario inconnu : ${requestedScenario}. Utilisez ${Object.keys(scenarios).join(', ')}.`);
}
const selectedScenarios = requestedScenario
  ? [[requestedScenario, scenarios[requestedScenario]]]
  : ['fr', 'nl', 'de'].map((name) => [name, scenarios[name]]);
for (const [scenarioName, scenario] of selectedScenarios) {
  results.push(await run(scenarioName, scenario));
}
console.log(JSON.stringify({ results }, null, 2));
if (results.some((result) => !result.quality.passed)) process.exitCode = 1;
