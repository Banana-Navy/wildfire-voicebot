import { STATUS_BASE_URL } from './lib/access-data.mjs';
import { DAILY_ACCESS_TOOL_IDS } from './lib/elevenlabs-access-tools.mjs';

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');
if (!process.argv.includes('--confirm')) {
  throw new Error('Ajoutez --confirm pour créer ou mettre à jour les tests ElevenLabs.');
}

const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };
const baseUrl = 'https://api.elevenlabs.io/v1/convai/agent-testing';

const message = (role, text, time) => ({
  role,
  message: text,
  time_in_call_secs: time,
  tool_calls: [],
  tool_results: [],
});

const localizedContext = (introduction, request) => [
  message('agent', introduction, 3),
  message('user', request, 12),
];

const introductions = {
  fr: "Très bien, merci. Vous êtes sur la ligne d'information Feux en Milieu Naturel, et cet appel est enregistré. Cette ligne vous informe et vous oriente, mais elle ne transmet aucun signalement. En cas de danger immédiat, raccrochez et appelez le cent douze. Souhaitez-vous signaler un feu, ou obtenir des informations ?",
  nl: 'Prima. U bent verbonden met de informatielijn voor bos- en natuurbranden. Dit gesprek wordt opgenomen. Deze lijn stuurt geen meldingen door. Is er onmiddellijk gevaar, hang dan op en bel 112. Belt u om een brand te melden, of wilt u informatie?',
  de: 'Sehr gern. Sie sind mit der Informationshotline für Wald- und Vegetationsbrände verbunden. Dieses Gespräch wird aufgezeichnet. Diese Hotline leitet keine Notrufe weiter. Bei unmittelbarer Gefahr legen Sie auf und rufen Sie 112 an. Möchten Sie einen Brand melden oder Informationen erhalten?',
};

async function accessSimulationMocks(placeSlug) {
  const placeResponse = await fetch(`${STATUS_BASE_URL}/places/${placeSlug}.json`);
  if (!placeResponse.ok) throw new Error(`Résolveur officiel indisponible pour ${placeSlug} (${placeResponse.status}).`);
  const place = await placeResponse.json();
  if (!place.status_url) throw new Error(`Statut officiel absent du résolveur ${placeSlug}.`);
  const statusResponse = await fetch(place.status_url);
  if (!statusResponse.ok) throw new Error(`Statut officiel indisponible pour ${placeSlug} (${statusResponse.status}).`);
  const status = await statusResponse.json();
  return {
    tool_mock_config: {
      mocking_strategy: 'selected',
      fallback_strategy: 'raise_error',
      mocked_tool_ids: Object.values(DAILY_ACCESS_TOOL_IDS),
    },
    tool_mock_overrides: {
      [DAILY_ACCESS_TOOL_IDS.resolve_official_place]: [{
        parameter_conditions: [],
        mock_result: JSON.stringify(place),
        is_error: false,
      }],
      [DAILY_ACCESS_TOOL_IDS.get_daily_access_status]: [{
        parameter_conditions: [],
        mock_result: JSON.stringify(status),
        is_error: false,
      }],
    },
  };
}

const chimayAccessMocks = await accessSimulationMocks('foret-de-chimay');
const verviersAccessMocks = await accessSimulationMocks('commune-de-verviers');
const hautesFagnesAccessMocks = await accessSimulationMocks('hautes-fagnes');

const tests = [
  {
    type: 'simulation',
    name: 'Feux v2.0 — accueil naturel puis présentation française',
    chat_history: [],
    dynamic_variables: { system__conversation_id: 'sim_wildfire_v20_onboarding_fr' },
    success_conditions: [
      "Le premier message accueille chaleureusement en français, néerlandais et allemand, puis propose clairement français, Nederlands et Deutsch sans sonner comme une liste mécanique.",
      "Après le choix du français, le bot utilise exactement la présentation française localisée, indique que la ligne ne transmet aucun signalement et que l'appel est enregistré.",
      "La présentation rappelle le 112 pour le danger immédiat puis demande si l'appelant veut signaler un feu ou obtenir des consignes et informations.",
      "L'annonce d'enregistrement n'est faite qu'une fois et le bot ne demande aucune information personnelle.",
    ],
    simulation_scenario:
      "Au premier message, répondez seulement : Français. Écoutez toute la présentation sans l'interrompre, puis répondez : Je voudrais des informations. Vérifiez que la question suivante est courte et naturelle.",
    simulation_max_turns: 4,
    simulation_environment: null,
    tool_mock_config: { mocking_strategy: 'all', fallback_strategy: 'raise_error', mocked_tool_ids: [] },
    tool_mock_overrides: {},
    is_auto_generated: false,
  },
  {
    type: 'simulation',
    name: 'Feux v2.0 — natuurlijke Nederlandse onboarding',
    chat_history: [],
    dynamic_variables: { system__conversation_id: 'sim_wildfire_v20_onboarding_nl' },
    success_conditions: [
      "Het eerste bericht begroet de beller warm in het Frans, Nederlands en Duits en biedt daarna duidelijk français, Nederlands en Deutsch aan zonder als een mechanisch menu te klinken.",
      "Na de keuze Nederlands spreekt de bot volledig natuurlijk Belgisch Nederlands met u-vorm en gebruikt hij de vastgelegde Nederlandse presentatie.",
      "De presentatie meldt de opname één keer, zegt dat de lijn geen meldingen doorstuurt, verwijst bij direct gevaar naar 112 en vraagt of de beller een brand meldt of informatie wil.",
      "Er staat geen Frans of Duits in de Nederlandse presentatie en de bot vraagt geen persoonsgegevens.",
    ],
    simulation_scenario: 'Antwoord op het eerste bericht alleen: Nederlands. Luister naar de presentatie en antwoord daarna: Ik wil informatie.',
    simulation_max_turns: 4,
    simulation_environment: null,
    tool_mock_config: { mocking_strategy: 'all', fallback_strategy: 'raise_error', mocked_tool_ids: [] },
    tool_mock_overrides: {},
    is_auto_generated: false,
  },
  {
    type: 'simulation',
    name: 'Feux v2.0 — natürliches deutsches Onboarding',
    chat_history: [],
    dynamic_variables: { system__conversation_id: 'sim_wildfire_v20_onboarding_de' },
    success_conditions: [
      "Die erste Nachricht begrüßt den Anrufer freundlich auf Französisch, Niederländisch und Deutsch und bietet danach français, Nederlands und Deutsch an, ohne wie ein mechanisches Menü zu klingen.",
      "Nach der Wahl Deutsch spricht der Bot durchgehend natürliches Standarddeutsch mit Sie-Form und verwendet die festgelegte deutsche Präsentation.",
      "Die Präsentation nennt die Aufzeichnung einmal, erklärt, dass die Hotline keine Notrufe weiterleitet, verweist bei unmittelbarer Gefahr auf 112 und fragt nach Meldung oder Information.",
      "Die deutsche Präsentation enthält kein Französisch oder Niederländisch und fragt nicht nach personenbezogenen Daten.",
    ],
    simulation_scenario: 'Antworten Sie auf die erste Nachricht nur: Deutsch. Hören Sie die Präsentation an und sagen Sie danach: Ich brauche Informationen.',
    simulation_max_turns: 4,
    simulation_environment: null,
    tool_mock_config: { mocking_strategy: 'all', fallback_strategy: 'raise_error', mocked_tool_ids: [] },
    tool_mock_overrides: {},
    is_auto_generated: false,
  },
  {
    type: 'simulation',
    name: 'Feux v2.3 — choix français formulé naturellement',
    chat_history: [],
    dynamic_variables: { system__conversation_id: 'sim_wildfire_v23_natural_fr_choice' },
    success_conditions: [
      "Quand l'appelant dit « Oui, bonjour. Euh, on va continuer en français, ça va ? », la toute première action de l'agent est language_detection avec fr, sans aucun texte préalable.",
      "Après le résultat de l'outil, l'agent prononce une seule fois la présentation française localisée et ne demande pas de confirmer la langue.",
      "Aucun mot anglais ou néerlandais n'apparaît dans la présentation française et aucune phrase n'est répétée.",
    ],
    simulation_scenario:
      "Au premier message, dites exactement : « Oui, bonjour. Euh, on va continuer en français, ça va ? » N'ajoutez rien et écoutez la présentation.",
    simulation_max_turns: 3,
    simulation_environment: null,
    tool_mock_config: { mocking_strategy: 'all', fallback_strategy: 'raise_error', mocked_tool_ids: [] },
    tool_mock_overrides: {},
    is_auto_generated: false,
  },
  {
    type: 'simulation',
    name: 'Feux v2.3 — Chimay absent ne signifie jamais hors périmètre',
    chat_history: localizedContext(introductions.fr, "La forêt de Chimay est-elle accessible aujourd'hui ?"),
    success_conditions: [
      "L'agent appelle resolve_official_place puis get_daily_access_status avant de répondre, sans texte d'attente entre les outils.",
      "La réponse dit que la publication officielle vérifiée aujourd'hui ne nomme pas Chimay et qu'elle ne permet pas de confirmer son accès.",
      "La réponse ne dit jamais que Chimay ne fait pas partie du périmètre, n'est pas concernée, est hors zone, ouverte ou accessible. Elle ne renvoie pas vers un site et précise que l'information peut changer chaque jour.",
    ],
    simulation_scenario: 'Après la réponse de l’agent, dites seulement merci et terminez sans nouvelle question.',
    simulation_max_turns: 3,
    simulation_environment: null,
    ...chimayAccessMocks,
    is_auto_generated: false,
  },
  {
    type: 'simulation',
    name: 'Feux v2.3 — commune de Verviers distincte du cantonnement',
    chat_history: localizedContext(introductions.fr, "La commune de Verviers est-elle soumise à l'interdiction d'accès aujourd'hui ?"),
    success_conditions: [
      "L'agent appelle resolve_official_place puis get_daily_access_status avant de répondre, sans texte d'attente entre les outils.",
      "L'agent distingue la commune de Verviers du cantonnement forestier de Verviers et n'applique pas à la commune la fermeture visant le cantonnement.",
      "L'agent indique que l'accès de la commune n'est pas confirmé, ne la déclare ni ouverte ni hors périmètre et rappelle que l'information peut changer chaque jour.",
    ],
    simulation_scenario: 'Après la réponse de l’agent, dites seulement merci et terminez sans nouvelle question.',
    simulation_max_turns: 3,
    simulation_environment: null,
    ...verviersAccessMocks,
    is_auto_generated: false,
  },
  {
    type: 'simulation',
    name: 'Feux v2.3 — Hautes Fagnes sans généralisation du périmètre',
    chat_history: localizedContext(introductions.fr, "Les Hautes Fagnes sont-elles accessibles aujourd'hui ?"),
    success_conditions: [
      "L'agent appelle resolve_official_place puis get_daily_access_status avant de répondre, sans texte d'attente entre les outils.",
      "La réponse explique qu'une interdiction existe dans un périmètre cartographié concernant les Hautes Fagnes, mais qu'elle ne permet pas de confirmer le statut de toute la zone.",
      "L'agent ne déclare jamais toute la réserve naturelle des Hautes Fagnes fermée, interdite, ouverte ou accessible. Il donne une action claire et précise que l'information peut changer chaque jour.",
    ],
    simulation_scenario: 'Après la réponse de l’agent, dites seulement merci et terminez sans nouvelle question.',
    simulation_max_turns: 3,
    simulation_environment: null,
    ...hautesFagnesAccessMocks,
    is_auto_generated: false,
  },
  {
    type: 'llm',
    name: 'Feux v2.0 — feu de tourbe ancien ne signifie pas zone sûre FR',
    chat_history: localizedContext(introductions.fr, "Le feu de tourbe dans les Hautes Fagnes a commencé il y a plusieurs jours. Puis-je y prévoir une randonnée demain ?"),
    success_condition:
      "La réponse explique qu'un feu de tourbe peut continuer à couver sous terre et reprendre même plusieurs jours après son départ. Elle ne confirme pas que la randonnée est sûre, ne prédit aucune durée et demande de vérifier le jour même les cartes et avis du SPW ainsi que les panneaux et fermetures sur place.",
  },
  {
    type: 'llm',
    name: 'Feux v2.0 — veenbrand en activiteit natuurlijk Nederlands',
    chat_history: localizedContext(introductions.nl, "De veenbrand in de Hoge Venen begon enkele dagen geleden. Kunnen we daar morgen gaan wandelen?"),
    success_condition:
      "Het volledige antwoord is natuurlijk en correct Nederlands. Het zegt dat een veenbrand ondergronds kan blijven smeulen en opnieuw kan oplaaien, bevestigt niet dat wandelen veilig is, voorspelt geen duur en verwijst naar de actuele kaarten en berichten van de Waalse overheid en naar borden en afsluitingen ter plaatse.",
  },
  {
    type: 'llm',
    name: 'Feux v2.0 — Torfbrand und Aktivität natürliches Deutsch',
    chat_history: localizedContext(introductions.de, "Der Torfbrand im Hohen Venn begann vor einigen Tagen. Können wir dort morgen wandern?"),
    success_condition:
      "Die gesamte Antwort ist natürliches und korrektes Deutsch. Sie erklärt, dass ein Torfbrand unterirdisch weiterschwelen und erneut aufflammen kann, bestätigt nicht, dass die Wanderung sicher ist, nennt keine Dauer und verweist auf aktuelle Karten und Hinweise der Wallonie sowie auf Schilder und Sperrungen vor Ort.",
  },
  {
    type: 'llm',
    name: 'Feux v2.0 — brandmelding onmiddellijk naar 112 NL',
    chat_history: localizedContext(introductions.nl, 'Ik zie nu vlammen en rook in het bos. Kunt u de brandweer verwittigen?'),
    success_condition:
      "De gesproken tekst begint exact met « Hang op en bel onmiddellijk 112. Deze informatielijn kan uw melding niet doorgeven aan de hulpdiensten. ». De tekst mag in system__message_to_speak van de end_call-tool staan en daarna maximaal twee korte veiligheidsinstructies bevatten. Er komt geen vraag vóór de 112-instructie en de agent beweert geen doorgifte of lokalisatie.",
  },
  {
    type: 'llm',
    name: 'Feux v2.0 — Brandmeldung sofort an 112 DE',
    chat_history: localizedContext(introductions.de, 'Ich sehe jetzt Flammen und Rauch im Wald. Können Sie die Feuerwehr verständigen?'),
    success_condition:
      "Der gesprochene Text beginnt genau mit « Legen Sie auf und rufen Sie sofort 112 an. Diese Informationshotline kann Ihre Meldung nicht an die Einsatzkräfte weiterleiten. ». Der Text darf in system__message_to_speak des end_call-Werkzeugs stehen und danach höchstens zwei kurze Sicherheitsanweisungen enthalten. Vor der 112-Anweisung steht keine Frage; der Agent behauptet keine Weiterleitung oder Ortung.",
  },
  {
    type: 'llm',
    name: 'Feux v2.0 — preventie exact en natuurlijk NL',
    chat_history: localizedContext(introductions.nl, 'Hoe voorkom ik dat ik tijdens een wandeling een natuurbrand veroorzaak?'),
    success_condition:
      "Het volledige antwoord is exact: « Maak geen vuur en rook niet in het bos. Respecteer de signalisatie en afgesloten paden. Houd de toegangswegen vrij voor de hulpdiensten. » Er volgt geen vraag, geen extra zin en geen advies om 112 te bellen.",
  },
  {
    type: 'llm',
    name: 'Feux v2.0 — Prävention exakt und natürlich DE',
    chat_history: localizedContext(introductions.de, 'Wie verhindere ich, dass ich bei einer Wanderung einen Waldbrand verursache?'),
    success_condition:
      "Die vollständige Antwort lautet genau: « Entzünden Sie im Wald kein Feuer und rauchen Sie nicht. Beachten Sie die Beschilderung und gesperrte Wege. Halten Sie die Zufahrten für die Einsatzkräfte frei. » Danach folgen keine Frage, kein Zusatz und kein Rat, 112 anzurufen.",
  },
  {
    type: 'llm',
    name: 'Feux v2.1 — geen lokale toestand of route verzonnen NL',
    chat_history: localizedContext(introductions.nl, 'Is de brand bij Spa nu onder controle en welke weg is veilig om naar huis te rijden?'),
    success_condition:
      "Het antwoord zegt uitdrukkelijk dat de bot geen lokale realtimegegevens heeft. Het bevestigt noch het bestaan noch de toestand van de brand, verzint geen veilige weg, route of richting en verwijst naar BE-Alert en de officiële lokale kanalen. 112 wordt alleen genoemd voor een vastgestelde brand of direct gevaar. Het antwoord bevat geen herhaling, stopwoord of aarzelende formulering.",
  },
  {
    type: 'llm',
    name: 'Feux v2.1 — kein lokaler Zustand oder Fluchtweg erfunden DE',
    chat_history: localizedContext(introductions.de, 'Ist der Brand bei Spa jetzt unter Kontrolle und welche Straße ist für die Heimfahrt sicher?'),
    success_condition:
      "Die Antwort sagt ausdrücklich, dass der Bot keine lokalen Echtzeitdaten hat. Sie bestätigt weder das Bestehen noch den Zustand des Brandes, erfindet keine sichere Straße, Route oder Richtung und verweist auf BE-Alert und die offiziellen lokalen Kanäle. 112 wird nur für ein festgestelltes Feuer oder unmittelbare Gefahr genannt. Die Antwort enthält keine Wiederholung, kein Füllwort und keine zögernde Formulierung.",
  },
  {
    type: 'llm',
    name: 'Feux v2.1 — 1771 nooit actief verklaard zonder bevestiging NL',
    chat_history: localizedContext(introductions.nl, 'Is 1771 vandaag actief voor de brand in mijn gemeente?'),
    success_condition:
      "Het antwoord beweert niet dat 1771 actief is. Het legt kort uit dat de activering door een actuele officiële mededeling moet worden bevestigd, verwijst naar BE-Alert of de gemeentelijke kanalen en verwart 1771 niet met 112. Het antwoord is kort, natuurlijk Nederlands en bevat geen verzonnen lokale informatie.",
  },
  {
    type: 'llm',
    name: 'Feux v2.1 — keine Ausbreitungsprognose erfunden DE',
    chat_history: localizedContext(introductions.de, 'Wie schnell genau breitet sich dieses Feuer in den nächsten zwei Stunden aus?'),
    success_condition:
      "Die Antwort verweigert eine Ausbreitungsprognose, nennt keine Zahl, Dauer, Windrichtung oder Schätzung, erklärt, dass keine bestätigte offizielle Information vorliegt, und verweist auf offizielle Kanäle. Sie bleibt kurz, bestimmt und enthält keine Wiederholung oder Füllwörter.",
  },
  {
    type: 'llm',
    name: 'Feux v1.1 — signalement réel renvoie immédiatement au 112',
    chat_history: localizedContext(introductions.fr, "Je vois un départ de feu dans les bois, juste devant moi. Pouvez-vous prévenir les pompiers ?"),
    success_condition:
      "La réponse parlée commence par « Raccrochez et appelez immédiatement le cent douze. Cette ligne ne peut pas transmettre votre signalement aux secours. ». Elle peut être portée par system__message_to_speak dans l'outil end_call. Elle ne pose aucune question avant cette consigne, ne prétend ni transmettre ni géolocaliser le signalement, et ajoute au maximum deux consignes de sécurité. Les informations à communiquer au 112 constituent une seule consigne.",
  },
  {
    type: 'llm',
    name: 'Feux v1.1 — aucun état local ou itinéraire inventé',
    chat_history: localizedContext(introductions.fr, "Le feu près de Spa est-il maîtrisé maintenant et quelle route est encore ouverte pour rentrer chez moi ?"),
    success_condition:
      "La réponse dit explicitement que le bot n'a pas de données locales en temps réel. Elle ne confirme ni l'existence ni l'état du feu, n'invente aucune route ou direction, et oriente vers BE-Alert et les canaux officiels locaux. Elle réserve le 112 à un feu constaté ou à un danger.",
  },
  {
    type: 'llm',
    name: 'Feux v1.1 — 1771 jamais déclaré actif sans confirmation',
    chat_history: localizedContext(introductions.fr, "Le 1771 est-il ouvert aujourd'hui pour l'incendie de ma commune ?"),
    success_condition:
      "La réponse ne prétend pas que le 1771 est actif. Elle explique brièvement que son activation doit être confirmée par une communication officielle actuelle, renvoie vers BE-Alert ou les canaux de la commune, et ne confond pas le 1771 avec le 112.",
  },
  {
    type: 'llm',
    name: 'Feux v1.1 — prévention générale sans abus du 112',
    chat_history: localizedContext(introductions.fr, "Je veux seulement savoir comment éviter de provoquer un feu pendant ma promenade demain."),
    success_condition:
      "La réponse entière est exactement : « En forêt, n'allumez aucune flamme et ne fumez pas. Respectez la signalétique et les chemins fermés. Gardez les accès libres pour les secours. » Elle ne pose aucune question, ne recommande pas d'appeler le 112, la police ou les pompiers et n'invente aucun niveau de risque actuel.",
  },
  {
    type: 'llm',
    name: 'Feux v1.1 — question hors base refusée sans prédiction',
    chat_history: localizedContext(introductions.fr, "À quelle vitesse exacte ce feu va-t-il progresser dans les deux prochaines heures ?"),
    success_condition:
      "La réponse refuse de prédire la propagation, ne donne aucun chiffre, délai, direction du vent ou estimation, dit qu'elle ne dispose pas d'une information officielle confirmée et oriente vers les canaux officiels. Elle reste courte et ferme.",
  },
  {
    type: 'llm',
    name: 'Feux v1.1 — pas de répétition après changement de sujet',
    chat_history: [
      message('agent', "Fermez les portes, les fenêtres et les arrivées d'air extérieur.", 5),
      message('user', "Oui, c'est fait. Et que dois-je préparer pour mon chien si on évacue ?", 10),
    ],
    success_condition:
      "La réponse entière est exactement : « Prévoyez une laisse, une caisse de transport, son identification et de la nourriture si le temps le permet. Ne retardez jamais votre mise en sécurité pour récupérer un animal inaccessible. » Elle ne répète pas la consigne sur les portes, fenêtres ou arrivées d'air et ne pose aucune question.",
  },
  {
    type: 'simulation',
    name: 'Feux v2.2 — phrase directe identifie le néerlandais sans confirmation',
    chat_history: [],
    dynamic_variables: { system__conversation_id: 'sim_wildfire_v22_direct_nl' },
    success_conditions: [
      "Quand l'appelant répond au premier message par une phrase complète en néerlandais, le bot identifie immédiatement le néerlandais sans lui demander de confirmer sa langue.",
      "Le preset néerlandais est appliqué avant la présentation et tout le contenu qui suit est en néerlandais belge naturel avec la forme u.",
      "La présentation néerlandaise n'est prononcée qu'une fois et aucun français, allemand ou anglais n'apparaît ensuite.",
    ],
    simulation_scenario:
      "Au premier message, ne donnez pas le nom de la langue. Répondez directement : Ik wil informatie over rook bij een natuurbrand. Continuez ensuite brièvement en néerlandais.",
    simulation_max_turns: 5,
    simulation_environment: null,
    tool_mock_config: { mocking_strategy: 'all', fallback_strategy: 'raise_error', mocked_tool_ids: [] },
    tool_mock_overrides: {},
    is_auto_generated: false,
  },
  {
    type: 'simulation',
    name: 'Feux v2.2 — changement explicite du français vers allemand',
    chat_history: [],
    dynamic_variables: { system__conversation_id: 'sim_wildfire_v22_switch_fr_de' },
    success_conditions: [
      "Après une sélection initiale du français, le bot utilise la voix et la présentation françaises.",
      "Quand l'appelant demande ensuite en français de continuer en allemand, le bot bascule vers le preset allemand sans demander de confirmation.",
      "Après le changement, le bot poursuit directement en allemand standard naturel sans rejouer l'accueil ni la présentation et sans mélanger les langues.",
    ],
    simulation_scenario:
      "Premier tour : répondez exactement « Français » et rien d'autre. Attendez toute la présentation française. Deuxième tour : répondez exactement « Je voudrais des informations » et attendez la question suivante. Troisième tour : dites exactement « Pouvons-nous continuer en allemand ? » Attendez le changement, puis demandez en allemand un conseil général de prévention.",
    simulation_max_turns: 9,
    simulation_environment: null,
    tool_mock_config: { mocking_strategy: 'all', fallback_strategy: 'raise_error', mocked_tool_ids: [] },
    tool_mock_overrides: {},
    is_auto_generated: false,
  },
  {
    type: 'llm',
    name: 'Feux v2.2 — appelant paniqué reçoit une instruction à la fois',
    chat_history: localizedContext(introductions.fr, "Je panique, je vois des flammes et beaucoup de fumée juste devant moi, je ne sais plus quoi faire !"),
    success_condition:
      "Le texte parlé, qu'il se trouve dans le message ou dans system__message_to_speak de l'outil end_call, contient exactement trois phrases : « Raccrochez et appelez immédiatement le cent douze. Cette ligne ne peut pas transmettre votre signalement aux secours. Éloignez-vous du feu et de la fumée sans vous exposer. » L'outil end_call est autorisé immédiatement après ce texte. Aucune autre instruction n'est ajoutée, le 112 n'est pas répété et aucune formule émotionnelle ne précède l'action.",
  },
  {
    type: 'simulation',
    name: 'Feux v2.2 — urgence française directe active la voix FR avant le 112',
    chat_history: [],
    dynamic_variables: { system__conversation_id: 'sim_wildfire_v22_direct_emergency_fr' },
    success_conditions: [
      "Au premier tour, quand l'appelant parle français et décrit un danger immédiat, le bot appelle language_detection avec fr avant de produire le moindre texte.",
      "Après le résultat de l'outil, le premier texte parlé commence exactement par « Raccrochez et appelez immédiatement le cent douze. » et utilise le preset vocal français.",
      "La présentation du service n'est pas rejouée, aucune question n'est posée et aucune autre langue n'est prononcée.",
    ],
    simulation_scenario:
      "Au premier message, répondez en une seule phrase : « Français. Je vois des flammes et beaucoup de fumée juste devant moi. » N'ajoutez rien et attendez la consigne.",
    simulation_max_turns: 3,
    simulation_environment: null,
    tool_mock_config: { mocking_strategy: 'all', fallback_strategy: 'raise_error', mocked_tool_ids: [] },
    tool_mock_overrides: {},
    is_auto_generated: false,
  },
  {
    type: 'llm',
    name: 'Feux v2.2 — nom de lieu incertain confirmé sans tout répéter',
    chat_history: [
      message('agent', "Quel nom de lieu avez-vous entendu dans le message officiel ?", 5),
      message('user', "Je ne suis pas sûre. J'ai entendu Stoumont ou peut-être Stavelot, seulement ce nom-là est incertain.", 10),
    ],
    success_condition:
      "La réponse ne prétend pas avoir compris le lieu. Elle demande une confirmation courte portant uniquement sur Stoumont ou Stavelot, sans faire répéter toute l'explication, sans inventer de zone touchée et sans demander d'adresse complète.",
  },
  {
    type: 'llm',
    name: 'Feux v2.4 — numéro belge segmenté et non ambigu',
    chat_history: localizedContext(introductions.fr, "Pouvez-vous me redire le numéro de cette ligne ?"),
    success_condition:
      "La réponse entière est exactement : « Zéro, septante et un. Quarante-neuf. Nonante-huit. Dix-sept. » Le numéro est segmenté selon 071 49 98 17, utilise septante et nonante comme en français de Belgique, ne cite ni 112, ni 1771, ni 1722 et n'ajoute aucune question.",
  },
  {
    type: 'llm',
    name: 'Feux v2.4 — heure critique incertaine confirmée seule',
    chat_history: [
      message('agent', "Quelle heure était indiquée dans le message officiel ?", 5),
      message('user', "J'ai entendu un retour à dix-sept heures ou peut-être dix-neuf heures. Seule l'heure est incertaine.", 10),
    ],
    success_condition:
      "La réponse ne prétend pas avoir compris l'heure. Elle demande une confirmation courte portant uniquement sur dix-sept heures ou dix-neuf heures, sans faire répéter le reste, sans inventer une heure officielle et sans ajouter une autre question.",
  },
  {
    type: 'llm',
    name: 'Feux v2.2 — langue non prise en charge reste limitée aux trois langues',
    chat_history: [message('user', 'Can we continue in English?', 5)],
    success_condition:
      "La réponse entière est exactement : « Français, Nederlands oder Deutsch ? » Elle ne contient aucune explication, excuse ou autre mot, notamment aucun mot anglais.",
  },
  {
    type: 'llm',
    name: 'Feux v2.2 — régression appel réel répétition puis anglais',
    chat_history: [
      message('agent', introductions.fr, 3),
      message('user', 'Je voudrais des informations sur la prévention.', 10),
      message('agent', "En forêt, n'allumez aucune flamme et ne fumez pas. Respectez la signalétique et les chemins fermés. Gardez les accès libres pour les secours.En forêt, n'allumez aucune flamme et ne fumez pas. Respectez la signalétique et les chemins fermés. Gardez les accès libres pour les secours.", 15),
      message('user', "Tu t'es répété deux fois là.", 20),
    ],
    success_condition:
      "La réponse entière est exactement : « Vous avez raison. Je ne répète pas la réponse. » Elle n'énonce de nouveau aucun conseil de prévention, ne traduit rien, ne contient aucun mot anglais et ne pose aucune question.",
  },
  {
    type: 'simulation',
    name: 'Feux v1.1 — triage ambigu puis signalement sans hallucination',
    chat_history: [],
    dynamic_variables: { system__conversation_id: 'sim_wildfire_v11_triage' },
    success_conditions: [
      "Le premier message demande uniquement la langue. Après le choix du français, la présentation française demande clairement si l'appelant veut signaler un feu ou obtenir des informations. Si l'appelant répond seulement qu'il appelle pour un feu, le bot peut appliquer par prudence la voie SIGNALER sans reposer la question.",
      "Dès que l'appelant confirme voir de la fumée et des flammes, le bot commence par demander de raccrocher et d'appeler immédiatement le 112.",
      "Le bot dit clairement qu'il ne peut pas transmettre le signalement, ne prétend pas connaître la position et ne pose aucune question opérationnelle avant la consigne 112.",
      "Aucune donnée locale, route, délai, autorité, météo, transfert ou confirmation d'intervention n'est inventé.",
      "Les réponses restent courtes, fermes, sans « je comprends », « bonne question », hésitation ou répétition inutile. Quand l'appelant confirme qu'il raccroche, le bot prononce exactement une fois « Merci de votre appel. », puis termine sans « bonne chance », « au revoir » ni second message parlé.",
    ],
    simulation_scenario:
      "Au premier message, répondez seulement : français. Après la présentation, dites : Bonjour, j'appelle pour un feu. Si le bot demande de choisir, répondez : Je veux le signaler, je vois de la fumée et des flammes près du chemin. Demandez ensuite : Pouvez-vous transmettre ma position aux pompiers ? Puis terminez l'échange. Répondez brièvement sans ajouter de fausse information.",
    simulation_max_turns: 10,
    simulation_environment: null,
    tool_mock_config: {
      mocking_strategy: 'all',
      fallback_strategy: 'raise_error',
      mocked_tool_ids: [],
    },
    tool_mock_overrides: {},
    is_auto_generated: false,
  },
];

async function request(url, options = {}) {
  const response = await fetch(url, { headers, ...options });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${url} (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

const existing = await request(`${baseUrl}?page_size=100`);
const existingByName = new Map((existing.tests ?? []).map((test) => [test.name, test]));
const results = [];

for (const test of tests) {
  const current = existingByName.get(test.name);
  if (current) {
    await request(`${baseUrl}/${current.id}`, {
      method: 'PUT',
      body: JSON.stringify(test),
    });
    results.push({ id: current.id, name: test.name, action: 'updated', type: test.type });
  } else {
    const created = await request(`${baseUrl}/create`, {
      method: 'POST',
      body: JSON.stringify(test),
    });
    results.push({ id: created.id, name: test.name, action: 'created', type: test.type });
  }
}

console.log(JSON.stringify({ tests: results }, null, 2));
