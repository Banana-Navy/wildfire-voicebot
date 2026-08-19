# Validation du voicebot Feux en Milieu Naturel — v2.2

Date : 19 août 2026  
Agent : `agent_2201m07k477kepfsq9p5h8bh4x1g`  
Numéro inbound : `+32 71 49 98 17`

## État

La configuration v2.2 est synchronisée sur l'agent et le numéro actifs. La recette automatisée finale `suite_9901m0d36jf0ffarvnragfwr61kx` passe `28/28`. Le changement FR→DE, durci après cette recette, passe ensuite `3/3` dans `suite_4801m0d2y3y3fpp8mxfkvgr71qrm` avec un appel `language_detection` vers `fr`, puis un second vers `de`.

Les appels audio réels FR, NL, DE et urgence FR confirment la détection de langue et les voix attendues côté serveur. Les preuves sont conservées dans [`artifacts/audio/live-v2.2-goal/`](../artifacts/audio/live-v2.2-goal/README.md).

## Incident réel corrigé

L'appel humain `conv_8301m0d06q8xf4bbvwrsvwed46vr` avait concaténé deux fois la réponse de prévention, puis poursuivi partiellement en anglais. Le journal serveur montrait que toute la génération avait utilisé `gemini-2.5-flash`, malgré l'activation correcte de la voix française.

Corrections appliquées :

1. retrait de Gemini du chemin principal et du secours ;
2. `claude-haiku-4-5` avant et après la sélection, avec `claude-sonnet-4-5` en secours ;
3. contrôle explicite anti-répétition et anti-traduction ;
4. réponse verrouillée lorsqu'un appelant signale une répétition ;
5. refus exact de l'anglais : « Français, Nederlands oder Deutsch ? » ;
6. porte vocale obligatoire avant tout texte au premier tour, en urgence et lors d'un changement de langue ;
7. interdiction d'appeler automatiquement `end_call` après une consigne du 112.

La régression exacte « répétition puis anglais » a passé trois fois sur trois. Le refus de l'anglais et la réponse de prévention ont également passé trois fois sur trois.

## Configuration vocale finale

| Langue | Voix | Modèle TTS | Stabilité / similarité / vitesse |
|---|---|---|---|
| Accueil technique | Jeroen Vlaams | `eleven_flash_v2_5` | `0,62 / 0,82 / 0,94` |
| `fr-BE` | Adrien | `eleven_multilingual_v2` | `0,50 / 0,82 / 0,94` |
| `nl-BE` | Jeroen Vlaams | `eleven_flash_v2_5` | `0,62 / 0,82 / 0,97` |
| `de-DE` | Otto | `eleven_flash_v2_5` | `0,62 / 0,82 / 0,97` |

Le français utilise le moteur Multilingual v2 afin de réduire l'effet robotique du modèle Flash, tout en gardant un rythme plus présent que la variante narrative Christophe écartée pendant la recette. La présentation française finale dure environ `14,87 s` dans le flux téléphonique.

## Résultats live

| Cas | Conversation | Résultat |
|---|---|---|
| Présentation FR | `conv_3501m0d2q7tffjba4jzcpmsye9ck` | `fr` détecté, Adrien utilisé, aucune répétition |
| Présentation NL | `conv_5101m0d2qvt1fd3vt1kt8d2cn10c` | `nl` détecté, Jeroen utilisé |
| Présentation DE | `conv_1501m0d2rma8esnt62tpc96b9ccj` | `de` détecté, Otto utilisé |
| Urgence FR directe | `conv_4101m0d2jjy5feqsb4gqez3hfc9y` | Adrien activé avant « Raccrochez et appelez immédiatement le cent douze » |

Après le durcissement de la porte vocale, quatre appels d'urgence directs successifs ont confirmé l'utilisation d'Adrien avant la consigne française.

## Limite connue

Le banc WebSocket multi-tour a ignoré un message texte après la présentation française et n'a donc pas fourni de preuve audio FR→DE complète. Ce comportement du banc est isolé dans `fr-switch-de/failed-session.json`. La logique de changement de langue elle-même est validée trois fois sur trois par les simulations ElevenLabs, avec les deux appels d'outil attendus et sans seconde présentation.

La qualité vocale reste un critère perceptif. Le dernier profil français est actif et son échantillon est fourni ; une écoute humaine sur le réseau téléphonique reste la validation finale du timbre.

## Sécurité de la clé

La clé ElevenLabs fournie dans le dialogue n'a pas été enregistrée dans le dépôt. Comme elle a été exposée dans une conversation, elle doit néanmoins être révoquée et remplacée dans ElevenLabs.
