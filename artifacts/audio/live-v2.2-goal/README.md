# Preuves audio live — v2.2

Ces fichiers proviennent de l'agent ElevenLabs actif et utilisent le véritable format téléphonique µ-law 8 kHz. Chaque dossier contient les flux bruts `.ulaw`, leur décodage `.wav` et le journal serveur `session.json`.

| Scénario | Conversation | Voix confirmées côté serveur | Durées accueil / réponse | Résultat |
|---|---|---|---:|---|
| Français | `conv_3501m0d2q7tffjba4jzcpmsye9ck` | Jeroen → Adrien | `8,85 s / 14,87 s` | Réussi |
| Néerlandais | `conv_5101m0d2qvt1fd3vt1kt8d2cn10c` | Jeroen | `10,51 s / 13,29 s` | Réussi |
| Allemand | `conv_1501m0d2rma8esnt62tpc96b9ccj` | Jeroen → Otto | `10,51 s / 18,32 s` | Réussi |
| Urgence directe en français | `conv_4101m0d2jjy5feqsb4gqez3hfc9y` | Jeroen → Adrien | `11,87 s / 7,51 s` | Réussi |

Échantillons principaux :

- [présentation française](fr/event-2.wav) ;
- [présentation néerlandaise](nl/event-2.wav) ;
- [présentation allemande](de/event-2.wav) ;
- [consigne d'urgence française](fr-urgence/event-2.wav).

La détection de langue est marquée `used: true` dans les quatre journaux. Les identifiants vocaux attendus sont également présents dans la consommation TTS serveur.

Le scénario WebSocket multi-tour `fr-switch-de` n'est pas retenu comme preuve audio : le banc a ignoré son deuxième message texte et a expiré après deux réponses. Le changement FR→DE est couvert séparément par trois simulations réussies dans la suite `suite_4801m0d2y3y3fpp8mxfkvgr71qrm`, puis par la recette globale.
