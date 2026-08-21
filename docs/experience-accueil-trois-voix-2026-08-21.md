# Expérience — accueil avec trois voix

Date : 21 août 2026

Cette expérience reste isolée de la version approuvée. Elle a été publiée sur le numéro le 21 août 2026 pour permettre le test téléphonique demandé.

## Références

- Branche : `codex/voice-test-2026-08-21`
- Version approuvée préservée : `approved/warm-fr-2026-08-21` (`62f24a1`)
- Agent source : `agent_2201m07k477kepfsq9p5h8bh4x1g`
- Agent expérimental : `agent_6301m0hrk7vbeyeadt55q1rc1xzv`
- Numéro attaché à l'agent expérimental : `+32 71 49 98 17`
- Ancien routage conservé pour retour arrière : agent `agent_2201m07k477kepfsq9p5h8bh4x1g`, branche `agtbrch_1101m07k47s2estbzstzye6f97px`

## Accueil testé

```text
Bonjour et bienvenue.
<Dutch>Goedendag en welkom.</Dutch>
<German>Guten Tag und herzlich willkommen.</German>
Pour continuer, vous préférez le français,
<Dutch>Nederlands</Dutch>
<German>oder Deutsch ?</German>
```

Le texte non balisé utilise Julien, la voix francophone professionnelle choisie pour ce test. Les balises ne sont pas prononcées : elles sélectionnent Jeroen pour les passages flamands et Otto pour les passages allemands.

| Passage | Voix | Identifiant | Modèle / vitesse |
|---|---|---|---|
| Français | Julien | `eOwAMwUJEGkP44SKOXIH` | Multilingual v2 / accueil `0.94`, preset FR `1.00` |
| Néerlandais belge | Jeroen | `Yv0oyZ3obP9foTH7emqG` | Flash v2.5 / `0.97` |
| Allemand | Otto | `FTNCalFNG5bRnkkaP5Ug` | Flash v2.5 / `0.97` |

Julien reste la voix par défaut pour tous les passages français. L'accueil conserve un débit légèrement adouci à `0.94` ; après la sélection, le preset français passe à `1.00` pour une présence un peu plus énergique. La stabilité reste alignée à `0.52` dans les deux contextes afin d'éviter les changements de ton entre les tours. Jeroen et Otto restent inchangés.

## Validation réelle

### Accueil seul

- Conversation : `conv_7401m0hrtf4ne8090w52zractm19`
- Multi-voix : activé et utilisé
- Voix facturées : Adrien, Jeroen et Otto
- Répétition ou filler détecté : aucun
- Résultat automatisé : réussi

### Accueil puis choix du français

- Conversation : `conv_5801m0hrtp5yfe78n7qvx5vsvp0e`
- Détection de langue : utilisée
- Première réponse française : `Bien sûr, nous allons continuer en français.`
- Voix française après sélection : Adrien avec le preset français conservé à `0.96`
- Résultat automatisé : réussi

### Contrôle après publication téléphonique

- Numéro : `+32 71 49 98 17`
- Agent assigné : `agent_6301m0hrk7vbeyeadt55q1rc1xzv`
- Branche ElevenLabs assignée : `agtbrch_3601m0hrk95gesfr463qhrhtc8gj`
- Conversation de contrôle post-publication : `conv_9401m0hsjb11e5d9b1s382s68kqn`
- Multi-voix : activé et utilisé
- Voix facturées : Adrien, Jeroen et Otto
- Résultat automatisé : réussi

## Rejouer les contrôles

```bash
ELEVENLABS_AGENT_ID=agent_6301m0hrk7vbeyeadt55q1rc1xzv \
ELEVENLABS_VALIDATION_OUTPUT_ROOT=/tmp/incendie-multivoice \
node scripts/validate-live-trilingual.mjs welcome-multivoice

ELEVENLABS_AGENT_ID=agent_6301m0hrk7vbeyeadt55q1rc1xzv \
ELEVENLABS_VALIDATION_OUTPUT_ROOT=/tmp/incendie-multivoice-fr \
node scripts/validate-live-trilingual.mjs fr-after-multivoice-welcome
```

La création d'un nouveau clone expérimental est volontairement protégée par `--confirm-create` :

```bash
node scripts/create-elevenlabs-multivoice-experiment.mjs --confirm-create
```

Documentation ElevenLabs : [Multi-voice support](https://elevenlabs.io/docs/eleven-agents/customization/voice/multi-voice-support).

## Stabilisation de Julien

L'appel entrant `conv_9401m0htzr32eh89m4xjqv4b2615` a été analysé après un retour signalant des ruptures de ton. Les métadonnées montrent que les `93,4` secondes de français de cet appel ont toutes été produites par l'ancienne voix Adrien : aucune seconde française n'a utilisé Julien et aucun changement de voix française n'a eu lieu. L'appel avait commencé avant la synchronisation de Julien.

Pour éviter que la variabilité prosodique donne malgré tout l'impression d'un changement de personne, Julien utilise désormais une stabilité uniforme de `0.52` dans l'accueil et après le choix du français. La vitesse reste `0.94` pour l'accueil et `1.00` pour la conversation afin de conserver l'énergie demandée. Les réglages de Jeroen et Otto ne sont pas modifiés.
