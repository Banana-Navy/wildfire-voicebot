import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  brusselsDate,
  fetchJson,
  fetchText,
  parseFlandersProvinceWarning,
  parseFlandersWarningApi,
  parseWalloniaAccessArticle,
  parseWalloniaGlobalAlert,
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
  Antwerpen: { fr: 'Anvers', nl: 'Antwerpen', de: 'Antwerpen' },
  Limburg: { fr: 'Limbourg', nl: 'Limburg', de: 'Limburg' },
  'Oost-Vlaanderen': { fr: 'Flandre-Orientale', nl: 'Oost-Vlaanderen', de: 'Ostflandern' },
  'Vlaams-Brabant': { fr: 'Brabant flamand', nl: 'Vlaams-Brabant', de: 'Flämisch-Brabant' },
  'West-Vlaanderen': { fr: 'Flandre-Occidentale', nl: 'West-Vlaanderen', de: 'Westflandern' },
};

const riskLabels = {
  groen: { fr: 'vert — faible danger', nl: 'groen — weinig brandgevaar', de: 'grün — geringe Waldbrandgefahr' },
  geel: { fr: 'jaune — danger d’incendie', nl: 'geel — brandgevaar', de: 'gelb — Waldbrandgefahr' },
  oranje: { fr: 'orange — danger élevé', nl: 'oranje — hoog brandgevaar', de: 'orange — hohe Waldbrandgefahr' },
  rood: { fr: 'rouge — danger extrêmement élevé', nl: 'rood — extreem hoog brandgevaar', de: 'rot — extrem hohe Waldbrandgefahr' },
};

const flandersStatuses = {};
const flandersWarningsUrl = 'https://www.natuurenbos.be/waarschuwingen';
const flandersWarningsHtml = await fetchText(flandersWarningsUrl);
for (const [provinceSlug, province] of flandersSources) {
  let { code, officialTextNl } = parseFlandersProvinceWarning(flandersWarningsHtml, provinceSlug);
  let sourceMode = 'public_warning_page';
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
      fr: `Pour la province de ${label.fr}, le code officiel du jour est ${riskLabels[code].fr}. Ce code ne confirme pas à lui seul l’ouverture de chaque forêt ou zone naturelle. ${dailyNotice.fr}`,
      nl: `Voor de provincie ${label.nl} geldt vandaag officieel code ${riskLabels[code].nl}. Deze code bevestigt op zichzelf niet dat elk bos of natuurgebied toegankelijk is. ${dailyNotice.nl}`,
      de: `Für die Provinz ${label.de} gilt heute offiziell die Stufe ${riskLabels[code].de}. Dieser Code bestätigt für sich allein nicht, dass jedes Wald- oder Naturgebiet zugänglich ist. ${dailyNotice.de}`,
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

if (hasWildfireAlert && activeAlertHref) {
  walloniaArticleUrl = new URL(activeAlertHref, walloniaNewsUrl).href;
  walloniaArticleHtml = await fetchText(walloniaArticleUrl);
  const parsedArticle = parseWalloniaAccessArticle(walloniaArticleHtml);
  walloniaArticleUpdatedAt = parsedArticle.updatedAt;
  walloniaExtracts = parsedArticle.extracts;
  if (walloniaExtracts.length === 0) {
    throw new Error(`Alerte incendie wallonne détectée mais aucune mesure d’accès n’a pu être extraite de ${walloniaArticleUrl}.`);
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
  access: {
    rule: hasWildfireAlert
      ? 'N’affirmer une interdiction, une fermeture ou une autorisation que si le lieu demandé est explicitement nommé dans les extraits officiels actuels. Ne jamais étendre un périmètre par déduction.'
      : 'Aucune mesure régionale active n’est publiée dans le bandeau officiel suivi. Cela ne confirme pas l’ouverture d’un site et n’exclut pas une décision communale ou locale.',
    no_match_rule: 'Si le lieu n’est pas explicitement nommé, dire qu’aucune mesure régionale correspondante n’a été trouvée dans la publication du jour, sans affirmer que le lieu est ouvert.',
  },
  daily_change_notice: dailyNotice,
  source: {
    authority: 'Service public de Wallonie',
    index_url: walloniaNewsUrl,
    article_url: walloniaArticleUrl,
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
  for (const alias of unique([entry.canonical_name, ...entry.aliases])) {
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
