# Échantillons vocaux — voicebot Feux de Forêt

Ces fichiers conservent les itérations de l'accueil vocal générées le 17 août 2026 avec la voix belge francophone `Samuel - Bold, Coarse and Serious`.

| Fichier | Usage | Durée |
|---|---|---:|
| `accueil-samuel-fr-be-v1.1.mp3` | Première version avec mentions complètes 1771 et 112 | 18,20 s |
| `accueil-samuel-fr-be-v1.2.mp3` | Accueil raccourci | 16,44 s |
| `accueil-samuel-fr-be-v1.3.mp3` | Accueil final, qualité MP3 | 12,26 s |
| `accueil-samuel-fr-be-v1.3.ulaw` | Accueil final au format téléphonique ElevenLabs/Twilio | 12,26 s |
| `accueil-samuel-fr-be-v1.3-telephone.wav` | Décodage écoutable du flux téléphonique µ-law 8 kHz | 12,26 s |

Réglages : modèle `eleven_flash_v2_5`, stabilité `0,78`, similarité `0,85`, vitesse `1,08`, mode expressif désactivé.

Le flux téléphonique final a été retranscrit avec une probabilité de langue française de `1,0`. La phrase est complète, sans répétition ni mot parasite. L'analyse audio ne détecte aucune pause supérieure à 220 ms au seuil de -42 dB, aucun écrêtage et aucune valeur audio invalide.

Les enregistrements des conversations de test restent également activés dans ElevenLabs avec une conservation de 30 jours.

## Conversations live conservées

Chaque dossier contient le journal `session.json`, les segments téléphoniques bruts `.ulaw` et leur version `.wav` décodée à 8 kHz.

| Dossier | Conversation | Résultat utile |
|---|---|---|
| `live-v1.3/` | `conv_1501m07v74amf26sw00zgedff2aa` | A révélé une question finale inutile après la prévention. |
| `live-v1.4/` | `conv_6501m07vb76seh7v9t56z19vcnd3` | A validé la prévention, puis révélé une question finale après la réponse sur le chien. |
| `live-v1.5/` | `conv_0001m07vjkr2ef2tx83rf8h74zar` | Version finale : interruption correcte, aucune reprise, réponses exactes et clôture unique. |
| `live-v1.4-trilingual/fr/` | `conv_7901m07xga38e1csh9krhjrz18pr` | Choix français, présentation avec enregistrement et réponse feu de tourbe/Fagnes. |
| `live-v1.4-trilingual/nl/` | `conv_9301m07xgprmf7z88w0afrpk444n` | Choix Nederlands, présentation et réponse `veenbrand` entièrement en néerlandais. |
| `live-v1.4-trilingual/de/` | `conv_5401m07xh7p2f4gbb7mkmp2f48kb` | Choix Deutsch, présentation et réponse `Torfbrand` entièrement en allemand. |
| `live-v1.6-natural-opening/` | FR `conv_3001m07y9vrsfqeahadcqvnd9fts` · NL `conv_9101m07yagrvf53b0c3nqc1k007z` · DE `conv_6001m07yaxzvfv29nm6c3xykcsrc` | Sélecteur raccourci à environ 3 secondes et voix natives par langue. |
| `live-v1.7-warm-opening/` | FR `conv_8701m07ykj26f8xa6ebabja4n2cm` · NL `conv_0901m07ym1xxerfb59vv61c6ayfw` · DE `conv_3901m07yn9qqegeatrvsqxc7453k` | Accueil trilingue chaleureux de 6 secondes, prosodie adoucie et confirmation naturelle après le choix. |
| `live-v1.8-warm-slow-opening/` | FR `conv_3601m07ywxb5f78v24tcdvz3xcam` | Question complète « Vous préférez… ? », accueil ralenti à `0,90` et transition française validée. |
| `live-v1.9-no-brand/` | FR `conv_5301m07z7qrnetas77qpfrxa3jdw` | Présentation active sans mention d'entreprise, validée en conversation réelle. |
| `live-v2.2-goal/` | FR `conv_3501m0d2q7tffjba4jzcpmsye9ck` · NL `conv_5101m0d2qvt1fd3vt1kt8d2cn10c` · DE `conv_1501m0d2rma8esnt62tpc96b9ccj` · urgence FR `conv_4101m0d2jjy5feqsb4gqez3hfc9y` | Version v2.2 : voix natives confirmées côté serveur, porte vocale obligatoire, urgence en français avant le 112 et aucune répétition détectée. |

Dans `live-v1.5`, les quatre segments durent respectivement `12,47 s`, `7,36 s`, `9,91 s` et `1,05 s`. Leur retranscription est fidèle avec une probabilité de langue française de `1,0`. Aucun segment ne contient de silence supérieur à `220 ms` au seuil de `-42 dB`.

Dans `live-v1.4-trilingual`, chaque conversation contient trois segments : choix de langue, présentation complète et réponse tourbe/Fagnes. Les présentations durent `14,72 s` en français, `14,12 s` en néerlandais et `17,12 s` en allemand. Aucun de ces trois segments ne contient de silence supérieur à `400 ms` au seuil de `-42 dB`, ce qui valide une présentation continue.
