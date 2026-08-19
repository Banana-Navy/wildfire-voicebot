# Validation du voicebot Feux en Milieu Naturel — v2.2

Date : 19 août 2026  
Agent : `agent_2201m07k477kepfsq9p5h8bh4x1g`  
Numéro inbound : `+32 71 49 98 17`

## État

La configuration v2.2 est synchronisée sur l'agent et le numéro actifs. Après le réglage final de l'accueil et de la voix française, la recette automatisée consolidée `suite_0001m0dqvtm8e44rprrmayh5dg30` passe `34/34`. Elle couvre l'accueil, la détection et le changement de langue, les urgences FR/NL/DE, les refus d'hallucination, les données critiques, les accès quotidiens et la régression « répétition puis anglais ».

Le lot multilingue v2.0 passe séparément `10/10` dans `suite_4601m0dfhfsqf0ys0sb929spkbgh`. Le cas français le plus instable, avec appelant paniqué, passe trois fois de suite dans `suite_8001m0dffe7qe7695qgyqth03sze`, `suite_6601m0dffzynfassk2wcm6hrearq` et `suite_2001m0dfgj5kfaxbk1gj49260cdz`.

Les appels audio réels FR, NL, DE et urgence FR confirment la détection de langue et les voix attendues côté serveur. Les preuves sont conservées dans [`artifacts/audio/live-v2.2-goal/`](../artifacts/audio/live-v2.2-goal/README.md).

## Incident réel corrigé

L'appel humain `conv_8301m0d06q8xf4bbvwrsvwed46vr` avait concaténé deux fois la réponse de prévention, puis poursuivi partiellement en anglais. Le journal serveur montrait que toute la génération avait utilisé `gemini-2.5-flash`, malgré l'activation correcte de la voix française.

Corrections appliquées :

1. retrait de Gemini du chemin principal et du secours ;
2. `claude-sonnet-4-5` avant et après la sélection, avec `claude-haiku-4-5` en secours ;
3. contrôle explicite anti-répétition et anti-traduction ;
4. réponse verrouillée lorsqu'un appelant signale une répétition ;
5. refus exact de l'anglais : « Français, Nederlands oder Deutsch ? » ;
6. porte vocale obligatoire avant tout texte au premier tour, en urgence et lors d'un changement de langue ;
7. interdiction d'appeler automatiquement `end_call` après une consigne du 112.
8. réponse d'urgence native verrouillée à trois phrases dans chaque preset, sans promesse d'intervention, itinéraire improvisé, question ni quatrième phrase.

La régression exacte « répétition puis anglais » a passé trois fois sur trois. Le refus de l'anglais et la réponse de prévention ont également passé trois fois sur trois.

## Configuration vocale finale

| Langue | Voix | Modèle TTS | Stabilité / similarité / vitesse |
|---|---|---|---|
| Accueil technique | Adrien | `eleven_multilingual_v2` | `0,40 / 0,76 / 0,99` |
| `fr-BE` | Adrien | `eleven_multilingual_v2` | `0,40 / 0,76 / 0,99` |
| `nl-BE` | Jeroen Vlaams | `eleven_flash_v2_5` | `0,62 / 0,82 / 0,97` |
| `de-DE` | Otto | `eleven_flash_v2_5` | `0,62 / 0,82 / 0,97` |

L'accueil utilise Adrien comme voix de sécurité. Ainsi, même si le premier routage linguistique tarde, aucune phrase française ne peut être prononcée avec la voix flamande. Après le retour utilisateur signalant un accueil et un français trop ternes, Adrien a été conservé avec une stabilité réduite, une similarité moins rigide et une vitesse revenue au rythme conversationnel. Le moteur V3 conversationnel a été écarté pendant la recette après avoir introduit des coupures dans certains mots français ; Multilingual v2 garde la diction attendue sans adopter la lenteur de la variante narrative Christophe.

## Résultats live

| Cas | Conversation | Résultat |
|---|---|---|
| Présentation FR | `conv_4801m0d6pzb5f01aw049kkpzr372` | `fr` détecté, Adrien utilisé, aucune répétition ni anglais |
| Présentation NL | `conv_4401m0d6fsfkfgzb98eea7188kng` | `nl` détecté, Jeroen utilisé |
| Présentation DE | `conv_8601m0d6ht42fetvshdbjvnz63d7` | `de` détecté, Otto utilisé |
| Urgence FR directe | `conv_1401m0d6za7kecqvrbwyn8pqpb1e` | Adrien activé avant la consigne du 112 |
| Urgence NL directe | `conv_8801m0d8n2yff1gaq2yssg3c7e7m` | Jeroen activé, réponse entièrement néerlandaise |
| Urgence DE directe | `conv_9401m0d8q8v9emxbgs11fdhyfrsd` | Otto activé, réponse entièrement allemande |
| Accueil et présentation FR finaux | `conv_8801m0dqsfy7ev79mzbxmh91tsrb` | Adrien Multilingual v2 utilisé seul, langue détectée, textes exacts et aucune anomalie de fluidité ; environ `7,4 s` puis `16,4 s` |

Après le durcissement de la porte vocale, les appels directs et la recette consolidée confirment la bascule vers la voix native avant toute consigne dans les trois langues.

## Accès quotidien officiel

Le déploiement GitHub Pages `32279404177`, construit depuis `main` après la correction finale, est terminé avec succès. Le manifeste public du 19 août 2026 a été généré à `17:03:56 UTC`, reste frais jusqu'au 21 août à `05:03:56 UTC`, et déclare les sources flamande et wallonne en état `ok`.

Le registre public contient `1 605` lieux et `9 117` variantes résolubles. Les scénarios Kalmthoutse Heide, Zoniënwoud ambigu, Chimay, Hautes Fagnes, Verviers, Kalmthoutse Heide en néerlandais et Fagne de Malchamps en allemand ont tous été validés sans ouverture déduite, route inventée ni renvoi vers un site lorsque la publication officielle a déjà été consultée.

## Limite connue

Le banc WebSocket multi-tour a ignoré un message texte après la présentation française et n'a donc pas fourni de preuve audio FR→DE complète. Ce comportement du banc est isolé dans `fr-switch-de/failed-session.json`. La logique de changement de langue elle-même est validée par la recette consolidée, avec les deux appels d'outil attendus et sans seconde présentation.

La qualité vocale reste un critère perceptif. Le dernier profil français est actif et son échantillon est fourni ; une écoute humaine sur le réseau téléphonique reste la validation finale du timbre.

## Sécurité de la clé

La clé ElevenLabs fournie dans le dialogue n'a pas été enregistrée dans le dépôt. Comme elle a été exposée dans une conversation, elle doit néanmoins être révoquée et remplacée dans ElevenLabs.
