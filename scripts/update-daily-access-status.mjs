import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  brusselsDate,
  fetchBrowserText,
  fetchJson,
  fetchText,
  parseFlandersProvinceWarning,
  parseFlandersWarningApi,
  parseWalloniaAccessArticle,
  parseWalloniaGlobalAlert,
  parseWalloniaTranslationLinks,
  slugify,
  STATUS_BASE_URL,
  unique,
} from './lib/access-data.mjs';

const root = resolve(import.meta.dirname, '..');
const registry = JSON.parse(await readFile(resolve(root, 'config/place-registry.json'), 'utf8'));
const generatedAt = new Date();
const generatedAtIso = generatedAt.toISOString();
const validForDate = brusselsDate(generatedAt);
const finalDirectory = resolve(root, 'public/data/access');
const stagingDirectory = resolve(root, `public/data/access-staging-${process.pid}`);
const placesDirectory = resolve(stagingDirectory, 'places');
const statusDirectory = resolve(stagingDirectory, 'status');

await rm(stagingDirectory, { recursive: true, force: true });
await mkdir(placesDirectory, { recursive: true });
await mkdir(statusDirectory, { recursive: true });

const dailyNotice = {
  fr: 'Cette information est vérifiée aujourd’hui auprès de la source officielle et peut changer chaque jour selon les consignes des autorités.',
  nl: 'Deze informatie is vandaag gecontroleerd bij de officiële bron en kan elke dag wijzigen volgens de richtlijnen van de overheid.',
  de: 'Diese Information wurde heute anhand der offiziellen Quelle geprüft und kann sich täglich entsprechend den behördlichen Anweisungen ändern.',
};

const flandersSources = [
  ['antwerpen', 'Antwerpen'],
  ['limburg', 'Limburg'],
  ['oost-vlaanderen', 'Oost-Vlaanderen'],
  ['vlaams-brabant', 'Vlaams-Brabant'],
  ['west-vlaanderen', 'West-Vlaanderen'],
];

const provinceLabels = {
  Antwerpen: { fr: 'd’Anvers', nl: 'Antwerpen', de: 'Antwerpen' },
  Limburg: { fr: 'du Limbourg', nl: 'Limburg', de: 'Limburg' },
  'Oost-Vlaanderen': { fr: 'de Flandre-Orientale', nl: 'Oost-Vlaanderen', de: 'Ostflandern' },
  'Vlaams-Brabant': { fr: 'du Brabant flamand', nl: 'Vlaams-Brabant', de: 'Flämisch-Brabant' },
  'West-Vlaanderen': { fr: 'de Flandre-Occidentale', nl: 'West-Vlaanderen', de: 'Westflandern' },
};

const riskLabels = {
  groen: { fr: 'vert — faible danger', nl: 'groen — weinig brandgevaar', de: 'grün — geringe Waldbrandgefahr' },
  geel: { fr: 'jaune — danger d’incendie', nl: 'geel — brandgevaar', de: 'gelb — Waldbrandgefahr' },
  oranje: { fr: 'orange — danger élevé', nl: 'oranje — hoog brandgevaar', de: 'orange — hohe Waldbrandgefahr' },
  rood: { fr: 'rouge — danger extrêmement élevé', nl: 'rood — extreem hoog brandgevaar', de: 'rot — extrem hohe Waldbrandgefahr' },
};

const flandersStatuses = {};
const flandersWarningsUrl = 'https://www.natuurenbos.be/waarschuwingen';
let flandersWarningsHtml = await fetchText(flandersWarningsUrl);
let flandersPageMode = 'direct_http';
const initialFlanders = parseFlandersProvinceWarning(flandersWarningsHtml, 'antwerpen');
if (!riskLabels[initialFlanders.code] || initialFlanders.officialTextNl.length < 20) {
  flandersWarningsHtml = await fetchBrowserText(flandersWarningsUrl, {
    selector: 'a[href="/waarschuwingen/antwerpen"]',
  });
  flandersPageMode = 'official_page_browser';
}
for (const [provinceSlug, province] of flandersSources) {
  let { code, officialTextNl } = parseFlandersProvinceWarning(flandersWarningsHtml, provinceSlug);
  let sourceMode = flandersPageMode;
  let apiUrl = null;
  if (!riskLabels[code] || officialTextNl.length < 20) {
    apiUrl = `https://natuurenbos.be/api/anb/waarschuwingen?provincie=${provinceSlug}`;
    ({ code, officialTextNl } = parseFlandersWarningApi(await fetchJson(apiUrl)));
    sourceMode = 'official_api_fallback';
  }
  if (!riskLabels[code] || officialTextNl.length < 20) {
    throw new Error(`Code flamand absent ou invalide pour ${province} sur ${flandersWarningsUrl}.`);
  }
  const statusKey = `flanders-${provinceSlug}`;
  const label = provinceLabels[province];
  flandersStatuses[statusKey] = {
    schema_version: 1,
    status_key: statusKey,
    valid_for_date: validForDate,
    retrieved_at: generatedAtIso,
    fresh_until: new Date(generatedAt.getTime() + 36 * 60 * 60 * 1000).toISOString(),
    source_health: 'ok',
    jurisdiction: { region: 'Flandre', type: 'province', name: province },
    official_risk: {
      system: 'Agentschap voor Natuur en Bos — code provincial quotidien',
      code,
      label: riskLabels[code],
      official_text_nl: officialTextNl,
    },
    access: {
      individually_confirmed_open: false,
      individually_confirmed_closed: false,
      rule: 'Un code de risque provincial ne suffit jamais à confirmer l’ouverture d’un site individuel. Une fermeture locale et la signalétique sur place restent prioritaires.',
      red_code_rule: code === 'rood'
        ? 'Le code rouge déconseille l’accès aux forêts et zones naturelles; il ne constitue pas à lui seul la liste des sites juridiquement fermés.'
        : null,
    },
    direct_answer: {
      fr: `Pour la province ${label.fr}, le code officiel du jour est ${riskLabels[code].fr}. Ce code ne confirme pas à lui seul l’ouverture de chaque forêt ou zone naturelle. Respectez la signalétique locale et toute fermeture. ${dailyNotice.fr}`,
      nl: `Voor de provincie ${label.nl} geldt vandaag officieel code ${riskLabels[code].nl}. Deze code bevestigt op zichzelf niet dat elk bos of natuurgebied toegankelijk is. Volg de plaatselijke signalisatie en elke afsluiting. ${dailyNotice.nl}`,
      de: `Für die Provinz ${label.de} gilt heute offiziell die Stufe ${riskLabels[code].de}. Dieser Code bestätigt für sich allein nicht, dass jedes Wald- oder Naturgebiet zugänglich ist. Beachten Sie die örtliche Beschilderung und jede Sperrung. ${dailyNotice.de}`,
    },
    source: {
      authority: 'Agentschap voor Natuur en Bos — Vlaamse overheid',
      url: flandersWarningsUrl,
      api_url: apiUrl,
      retrieval_mode: sourceMode,
      explanatory_url: 'https://www.vlaanderen.be/natuur-milieu-en-klimaat/bomen-en-planten/brandpreventie-in-bossen-en-natuurgebieden-in-vlaanderen',
    },
  };
}

const walloniaNewsUrl = 'https://www.wallonie.be/fr/actualites';
const walloniaIndexHtml = await fetchText(walloniaNewsUrl);
const {
  href: activeAlertHref,
  hasWildfireAlert,
} = parseWalloniaGlobalAlert(walloniaIndexHtml);
let walloniaArticleUrl = null;
let walloniaArticleHtml = null;
let walloniaArticleUpdatedAt = null;
let walloniaExtracts = [];
let walloniaArticleUrlDe = null;
let walloniaExtractsDe = [];

if (hasWildfireAlert && activeAlertHref) {
  walloniaArticleUrl = new URL(activeAlertHref, walloniaNewsUrl).href;
  walloniaArticleHtml = await fetchText(walloniaArticleUrl);
  const parsedArticle = parseWalloniaAccessArticle(walloniaArticleHtml);
  walloniaArticleUpdatedAt = parsedArticle.updatedAt;
  walloniaExtracts = parsedArticle.extracts;
  if (walloniaExtracts.length === 0) {
    throw new Error(`Alerte incendie wallonne détectée mais aucune mesure d’accès n’a pu être extraite de ${walloniaArticleUrl}.`);
  }
  const translationLinks = parseWalloniaTranslationLinks(walloniaArticleHtml);
  if (translationLinks.de) {
    walloniaArticleUrlDe = new URL(translationLinks.de, walloniaArticleUrl).href;
    walloniaExtractsDe = parseWalloniaAccessArticle(await fetchText(walloniaArticleUrlDe)).extracts;
    if (walloniaExtractsDe.length === 0) {
      throw new Error(`Traduction officielle allemande détectée mais aucune mesure d’accès n’a pu être extraite de ${walloniaArticleUrlDe}.`);
    }
  }
}

const walloniaStatus = {
  schema_version: 1,
  status_key: 'wallonia-regional',
  valid_for_date: validForDate,
  retrieved_at: generatedAtIso,
  fresh_until: new Date(generatedAt.getTime() + 36 * 60 * 60 * 1000).toISOString(),
  source_health: 'ok',
  jurisdiction: { region: 'Wallonie', type: 'regional_and_named_local_measures', name: 'Wallonie' },
  official_risk: {
    system: 'Aucun code couleur régional quotidien centralisé n’est publié dans la source suivie.',
    code: null,
  },
  active_wildfire_alert: hasWildfireAlert,
  official_access_extracts_fr: walloniaExtracts,
  official_access_extracts_de: walloniaExtractsDe,
  access: {
    rule: hasWildfireAlert
      ? 'N’affirmer une interdiction, une fermeture ou une autorisation que si le lieu demandé est explicitement nommé dans les extraits officiels actuels. Ne jamais étendre un périmètre par déduction.'
      : 'Aucune mesure régionale active n’est publiée dans le bandeau officiel suivi. Cela ne confirme pas l’ouverture d’un site et n’exclut pas une décision communale ou locale.',
    resolved_identity_rule: 'Déterminer l’entité demandée uniquement depuis place.canonical_name, place.aliases et place.category renvoyés par resolve_official_place. Ne jamais remplacer cette entité par un nom trouvé dans les extraits. Par exemple, la commune de Verviers reste distincte du cantonnement forestier de Verviers.',
    same_entity_rule: 'Une simple chaîne de caractères identique ne suffit pas : une mesure visant un cantonnement forestier, une route ou un barrage ne doit jamais être appliquée à la commune du même nom.',
    no_match_rule: 'Si aucune mesure ne nomme exactement la même entité que le lieu résolu, utiliser le modèle no_match_answer_template. Ne jamais dire que le lieu ne fait pas partie du périmètre, n’est pas concerné, est accessible ou est ouvert.',
    no_match_answer_template: {
      fr: 'La publication officielle vérifiée aujourd’hui ne nomme pas « {place} ». Je ne peux donc ni confirmer son accès, ni affirmer que ce lieu se trouve hors du périmètre des mesures. Respectez toute signalétique locale. Cette information peut changer chaque jour selon les consignes officielles.',
      nl: 'In de officiële publicatie die vandaag is gecontroleerd, wordt ‘{place}’ niet genoemd. Daarom kan ik de toegankelijkheid niet bevestigen en ook niet stellen dat deze plaats buiten het maatregelengebied ligt. Volg de plaatselijke signalisatie. Deze informatie kan elke dag wijzigen volgens de officiële richtlijnen.',
      de: 'In der heute geprüften offiziellen Mitteilung wird „{place}“ nicht genannt. Daher kann ich den Zugang weder bestätigen noch behaupten, dass dieser Ort außerhalb des Maßnahmengebiets liegt. Beachten Sie die örtliche Beschilderung. Diese Information kann sich täglich entsprechend den behördlichen Anweisungen ändern.',
    },
    no_match_follow_up_template: {
      fr: 'C’est exact. Je ne peux pas confirmer si « {place} » est ouvert ou fermé aujourd’hui. Respectez la signalétique locale. Cette information peut changer chaque jour selon les consignes officielles.',
      nl: 'Dat klopt. Ik kan vandaag niet bevestigen of ‘{place}’ open of gesloten is. Volg de plaatselijke signalisatie. Deze informatie kan elke dag wijzigen volgens de officiële richtlijnen.',
      de: 'Das ist richtig. Ich kann heute nicht bestätigen, ob „{place}“ geöffnet oder gesperrt ist. Beachten Sie die örtliche Beschilderung. Diese Information kann sich täglich entsprechend den behördlichen Anweisungen ändern.',
    },
    scope_limited_places: [
      'Hautes Fagnes',
      'Les Hautes Fagnes',
      'Haute Fagne',
      'Hoge Venen',
      'Hohes Venn',
      "Cantonnement forestier d'Elsenborn",
      'Cantonnement forestier de Malmedy',
      'Cantonnement forestier de Verviers',
    ],
    scope_limited_rule: 'Utiliser scope_limited_answer_template seulement si place.canonical_name ou un alias renvoyé par resolve_official_place correspond exactement à une entrée de scope_limited_places et désigne la même catégorie d’entité. Ne jamais déclencher cette règle depuis un nom trouvé dans les extraits. Pour ces zones étendues, la carte ne permet pas de déclarer toute la zone fermée ou ouverte.',
    scope_limited_answer_template: {
      fr: 'La publication officielle signale une interdiction dans un périmètre cartographié concernant « {place} », mais elle ne permet pas de confirmer le statut de toute cette zone. N’entrez dans aucune partie signalée comme interdite et respectez la signalétique locale. Cette information peut changer chaque jour selon les consignes officielles.',
      nl: 'De officiële publicatie meldt een verbod binnen een afgebakende zone rond ‘{place}’, maar bevestigt niet de status van het volledige gebied. Betreed geen deel dat als verboden is aangeduid en volg de plaatselijke signalisatie. Deze informatie kan elke dag wijzigen volgens de officiële richtlijnen.',
      de: 'Die offizielle Mitteilung nennt ein Verbot innerhalb eines kartierten Bereichs bei „{place}“, bestätigt aber nicht den Status des gesamten Gebiets. Betreten Sie keinen als gesperrt gekennzeichneten Bereich und beachten Sie die örtliche Beschilderung. Diese Information kann sich täglich entsprechend den behördlichen Anweisungen ändern.',
    },
    response_rule: 'Après un résultat quotidien frais, répondre directement sans renvoyer vers un site, une commune, une province ou d’autres canaux. Pour une relance sur un lieu non confirmé, utiliser no_match_follow_up_template sans ajout.',
    action_templates: {
      closed_natural_area: {
        fr: 'N’entrez pas dans la zone et respectez la signalétique en place.',
        nl: 'Betreed het gebied niet en volg de plaatselijke signalisatie.',
        de: 'Betreten Sie das Gebiet nicht und beachten Sie die örtliche Beschilderung.',
      },
      closed_road: {
        fr: 'N’empruntez pas cette route et respectez les déviations.',
        nl: 'Gebruik deze weg niet en volg de omleidingen.',
        de: 'Benutzen Sie diese Straße nicht und folgen Sie den Umleitungen.',
      },
      return_authorized: {
        fr: 'Suivez l’itinéraire et la signalétique indiqués par les autorités.',
        nl: 'Volg de route en de signalisatie die de overheid aangeeft.',
        de: 'Folgen Sie der von den Behörden angegebenen Route und Beschilderung.',
      },
    },
  },
  daily_change_notice: dailyNotice,
  source: {
    authority: 'Service public de Wallonie',
    index_url: walloniaNewsUrl,
    article_url: walloniaArticleUrl,
    article_url_de: walloniaArticleUrlDe,
    article_updated_at: walloniaArticleUpdatedAt,
  },
};

const brusselsStatus = {
  schema_version: 1,
  status_key: 'brussels-regional',
  valid_for_date: validForDate,
  retrieved_at: generatedAtIso,
  fresh_until: new Date(generatedAt.getTime() + 36 * 60 * 60 * 1000).toISOString(),
  source_health: 'limited',
  jurisdiction: { region: 'Bruxelles-Capitale', type: 'region', name: 'Bruxelles-Capitale' },
  official_risk: { system: 'Aucun code quotidien régional de feu de forêt n’a été identifié.', code: null },
  access: {
    individually_confirmed_open: false,
    individually_confirmed_closed: false,
    rule: 'Ne pas confirmer l’accès actuel. Les règles permanentes interdisent le feu et le barbecue en Forêt de Soignes et la signalétique locale reste prioritaire.',
  },
  daily_change_notice: dailyNotice,
  source: {
    authority: 'Bruxelles Environnement',
    url: 'https://environnement.brussels/citoyen/reglementation-et-inspection/obligations-et-autorisations/que-peut-faire-et-ne-pas-faire-dans-la-foret-de-soignes',
  },
};

const allFlandersStatus = {
  schema_version: 1,
  status_key: 'flanders-all',
  valid_for_date: validForDate,
  retrieved_at: generatedAtIso,
  source_health: 'ok',
  resolution_required: true,
  instruction: 'Le lieu couvre plusieurs provinces. Identifier la commune ou la province avant de donner le code; ne choisir aucun code par supposition.',
  provinces: Object.values(flandersStatuses).map((status) => ({
    status_key: status.status_key,
    province: status.jurisdiction.name,
    code: status.official_risk.code,
    label: status.official_risk.label,
  })),
  daily_change_notice: dailyNotice,
};

const statuses = {
  ...flandersStatuses,
  'flanders-all': allFlandersStatus,
  'wallonia-regional': walloniaStatus,
  'brussels-regional': brusselsStatus,
};

for (const [statusKey, status] of Object.entries(statuses)) {
  await writeFile(resolve(statusDirectory, `${statusKey}.json`), `${JSON.stringify(status, null, 2)}\n`, 'utf8');
}

const aliases = new Map();
for (const entry of registry.entries) {
  const baseAliases = unique([entry.canonical_name, ...entry.aliases]);
  const municipalityAliases = entry.category === 'municipality'
    ? baseAliases.flatMap((alias) => [
        `forêt de ${alias}`,
        `bois de ${alias}`,
        `forêt communale de ${alias}`,
        `zone naturelle de ${alias}`,
        `commune de ${alias}`,
        `bos van ${alias}`,
        `natuurgebied van ${alias}`,
        `gemeente ${alias}`,
        `Wald bei ${alias}`,
        `Naturgebiet bei ${alias}`,
        `Gemeinde ${alias}`,
      ])
    : [];
  for (const alias of unique([...baseAliases, ...municipalityAliases])) {
    const slug = slugify(alias);
    if (!slug) continue;
    const candidates = aliases.get(slug) ?? [];
    if (!candidates.some(({ id }) => id === entry.id)) candidates.push(entry);
    aliases.set(slug, candidates);
  }
}

for (const [slug, candidates] of aliases) {
  const equivalentCandidates = candidates.length > 1
    && new Set(candidates.map(({ status_key }) => status_key)).size === 1
    && new Set(candidates.map(({ region }) => region)).size === 1;
  const response = candidates.length === 1 || equivalentCandidates
    ? {
        schema_version: 1,
        found: true,
        ambiguous: false,
        query_slug: slug,
        place: equivalentCandidates
          ? {
              ...candidates[0],
              id: candidates.map(({ id }) => id).join('+'),
              aliases: unique(candidates.flatMap(({ aliases: values }) => values)),
              matched_official_records: candidates.length,
            }
          : candidates[0],
        status_key: candidates[0].status_key,
        status_url: `${STATUS_BASE_URL}/status/${candidates[0].status_key}.json`,
      }
    : {
        schema_version: 1,
        found: false,
        ambiguous: true,
        query_slug: slug,
        instruction: 'Demander uniquement la commune ou la province pour lever l’ambiguïté.',
        candidates: candidates.slice(0, 12).map(({ canonical_name, category, region, province, status_key }) => ({
          canonical_name, category, region, province, status_key,
        })),
      };
  await writeFile(resolve(placesDirectory, `${slug}.json`), `${JSON.stringify(response, null, 2)}\n`, 'utf8');
}

const manifest = {
  schema_version: 1,
  valid_for_date: validForDate,
  generated_at: generatedAtIso,
  fresh_until: new Date(generatedAt.getTime() + 36 * 60 * 60 * 1000).toISOString(),
  timezone: 'Europe/Brussels',
  source_health: {
    flanders: 'ok',
    wallonia: 'ok',
    brussels: 'limited',
  },
  coverage: {
    place_records: registry.entries.length,
    resolvable_aliases: aliases.size,
    status_files: Object.keys(statuses).length,
  },
  wallonia_active_alert: hasWildfireAlert,
  sources: [
    flandersWarningsUrl,
    walloniaNewsUrl,
    'https://environnement.brussels/citoyen/reglementation-et-inspection/obligations-et-autorisations/que-peut-faire-et-ne-pas-faire-dans-la-foret-de-soignes',
  ],
};
await writeFile(resolve(stagingDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

await rm(finalDirectory, { recursive: true, force: true });
await rename(stagingDirectory, finalDirectory);

console.log(JSON.stringify({
  output: finalDirectory,
  ...manifest,
  flanders_codes: Object.fromEntries(Object.values(flandersStatuses).map((status) => [
    status.jurisdiction.name, status.official_risk.code,
  ])),
  wallonia_extracts: walloniaExtracts.length,
}, null, 2));
