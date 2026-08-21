# Accès quotidien officiel et niveaux de vigilance

## Résultat attendu

Pour une question comme « Puis-je aller à la Kalmthoutse Heide aujourd'hui ? » ou « La N68 est-elle accessible ? », l'agent :

1. reconnaît le lieu dans la langue de l'appelant ;
2. lit le statut officiel frais correspondant ;
3. donne directement le niveau ou la mesure explicitement publiée ;
4. si aucune interdiction recensée ne nomme le lieu, le dit sans en déduire que le lieu est ouvert ;
5. demande une vérification auprès de la commune ou du gestionnaire local avant le déplacement, car une consigne peut évoluer en cours de journée.

Il ne renvoie pas l'appelant vers un site lorsqu'une réponse officielle fraîche est disponible. Il ne transforme jamais un code de risque en confirmation d'ouverture.

## Collecte quotidienne

Le workflow [`.github/workflows/refresh-daily-access.yml`](../.github/workflows/refresh-daily-access.yml) s'exécute chaque jour à `04:15 UTC`, soit `06:15` en heure d'été belge et `05:15` en heure d'hiver. Il peut aussi être déclenché manuellement.

Le collecteur [`scripts/update-daily-access-status.mjs`](../scripts/update-daily-access-status.mjs) :

- lit les cinq codes provinciaux publiés par l'Agentschap voor Natuur en Bos ;
- ouvre la page flamande avec Chromium lorsque le site officiel présente son challenge JavaScript aux IP de l'automatisation ;
- recherche une alerte incendie active dans le bandeau officiel wallon et extrait uniquement les paragraphes portant sur l'accès, la circulation, les fermetures ou les retours ;
- publie la limite de couverture bruxelloise sans inventer de code quotidien ;
- refuse de publier si une structure obligatoire disparaît ou devient invalide ;
- remplace l'instantané précédent seulement après validation complète.

Chaque fichier expose `valid_for_date`, `retrieved_at`, `fresh_until` et `source_health`. Le délai maximal est de 36 heures afin d'absorber un retard ponctuel du cron sans faire passer une ancienne information pour celle du jour. L'agent exige en plus que `valid_for_date` corresponde au jour courant en Belgique.

## Sources variables suivies

- Flandre : `https://www.natuurenbos.be/waarschuwingen`
- Explication des codes flamands : `https://www.vlaanderen.be/natuur-milieu-en-klimaat/bomen-en-planten/brandpreventie-in-bossen-en-natuurgebieden-in-vlaanderen`
- Wallonie : `https://www.wallonie.be/fr/actualites`, puis l'article lié par le bandeau d'alerte officiel lorsqu'il concerne un incendie de végétation
- Bruxelles : règles publiées par Bruxelles Environnement pour la Forêt de Soignes ; aucune ouverture quotidienne n'est déduite de cette source stable

Une interdiction locale communale absente de ces sources centrales peut donc ne pas être couverte. Dans ce cas, l'agent dit que le lieu ne figure pas parmi les interdictions d'accès recensées dans les informations vérifiées aujourd'hui, précise que cela ne confirme pas son ouverture et demande une vérification locale avant le déplacement.

## Reconnaissance des lieux

Le registre [`config/place-registry.json`](../config/place-registry.json) est construit par [`scripts/refresh-place-registry.mjs`](../scripts/refresh-place-registry.mjs) depuis :

- la nomenclature officielle REFNIS de Statbel pour les communes et provinces ;
- le catalogue des domaines naturels de l'Agentschap voor Natuur en Bos ;
- les couches de conservation de la nature du géoportail du SPW ;
- quelques variantes linguistiques et lieux fonctionnels explicitement suivis, par exemple Hautes Fagnes, Hohes Venn, Hoge Venen, barrages, routes et cantonnements nommés.

Les accents, apostrophes et espaces sont normalisés pour la recherche, mais le nom officiel est conservé pour la réponse. Si un nom correspond réellement à plusieurs juridictions, l'agent demande uniquement la commune ou la province. Si un lieu nommé ne peut pas être résolu, il ne pose plus cette question automatiquement : il consulte le statut national de repli, conserve le nom entendu et donne la réponse prudente prévue pour les publications centrales du jour.

## Outils de l'agent

L'agent appelle silencieusement deux webhooks en séquence :

1. `resolve_official_place` retourne le lieu, son autorité et un `status_key` ;
2. `get_daily_access_status` retourne le niveau, les mesures officielles, leur date et leur fraîcheur.

Les fichiers sont servis sous `https://banana-navy.github.io/wildfire-voicebot/data/access`.

## Règles de sécurité

- Flandre : le code provincial est donné, mais l'ouverture d'une forêt individuelle n'est jamais affirmée sans mesure explicite.
- Wallonie : une interdiction n'est appliquée qu'aux lieux ou périmètres nommés dans le texte officiel du jour.
- Repli national : il couvre les publications centrales suivies mais ne constitue pas une liste exhaustive des décisions communales ou des gestionnaires locaux.
- Bruxelles : en l'absence de statut quotidien centralisé suivi, aucune accessibilité actuelle n'est confirmée.
- Source périmée, inaccessible, ambiguë ou invalide : l'agent refuse de confirmer l'accès ou le niveau.
- Une fermeture routière peut être restituée, mais aucun itinéraire alternatif n'est inventé.

## Exploitation

Commandes locales :

```sh
npm run test:access-data
npm run refresh:place-registry
npm run refresh:daily-access
npm run validate:daily-access
npm run build
```

Le registre de lieux est versionné. Les instantanés quotidiens sous `public/data/access/` sont générés pendant le déploiement et ignorés par Git afin d'éviter de conserver des statuts périmés dans le dépôt.
