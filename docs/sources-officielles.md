# Registre des sources officielles

Dernière vérification : 17 août 2026. Les contenus dynamiques (codes de risque, interdictions, périmètres, centres d'accueil) ne doivent jamais être copiés durablement dans le prompt : ils doivent être récupérés auprès d'une source officielle horodatée.

## Belgique — sources de référence

| Domaine | Autorité | Source | Usage dans le bot |
|---|---|---|---|
| Conduite avant, pendant et après | Centre de Crise national | https://centredecrise.be/fr/risques-en-belgique/risques-naturels/feu-de-foret | Arbre de décision principal |
| Appel d'urgence | SPF Intérieur — 112 | https://112.be/fr/how-call/comment-appeler-le-112 | Données à transmettre et conduite pendant l'appel |
| Quand appeler | SPF Intérieur — 112 | https://112.be/fr/qui-et-quand-appeler | Escalade obligatoire pour tout feu en milieu naturel |
| Communication officielle | Centre de Crise national | https://centredecrise.be/fr/que-pouvez-vous-faire/informez-vous/linformation-pendant-une-situation-durgence | BE-Alert, autorités locales, médias officiels |
| Évacuation | Centre de Crise national | https://centredecrise.be/fr/que-pouvez-vous-faire/le-bon-reflexe/evacuer | Départ, transport, minimum à emporter, animaux |
| Kit d'urgence | Centre de Crise national | https://centredecrise.be/fr/que-pouvez-vous-faire/preparez-un-kit-durgence/un-kit-durgence-la-maison | Préparation 72 h et besoins spécifiques |
| Fumée | Centre de Crise national | https://centredecrise.be/fr/documentation/publications/restez-hors-de-toute-fumee | Vocabulaire et consignes harmonisées |
| Prévention wallonne | SPW Environnement | https://environnement.wallonie.be/feux | Prévention, témoin d'un départ de feu, interdictions locales |
| Hautes Fagnes | SPW Environnement | https://environnement.wallonie.be/actualite/risque-d-incendie-fin-du-drapeau-rouge-dans-la-reserve-naturelle-des-hautes-fagnes | Drapeau rouge, cartes des chemins fermés et statut d'accès daté |
| Activités en forêt | Gouvernement wallon | https://www.wallonie.be/fr/demarches/circuler-en-foret-en-wallonie | Vérification préalable des accès et respect des fermetures |
| Organisation wallonne | Wallonie | https://www.wallonie.be/fr/faq-prevention-incendies-en-foret | DNF, zones de secours, CELEX |
| Risque flamand | Vlaanderen / Agentschap Natuur en Bos | https://www.vlaanderen.be/natuur-milieu-en-klimaat/bomen-en-planten/brandpreventie-in-bossen-en-natuurgebieden-in-vlaanderen | Codes vert, jaune, orange, rouge et restrictions |
| Personnes ayant besoin d'aide | Centre de Crise national | https://centredecrise.be/fr/que-pouvez-vous-faire/faites-un-plan/un-plan-pour-ceux-qui-ont-besoin-dune-aide-supplementaire | Médicaments, mobilité, accessibilité et soutien |
| Animaux | Centre de Crise national | https://centredecrise.be/fr/newsroom/conseils-pour-vous-et-vos-animaux-en-cas-de-situations-durgence-0 | Transport, identification, centre d'accueil |

## Europe et santé

| Domaine | Autorité | Source | Usage dans le bot |
|---|---|---|---|
| Santé et fumées | OMS Europe | https://www.who.int/europe/news-room/questions-and-answers/item/public-health-advice-during-the-wildfires--how-to-protect-your-health-and-keep-safe | Groupes vulnérables, exposition, symptômes et FFP2/N95 |
| Feux de tourbe | Gouvernement britannique — code officiel de gestion | https://www.gov.uk/government/publications/heather-and-grass-management-code/heather-and-grass-management-code-2025 | Combustion dans la tourbe, sol pouvant couver plus de 48 h et risque de reprise secondaire |
| Coordination européenne | Commission européenne — DG ECHO | https://civil-protection-humanitarian-aid.ec.europa.eu/what/civil-protection/eu-civil-protection-mechanism_en | Contexte institutionnel uniquement, pas de conseil individuel |
| Suivi européen | Commission européenne — JRC/EFFIS | https://effis.jrc.ec.europa.eu/ | Carte et données de suivi, jamais source unique d'un ordre local |
| Numéro européen | Union européenne / 112 Belgique | https://112.be/fr/how-call/comment-appeler-le-112 | Le 112 fonctionne dans les 27 États membres |

## Retours d'expérience récents

| Événement | Source officielle | Apport au voicebot |
|---|---|---|
| Lagland, Han-sur-Lesse et fermeture des Hautes Fagnes, 2025 | https://environnement.wallonie.be/home/a-la-une/actualites/actualites/drapeau-rouge-dans-les-hautes-fagnes-acces-interdit-en-raison-du-risque-d-incendie.html | Signalement, vent, cartes et interdictions d'accès |
| Vigilance renforcée en Wallonie, 2026 | https://environnement.wallonie.be/actualite/risque-accru-d-incendie-en-milieux-naturels-vigilance-renforcee-cette-semaine-en-wallonie | Surveillance, CELEX/CORTEX et fermetures temporaires |
| Crète, juillet 2025 | https://data.jrc.ec.europa.eu/dataset/9d8d35b6-0b6a-5810-bff8-1d6c0a0b0c37 | Message 112 par cellule et évacuation territorialisée |
| Espagne, été 2025 | https://civil-protection-humanitarian-aid.ec.europa.eu/what/civil-protection/european-civil-protection-pool_en | Routes fermées, évacuations massives et renforts européens |
| Chios, juin 2025 | https://www.who.int/europe/news-room/photo-stories/item/chios-on-fire--one-photographer-s-view-of-a-growing-health-threat | Fumées, vulnérabilités et ordres d'évacuation |

## Hiérarchie de confiance

1. Ordre horodaté de l'autorité locale/provinciale ou de BE-Alert pour la zone exacte.
2. Centre de Crise national et services d'urgence belges.
3. Région compétente : Wallonie, Flandre ou Bruxelles.
4. Santé publique belge puis OMS Europe.
5. EFFIS pour le contexte et le suivi, jamais pour inventer une évacuation.

En cas de contradiction, le bot donne l'instruction locale la plus récente, cite son origine et son heure, ou dit qu'il ne peut pas confirmer et renvoie vers le 112/les canaux officiels.
