# Agent ElevenLabs — Feux en Milieu Naturel

Créé le 17 août 2026 dans le workspace ElevenLabs partagé.

| Paramètre | Valeur |
|---|---|
| Nom | Feux en Milieu Naturel — Inbound (BE) |
| Agent ID | `agent_2201m07k477kepfsq9p5h8bh4x1g` |
| Mode | Inbound |
| Langues proposées à l'accueil | FR, NL, DE |
| Numéro attaché | `+32 71 49 98 17` — inbound, branche principale |
| Appels sortants | Aucun |
| Webhooks métier | `resolve_official_place`, puis `get_daily_access_status` |
| Enregistrement audio | Activé pour les appels de test |
| Conservation des transcriptions | 30 jours maximum |
| Knowledge Base | `89AM7w3ggzzZpzmAiiRT` |
| Routage initial | sécurité `fr`, voix Adrien ; `claude-sonnet-4-5`, température 0 |
| Conversation après sélection | `claude-sonnet-4-5` ; secours `claude-haiku-4-5` |
| RAG | Désactivé ; base contrôlée injectée intégralement dans le prompt |
| Voix par langue | FR `Adrien` — français belge ; NL `Jeroen Vlaams` — flamand belge ; DE `Otto` — allemand natif |
| Modèle vocal | Accueil et FR `eleven_multilingual_v2` ; NL et DE `eleven_flash_v2_5` |
| Réglages de la voix d'ouverture | stabilité `0,40` ; similarité `0,76` ; vitesse `0,99` |
| Réglages après sélection | FR `0,40 / 0,76 / 0,99` ; NL et DE `0,62 / 0,82 / 0,97` (stabilité / similarité / vitesse) |
| Prise de tour | `turn_v3`, réactivité normale, délai `7 s`, remplissages désactivés |

La base ElevenLabs est synchronisée uniquement depuis `knowledge/base-connaissances.md`. Les incidents historiques et documents de conception restent dans le dépôt pour la landing page, mais ne sont plus injectés dans les réponses du bot. Le document distant porte le nom `Feux en Milieu Naturel — Base opérationnelle contrôlée — 2026.08.17`.

Les données variables du jour ne sont jamais copiées dans cette base statique. Un workflow GitHub Actions les relit chaque matin auprès des sources officielles, valide leur structure puis publie un instantané daté sur GitHub Pages. L'agent résout d'abord le lieu prononcé, puis lit le statut correspondant. Toute donnée d'une autre date belge, au-delà du délai de fraîcheur de 36 heures, ambiguë ou en erreur est refusée.

Le registre couvre les 565 communes Statbel, les cinq provinces flamandes, les cinq provinces wallonnes, 333 domaines naturels de l'Agentschap voor Natuur en Bos, 680 zones naturelles publiées par le SPW et les lieux explicitement nommés dans les mesures actives suivies. Il génère aussi des variantes orales sûres telles que « forêt de Chimay », « bos van… » et « Wald bei… » afin de résoudre une demande naturelle sans inventer un autre lieu. Un code provincial indique le risque mais ne confirme jamais à lui seul qu'un site individuel est ouvert.

Pour la Wallonie, le workflow lit la publication française et sa traduction allemande officielle lorsqu'elle est disponible. Une commune reste distincte d'un cantonnement forestier, d'une route ou d'un barrage homonyme. Lorsqu'aucune mesure ne nomme exactement l'entité demandée, l'agent dit que l'accès n'est pas confirmé ; il ne transforme jamais cette absence en preuve que le lieu est hors périmètre ou ouvert. Pour une zone étendue comme les Hautes Fagnes, il distingue la présence d'une interdiction dans un périmètre cartographié du statut de l'ensemble de la réserve et refuse toute généralisation.

## Téléphonie connectée

Le numéro Twilio `+32 71 49 98 17` est importé dans ElevenLabs et lié exclusivement à cet agent pour les appels entrants. Le numéro `+32 71 49 10 86`, appartenant au projet « Appeldoorn & Associé - DEV 2 », a été dissocié de cet agent.

Avant la mise en production, effectuer aussi un appel humain de bout en bout et vérifier : décrochage, accueil, changement de langue, question libre, détection d'urgence, consigne 112, interruption, fin d'appel et journalisation.

L'agent ne prétend pas transférer un appel au 112. Tant qu'aucun outil de transfert humain officiellement validé n'est configuré, il demande à l'appelant de raccrocher et d'appeler lui-même le 112 en cas de danger immédiat.

## Principes de qualité vocale

Le sélecteur initial commence par un véritable accueil : « Bonjour et bienvenue. Goedendag en welkom. Guten Tag und herzlich willkommen. Vous préférez le français, Nederlands oder Deutsch ? ». L'accueil utilise Adrien comme voix de sécurité : même si le premier routage linguistique échoue, une phrase française ne peut plus être lue avec la voix flamande. Après le choix, un changement de langue obligatoire applique un preset complet avant toute nouvelle parole : `Adrien` en français belge, `Jeroen Vlaams` en flamand belge et `Otto` en allemand. Les trois voix sont masculines, calmes et d'âge moyen apparent. Adrien conserve le moteur stable Multilingual v2, avec une stabilité réduite, une similarité moins rigide et un débit proche du rythme naturel pour gagner en présence sans dérive de diction. Le preset verrouille la langue, la voix et le modèle de conversation.

La ligne se présente uniquement comme « ligne d'information Feux en Milieu Naturel ». Le voicebot ne cite aucune entreprise dans les trois langues. L'optimisation de latence audio est désactivée pour l'accueil et le français afin de privilégier la qualité et la prosodie.

Le délai de tour et la réactivité sont configurés pour une conversation téléphonique naturelle. Le délai souple est désactivé : le bot ne doit jamais meubler un silence par « hmm » ou une phrase improvisée.
