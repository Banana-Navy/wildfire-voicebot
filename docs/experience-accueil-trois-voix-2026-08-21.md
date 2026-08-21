# Expérience — accueil avec trois voix

Date : 21 août 2026

Cette expérience reste isolée de la version approuvée et du numéro de téléphone de production.

## Références

- Branche : `codex/voice-test-2026-08-21`
- Version approuvée préservée : `approved/warm-fr-2026-08-21` (`62f24a1`)
- Agent source : `agent_2201m07k477kepfsq9p5h8bh4x1g`
- Agent expérimental : `agent_6301m0hrk7vbeyeadt55q1rc1xzv`
- Numéro attaché à l'agent expérimental : aucun

## Accueil testé

```text
Bonjour et bienvenue.
<Dutch>Goedendag en welkom.</Dutch>
<German>Guten Tag und herzlich willkommen.</German>
Pour continuer, vous préférez le français,
<Dutch>Nederlands</Dutch>
<German>oder Deutsch ?</German>
```

Le texte non balisé utilise Adrien, la voix belge francophone par défaut. Les balises ne sont pas prononcées : elles sélectionnent Jeroen pour les passages flamands et Otto pour les passages allemands.

| Passage | Voix | Identifiant | Modèle / vitesse |
|---|---|---|---|
| Français | Adrien | `IpTJxgMFj1wbxpha4zxm` | Multilingual v2 / accueil `0.90`, preset FR `0.96` |
| Néerlandais belge | Jeroen | `Yv0oyZ3obP9foTH7emqG` | Flash v2.5 / `0.97` |
| Allemand | Otto | `FTNCalFNG5bRnkkaP5Ug` | Flash v2.5 / `0.97` |

Adrien reste volontairement la voix par défaut au lieu d'être ajouté comme voix secondaire. Cela évite que le moteur rebalise toutes les réponses françaises et préserve le preset français approuvé à `0.96` après le choix de langue.

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
