# Validation du voicebot Feux en Milieu Naturel — 17 août 2026

> **État v1.4 : synchronisée et tests automatisés réussis.** Le parcours trilingue FR/NL/DE, la présentation après choix de langue, le module feux de tourbe/Hautes Fagnes et la voix française belge `Adrien` sont actifs sur l'agent et le numéro. La recette humaine téléphonique dans les trois langues reste indispensable.

## Recette requise pour la v1.4

1. Synchronisation du prompt, de la base et de la téléphonie : réussie.
2. Création ou mise à jour des onze tests ElevenLabs : réussie.
3. Suite v1.4 `suite_4201m07x9qs3exvtnbw60hnyk54x` : `12/12`, soit trois passes pour chacun des quatre nouveaux scénarios.
4. À faire : trois appels humains, un par langue nationale, pour vérifier que la présentation complète suit le choix de langue, que l'enregistrement est annoncé une seule fois et que le triage vient ensuite.
5. À faire : tester une interruption d'urgence pendant l'accueil ; une fumée ou une flamme constatée doit toujours déclencher le 112 immédiatement.

### Conversations vocales réelles v1.4

Trois conversations WebSocket ont été exécutées sur l'agent actif, avec le véritable flux audio téléphonique µ-law 8 kHz :

- français : `conv_7901m07xga38e1csh9krhjrz18pr` ;
- néerlandais : `conv_9301m07xgprmf7z88w0afrpk444n` ;
- allemand : `conv_5401m07xh7p2f4gbb7mkmp2f48kb`.

Chaque conversation a validé successivement : l'accueil dans les trois langues, le choix de la langue, la présentation complète dans la langue choisie, l'annonce unique de l'enregistrement, la distinction avec une centrale d'urgence, le choix signaler/informer et une question sur une activité prévue plusieurs jours après un feu de tourbe.

Les réponses tourbe/Fagnes sont conformes dans les trois langues : combustion souterraine et reprise possibles, aucune confirmation de sécurité, aucune durée inventée, vérification le jour même des avis et cartes de la Wallonie, respect des panneaux et fermetures.

Les présentations audio durent `14,72 s` en français, `14,12 s` en néerlandais et `17,12 s` en allemand. Aucun silence supérieur à `400 ms` n'a été détecté au seuil de `-42 dB`, et les pics restent entre `-1,4` et `-1,0 dBFS` sans écrêtage.

### Correction v1.6 — ouverture plus naturelle

L'ancien accueil obligeait la même voix à prononcer trois phrases complètes dans trois langues et durait environ 10 à 11 secondes. Il est remplacé par un sélecteur de 3,15 à 3,45 secondes : « Bonjour. Goedendag. Guten Tag. Français, Nederlands oder Deutsch ? ».

Après le choix, ElevenLabs applique maintenant un preset vocal natif : `Adrien` pour le français belge, `Petra Vlaams` pour le néerlandais belge et `Otto` pour l'allemand. Les textes de présentation ont été réécrits dans un registre conversationnel propre à chaque langue.

Conversations de validation : FR `conv_3001m07y9vrsfqeahadcqvnd9fts`, NL `conv_9101m07yagrvf53b0c3nqc1k007z`, DE `conv_6001m07yaxzvfv29nm6c3xykcsrc`. Les trois sélecteurs, présentations et réponses tourbe/Fagnes ont été générés en audio µ-law 8 kHz sans erreur ni silence interne supérieur à 550 ms.

### Correction v1.7 — entrée plus chaleureuse

Le sélecteur trop sec de la v1.6 est remplacé par un véritable accueil : « Bonjour et bienvenue. Goedendag en welkom. Guten Tag und herzlich willkommen. Français, Nederlands oder Deutsch ? ». Il dure de `6,01 à 6,46 s`, contre environ 3 secondes auparavant, mais ne ressemble plus à une simple énumération de menu.

La voix d'ouverture est plus souple et légèrement ralentie (`stabilité 0,55`, `similarité 0,80`, `vitesse 0,95`). Après le choix, la présentation commence désormais par « Très bien, merci », « Prima, dank u » ou « Sehr gern », puis conserve la voix native de la langue.

Conversations de validation : FR `conv_8701m07ykj26f8xa6ebabja4n2cm`, NL `conv_0901m07ym1xxerfb59vv61c6ayfw`, DE `conv_3901m07yn9qqegeatrvsqxc7453k`. Les trois sessions ont produit le sélecteur, la présentation localisée et la réponse métier attendue, avec trois événements audio chacune.

### Correction v1.8 — question complète et débit ralenti

L'accueil actif dit maintenant : « Bonjour et bienvenue. Goedendag en welkom. Guten Tag und herzlich willkommen. Vous préférez le français, Nederlands oder Deutsch ? ». La vitesse passe de `0,95` à `0,90` afin de laisser respirer les trois salutations et la question.

Conversation de validation : FR `conv_3601m07ywxb5f78v24tcdvz3xcam`. L'accueil dure `7,21 s`, puis le choix « français » déclenche correctement la présentation native attendue.

### Correction v1.9 — suppression de la marque dans le voicebot

Toute mention de Banana Navy a été supprimée de l'identité système, de la base de connaissances vocale et des présentations française, néerlandaise et allemande. La ligne se présente désormais uniquement comme la « ligne d'information Feux en Milieu Naturel ».

Conversation de validation : FR `conv_5301m07z7qrnetas77qpfrxa3jdw`. La transcription réelle confirme que la marque n'est prononcée ni dans l'accueil ni dans la présentation.

## Configuration active

- Agent : `agent_2201m07k477kepfsq9p5h8bh4x1g`
- Branche : `agtbrch_1101m07k47s2estbzstzye6f97px`
- Numéro Twilio inbound : `+32 71 49 98 17`
- Affectation vérifiée : agent `Feux en Milieu Naturel — Inbound (BE)`
- Voix : `Adrien`, professionnelle française belge, calme et informative
- Modèle vocal : `eleven_flash_v2_5`
- Réglages de l'ouverture : stabilité `0,55` ; similarité `0,80` ; vitesse `0,90`
- Réglages des voix natives après sélection : stabilité `0,70` ; similarité `0,82` ; vitesse `1,00`
- Prise de tour : `turn_v3`, réactivité `normal`, délai `7 s`
- Délai souple et remplissages : désactivés
- Parole libre avant `end_call` désactivée ; clôture contrôlée « Merci de votre appel. »
- LLM : `claude-sonnet-4-5`, température `0`, maximum `180` jetons
- RAG : désactivé ; une seule base contrôlée injectée en mode prompt
- Enregistrement : activé ; conservation `30 jours`

## Corrections appliquées

1. Remplacement de la voix anglophone `Eric` par une voix native francophone belge plus ferme.
2. Passage de la vitesse de `0,92` à `1,08` et de la stabilité de `0,50` à `0,78`.
3. Passage du mode de tour `patient` au mode `normal` et du délai de `15 s` à `7 s`.
4. Suppression des remplissages de silence, des formules apaisantes, des questions finales automatiques et des reprises complètes après interruption.
5. Accueil réduit à 12,26 secondes tout en conservant l'enregistrement, le 112 et le choix signaler/informer.
6. Réponses d'information limitées à 45 mots et trois phrases.
7. Interdiction explicite de déduire une commune, une province, une Région ou une autorité depuis un lieu cité.
8. Réponse courte obligatoire ajoutée pour la prévention générale.
9. Fin d'appel limitée à une seule formule contrôlée afin d'éviter toute duplication avant le raccrochage.

## Tests ElevenLabs persistants

Sept tests sont enregistrés dans le workspace :

- signalement réel et consigne 112 prioritaire ;
- refus d'inventer un état local ou un itinéraire ;
- statut du 1771 non confirmé ;
- prévention sans abus du 112 ;
- refus de prédire la propagation ;
- absence de répétition après changement de sujet ;
- simulation complète du triage ambigu vers le signalement.

Passes ciblées validées :

- absence de répétition et de question finale : `5/5`, suite `suite_9401m07tkdwbez0tkcj24adpxfza` ;
- prévention courte et triage complet : `10/10`, suite `suite_3201m07tqc7eeessjh567dacep5r`.

La suite complète la plus récente est `suite_7701m07wf3kbe81vccpm1h7g86st` : `21/21` exécutions réussies, soit trois passes pour chacun des sept scénarios, sur la configuration actuellement affectée au numéro.

## Validation audio

Échantillon téléphonique final : `artifacts/audio/accueil-samuel-fr-be-v1.3-telephone.wav`.

- durée : `12,260 s` ;
- fréquence : `8 kHz`, mono, décodée depuis µ-law ;
- pic : `-0,17 dBFS`, sans écrêtage ;
- aucune pause anormale de plus de `220 ms` au seuil de `-42 dB` ;
- retranscription complète et fidèle ;
- langue française reconnue avec une probabilité de `1,0` ;
- aucune répétition ou hésitation détectée.

### Conversation audio live finale

Conversation ElevenLabs : `conv_0001m07vjkr2ef2tx83rf8h74zar`.

Le test a utilisé le véritable flux WebSocket vocal au format téléphonique µ-law 8 kHz. Il a enchaîné l'accueil, une demande de prévention, une interruption par « Et pour mon chien ? », puis une demande de fin d'appel.

- l'interruption est marquée `interrupted: true` et la réponse suivante traite directement le chien, sans recommencer la prévention ;
- prévention : réponse exacte en trois phrases, sans question finale ;
- animaux : réponse exacte en deux phrases, sans question finale ;
- clôture : une seule occurrence de « Merci de votre appel. », suivie de `end_call` sans erreur ;
- délai avant le premier son des réponses : `2,09 s`, puis `1,51 s` ;
- délai TTS seul : de `0,08 s` à `0,20 s` ;
- les quatre segments ont une probabilité de langue française de `1,0` ;
- aucune pause supérieure à `220 ms`, aucun écrêtage et aucune reprise audio détectée.

Les flux bruts, les WAV décodés et le journal d'événements sont conservés dans `artifacts/audio/live-v1.5/`. Les versions `live-v1.3` et `live-v1.4` conservent les écarts qui ont conduit aux deux derniers durcissements du prompt.

## Concordance locale et distante

- prompt local et prompt actif : identiques, empreinte SHA-256 courte `3d3528b78e8823a8` ;
- base locale préparée et document ElevenLabs actif : identiques, empreinte SHA-256 courte `a8d9a067f4cbb0e9` ;
- numéro `+32 71 49 98 17` : inbound supporté, fournisseur Twilio, agent et branche attendus affectés.

## Dernière validation indispensable

La configuration distante, le prompt, la base, la synthèse, les tests anti-hallucination et le flux téléphonique µ-law sont validés. Un appel humain réel au `071 49 98 17` reste nécessaire pour contrôler le décrochage opérateur, la qualité perçue sur le réseau téléphonique, les interruptions humaines et la fin d'appel. Après cet appel, contrôler l'audio et la transcription enregistrés dans ElevenLabs avant de déclarer la recette téléphonique entièrement terminée.
