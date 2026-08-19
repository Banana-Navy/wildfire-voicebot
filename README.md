# Voicebot Feux en Milieu Naturel — Belgique

Socle de conception et landing page pour un assistant vocal **inbound** multilingue d'information et d'orientation face aux feux en milieu naturel. La population appelle volontairement le 071 49 98 17, pose ses questions librement et reçoit des réponses fondées sur des sources officielles.

Le bot est une couche complémentaire aux autorités. Il ne remplace ni le 112, ni BE-Alert, ni les services de secours. L'agent vocal de test est configuré et relié au numéro inbound ci-dessous.

Numéro d'accès au voicebot inbound : **071 49 98 17** (`+32 71 49 98 17`). Cette ligne ne remplace ni le **1771** ni le numéro d'urgence **112**. Le projet n'est pas conçu comme une campagne d'appels sortants.

## Démarrer

```sh
npm install
npm run dev
```

La démonstration vocale utilise par défaut l'agent ElevenLabs `Feux en Milieu Naturel — Inbound (BE)`. Pour tester une branche ou un autre agent, copier `.env.example` vers `.env` et remplacer `VITE_ELEVENLABS_AGENT_ID`.

## Agent ElevenLabs

- Nom : `Feux en Milieu Naturel — Inbound (BE)`
- Agent ID : `agent_2201m07k477kepfsq9p5h8bh4x1g`
- Mode : inbound, numéro attaché
- Langues proposées à l'accueil : français, néerlandais et allemand
- Téléphonie : numéro Twilio `+3271499817`, appels entrants, affecté à la branche principale
- Audio : enregistré pendant les appels de test, avec annonce préalable
- Transcriptions : conservation maximale configurée à 30 jours
- Base de connaissances ElevenLabs : document `89AM7w3ggzzZpzmAiiRT`, injecté intégralement dans le prompt ; RAG désactivé pour éviter les mélanges de fragments

## Contenu

- `docs/plan-voicebot.md` : parcours, règles de triage, architecture et feuille de route.
- `docs/sources-officielles.md` : registre des sources belges et européennes.
- `docs/acces-quotidien-officiel.md` : cron, sources variables, registre des lieux et comportement en cas de panne.
- `knowledge/base-connaissances.md` : contenu contrôlé destiné au bot.
- `agent/system-prompt.md` : prompt système de référence.
- `src/` : landing page et démonstrateur navigateur.

## Principes de sécurité

- Un feu, une fumée proche, une personne en danger ou des symptômes graves déclenchent une consigne immédiate d'appel au 112.
- Le bot ne collecte pas de détails avant d'avoir donné cette consigne.
- Il ne décide jamais seul d'une évacuation de quartier et ne relaie que les ordres provenant d'une source officielle authentifiée.
- Il ne fournit ni prévision de propagation, ni itinéraire improvisé, ni conseil de lutte contre un feu établi.
- Les réponses sont courtes et répétables dans les trois langues nationales : français, néerlandais et allemand.
- Les feux de tourbe et les Hautes Fagnes ont un module dédié : combustion souterraine, reprise possible après plusieurs jours et vérification obligatoire des avis et fermetures du jour.
- Les questions d'accès et de vigilance utilisent un instantané officiel daté, renouvelé quotidiennement. Un niveau de risque ne vaut jamais confirmation d'ouverture.
