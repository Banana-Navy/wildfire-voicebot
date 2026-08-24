# Agent ElevenLabs — Feux en Milieu Naturel

Créé le 17 août 2026 dans le workspace ElevenLabs partagé.

| Paramètre | Valeur |
|---|---|
| Nom | Feux en Milieu Naturel — Inbound (BE) |
| Agent ID de test publié | `agent_6301m0hrk7vbeyeadt55q1rc1xzv` |
| Mode | Inbound |
| Langues proposées à l'accueil | FR, NL, DE |
| Numéro attaché | `+32 71 49 98 17` — inbound, branche principale |
| Appels sortants | Aucun |
| Webhooks d'accès | Temporairement détachés de l'agent ; aucune localisation ni aucun statut de zone |
| Enregistrement audio | Activé pour les appels de test |
| Conservation des transcriptions | 30 jours maximum |
| Knowledge Base | `89AM7w3ggzzZpzmAiiRT` |
| Routage initial | sécurité `fr`, voix Julien ; `claude-sonnet-4-5`, température 0 |
| Conversation après sélection | `claude-sonnet-4-5` ; secours `claude-haiku-4-5` |
| RAG | Désactivé ; base contrôlée injectée intégralement dans le prompt |
| Voix par langue | FR `Julien` — français professionnel ; NL `Jeroen Vlaams` — flamand belge ; DE `Otto` — allemand natif |
| Modèle vocal | Accueil et FR `eleven_multilingual_v2` ; NL et DE `eleven_flash_v2_5` |
| Réglages de la voix d'ouverture | stabilité `0,52` ; similarité `0,78` ; vitesse `0,94` |
| Réglages après sélection | FR `0,52 / 0,78 / 1,00` ; NL et DE inchangés à `0,62 / 0,82 / 0,97` (stabilité / similarité / vitesse) |
| Prise de tour | `turn_v3`, réactivité normale, délai `7 s`, remplissages désactivés |

La base ElevenLabs est synchronisée uniquement depuis `knowledge/base-connaissances.md`. Les incidents historiques et documents de conception restent dans le dépôt pour la landing page, mais ne sont plus injectés dans les réponses du bot. Le document distant porte le nom `Feux en Milieu Naturel — Base opérationnelle contrôlée — 2026.08.17`.

Les données variables du jour ne sont jamais copiées dans cette base statique. Le workflow GitHub Actions continue de les relire et de les valider afin de préserver le mécanisme pour une réactivation future. Pour la version actuelle, les outils de localisation et de statut sont détachés de l'agent : il ne cherche aucun lieu, ne demande aucune commune et ne donne aucun statut d'accès ou de vigilance.

Le registre couvre les 565 communes Statbel, les cinq provinces flamandes, les cinq provinces wallonnes, 333 domaines naturels de l'Agentschap voor Natuur en Bos, 680 zones naturelles publiées par le SPW et les lieux explicitement nommés dans les mesures actives suivies. Il génère aussi des variantes orales sûres telles que « forêt de Chimay », « bos van… » et « Wald bei… » afin de résoudre une demande naturelle sans inventer un autre lieu. Un code provincial indique le risque mais ne confirme jamais à lui seul qu'un site individuel est ouvert.

Pour toute question d'accès ou d'interdiction, la réponse se limite désormais à indiquer le site officiel de la commune concernée ou les informations du gestionnaire de la zone naturelle. Elle précise que les consignes peuvent évoluer au cours de la journée. Aucun lieu cité par l'appelant n'est repris, résolu ou qualifié d'ouvert, fermé, accessible ou interdit.

## Téléphonie connectée

Le numéro Twilio `+32 71 49 98 17` est importé dans ElevenLabs et lié exclusivement à cet agent pour les appels entrants. Le numéro `+32 71 49 10 86`, appartenant au projet « Appeldoorn & Associé - DEV 2 », a été dissocié de cet agent.

Avant la mise en production, effectuer aussi un appel humain de bout en bout et vérifier : décrochage, accueil, changement de langue, question libre, détection d'urgence, consigne 112, interruption, fin d'appel et journalisation.

L'agent ne prétend pas transférer un appel au 112. Tant qu'aucun outil de transfert humain officiellement validé n'est configuré, il demande à l'appelant de raccrocher et d'appeler lui-même le 112 en cas de danger immédiat.

## Principes de qualité vocale

Le sélecteur initial commence par un véritable accueil : « Bonjour et bienvenue. Goedendag en welkom. Guten Tag und herzlich willkommen. Pour continuer, vous préférez le français, Nederlands oder Deutsch ? ». L'accueil utilise Julien comme voix française par défaut. Après le choix, un changement de langue obligatoire applique un preset complet avant toute nouvelle parole : `Julien` en français, `Jeroen Vlaams` en flamand belge et `Otto` en allemand. La stabilité de Julien reste identique à `0,52` avant et après la sélection afin de conserver le même ton d'un tour à l'autre ; seule la vitesse passe de `0,94` à `1,00` pour garder une conversation plus énergique. La présentation française commence d'un seul mouvement par « Bien sûr, nous allons continuer en français » pour éviter l'inflexion hésitante produite par deux petites phrases. Le preset verrouille la langue, la voix et le modèle de conversation.

La ligne se présente uniquement comme « ligne d'information Feux en Milieu Naturel ». Le voicebot ne cite aucune entreprise dans les trois langues. L'optimisation de latence audio est désactivée pour l'accueil et le français afin de privilégier la qualité et la prosodie.

Dans toute réponse française, le nom officiel `BE-Alert` est écrit phonétiquement `bi-alerte` avant synthèse afin d'obtenir la prononciation française demandée et d'éviter « bé-e alerte » ou une lecture anglaise.

Le délai de tour et la réactivité sont configurés pour une conversation téléphonique naturelle. Le délai souple est désactivé : le bot ne doit jamais meubler un silence par « hmm » ou une phrase improvisée.
