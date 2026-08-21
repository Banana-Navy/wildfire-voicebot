import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  fetchJson,
  fetchText,
  placeAliases,
  provinceStatusKey,
  slugify,
  stripHtml,
  unique,
} from './lib/access-data.mjs';

if (!process.argv.includes('--confirm')) {
  throw new Error('Ajoutez --confirm pour régénérer le registre officiel des lieux.');
}

const root = resolve(import.meta.dirname, '..');
const registryPath = resolve(root, 'config/place-registry.json');
const entries = [];

function addEntry(entry) {
  const aliases = unique(entry.aliases.flatMap((alias) => placeAliases(alias)));
  entries.push({ ...entry, aliases });
}

function parseRefnis(csv) {
  let region = null;
  let provinceFr = null;
  let provinceNl = null;
  const municipalities = [];
  for (const rawLine of csv.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const [code, nameFr, language, , nameNl] = rawLine.split('|');
    if (!/^\d{5}$/.test(code ?? '')) continue;
    if (/RÉGION DE BRUXELLES-CAPITALE/i.test(nameFr)) region = 'Bruxelles';
    if (/RÉGION FLAMANDE/i.test(nameFr)) region = 'Flandre';
    if (/RÉGION WALLONNE/i.test(nameFr)) region = 'Wallonie';
    if (/^Province /i.test(nameFr)) {
      provinceFr = nameFr.replace(/^Province (?:de |du |d')/i, '');
      provinceNl = nameNl.replace(/^Provincie /i, '');
      const statusKey = region === 'Flandre' ? provinceStatusKey(provinceNl) : 'wallonia-regional';
      if (statusKey) {
        municipalities.push({
          id: `statbel-province-${code}`,
          canonical_name: region === 'Flandre' ? provinceNl : provinceFr,
          aliases: unique([provinceFr, provinceNl, nameFr, nameNl]),
          category: 'province',
          region,
          province: provinceFr,
          province_nl: provinceNl,
          status_key: statusKey,
          source_url: 'https://statbel.fgov.be/fr/propos-de-statbel/methodologie/classifications/geographie',
        });
      }
      continue;
    }
    if (!language) continue;
    const statusKey = region === 'Flandre'
      ? provinceStatusKey(provinceNl)
      : region === 'Wallonie'
        ? 'wallonia-regional'
        : 'brussels-regional';
    municipalities.push({
      id: `statbel-${code}`,
      canonical_name: region === 'Flandre' ? nameNl : nameFr,
      aliases: unique([nameFr, nameNl]),
      category: 'municipality',
      region,
      province: region === 'Bruxelles' ? null : provinceFr,
      province_nl: region === 'Bruxelles' ? null : provinceNl,
      status_key: statusKey,
      source_url: 'https://statbel.fgov.be/fr/propos-de-statbel/methodologie/classifications/geographie',
    });
  }
  return municipalities;
}

const refnisUrl =
  'https://statbel.fgov.be/sites/default/files/Over_Statbel_FR/Nomenclaturen/REFNIS_2025.csv';
for (const municipality of parseRefnis(await fetchText(refnisUrl))) addEntry(municipality);

const anbAreaLinks = new Map();
for (let page = 0; page <= 6; page += 1) {
  const html = await fetchText(`https://natuurenbos.be/natuurgebieden?page=${page}`);
  const pattern = /<h3><a href="(\/natuurgebieden\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h3>/gi;
  for (const match of html.matchAll(pattern)) {
    anbAreaLinks.set(match[1], stripHtml(match[2]));
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const anbAreas = await mapWithConcurrency([...anbAreaLinks], 6, async ([path, name]) => {
  const sourceUrl = `https://natuurenbos.be${path}`;
  const html = await fetchText(sourceUrl);
  const provinceMatch = html.match(/anb-natuurgebied__provincie[^>]*>([\s\S]*?)<\/div>/i);
  const province = provinceMatch ? stripHtml(provinceMatch[1]) : null;
  const provinceKeys = unique((province ?? '').split(',').map((value) => provinceStatusKey(value.trim())));
  const statusKey = provinceKeys.length === 1 ? provinceKeys[0] : provinceKeys.length > 1 ? 'flanders-all' : null;
  if (!statusKey) throw new Error(`Province ANB introuvable pour ${name} (${sourceUrl}).`);
  return {
    id: `anb-${slugify(path)}`,
    canonical_name: name,
    aliases: [name],
    category: 'anb_natural_area',
    region: 'Flandre',
    province,
    province_nl: province,
    status_key: statusKey,
    source_url: sourceUrl,
  };
});
for (const area of anbAreas) addEntry(area);

const walloniaLayers = [
  [1, 'forest_reserve'],
  [2, 'state_nature_reserve'],
  [3, 'approved_nature_reserve'],
  [4, 'wetland_of_biological_interest'],
  [5, 'natural_park'],
  [6, 'ramsar_site'],
];
for (const [layerId, category] of walloniaLayers) {
  const query = new URL(
    `https://geoservices.wallonie.be/arcgis/rest/services/FAUNE_FLORE/CONSNAT/MapServer/${layerId}/query`,
  );
  query.searchParams.set('where', '1=1');
  query.searchParams.set('outFields', '*');
  query.searchParams.set('returnGeometry', 'false');
  query.searchParams.set('resultRecordCount', '2000');
  query.searchParams.set('f', 'json');
  const payload = await fetchJson(query);
  if (payload.error) throw new Error(`ArcGIS Wallonie couche ${layerId}: ${JSON.stringify(payload.error)}`);
  for (const [index, feature] of (payload.features ?? []).entries()) {
    const name = feature.attributes?.NOM?.trim();
    if (!name) continue;
    addEntry({
      id: `spw-${layerId}-${feature.attributes?.CODESITE || index}`,
      canonical_name: name,
      aliases: [name],
      category,
      region: 'Wallonie',
      province: null,
      province_nl: null,
      status_key: 'wallonia-regional',
      source_url: feature.attributes?.URL ||
        'https://geoportail.wallonie.be/catalogue/435c454c-0d4b-41cf-a136-a1aba134d9ac.html',
    });
  }
}

for (const extra of [
  ['Hautes Fagnes', ['Haute Fagne', 'Hohes Venn', 'Hoge Venen']],
  ['Fagne de Malchamps', ['Malchamps']],
  ['Domaine de Bérinzenne', ['Bérinzenne', 'Berinzenne']],
  ["Barrage d'Eupen", ['Barrage de la Vesdre', 'Eupener Talsperre']],
  ['Barrage de la Gileppe', ['La Gileppe', 'Gileppe']],
  ['Küchelscheid', ['Kuchelscheid']],
  ['Leykaul', []],
  ['Sourbrodt', []],
  ['Route N68', ['N68']],
  ['Route N672', ['N672']],
  ['Route N676', ['N676']],
  ['Cantonnement forestier de Verviers', ['Cantonnement de Verviers']],
  ['Cantonnement forestier de Malmedy', ['Cantonnement de Malmedy']],
  ['Cantonnement forestier d\'Elsenborn', ['Cantonnement d\'Elsenborn']],
]) {
  addEntry({
    id: `curated-wallonia-${slugify(extra[0])}`,
    canonical_name: extra[0],
    aliases: [extra[0], ...extra[1]],
    category: 'current_measure_location',
    region: 'Wallonie',
    province: 'Liège',
    province_nl: 'Luik',
    status_key: 'wallonia-regional',
    source_url: 'https://www.wallonie.be/fr/actualites',
  });
}

addEntry({
  id: 'curated-wallonia-baraque-de-fraiture',
  canonical_name: 'Baraque de Fraiture',
  aliases: [
    'Baraque de Fraiture',
    'Baraque Fraiture',
    'Station de la Baraque de Fraiture',
    'Plateau de la Baraque de Fraiture',
  ],
  category: 'named_natural_area',
  region: 'Wallonie',
  province: 'Luxembourg',
  province_nl: 'Luxemburg',
  municipality: 'Vielsalm',
  status_key: 'wallonia-regional',
  source_url: 'https://www.vielsalm.be/bouger-et-decouvir-a-vielsalm/tourisme/decouvrir-vielsalm/presentation',
});

for (const extra of [
  ['Forêt de Soignes', ['Zoniënwoud', 'Sonian Forest']],
  ['Bois de la Cambre', ['Ter Kamerenbos']],
  ['Rouge-Cloître', ['Rood-Klooster', 'Rouge Cloitre']],
]) {
  addEntry({
    id: `curated-brussels-${slugify(extra[0])}`,
    canonical_name: extra[0],
    aliases: [extra[0], ...extra[1]],
    category: 'brussels_natural_area',
    region: 'Bruxelles',
    province: null,
    province_nl: null,
    status_key: 'brussels-regional',
    source_url: 'https://environnement.brussels/citoyen/documentation-et-outils/etat-des-lieux-de-lenvironnement/foret-de-soignes',
  });
}

entries.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name, 'fr'));
await mkdir(resolve(root, 'config'), { recursive: true });
await writeFile(registryPath, `${JSON.stringify({
  schema_version: 1,
  generated_at: new Date().toISOString(),
  sources: [refnisUrl, 'https://natuurenbos.be/natuurgebieden',
    'https://geoportail.wallonie.be/catalogue/435c454c-0d4b-41cf-a136-a1aba134d9ac.html'],
  entries,
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  registry: registryPath,
  entries: entries.length,
  municipalities: entries.filter(({ category }) => category === 'municipality').length,
  anb_natural_areas: entries.filter(({ category }) => category === 'anb_natural_area').length,
  walloon_natural_areas: entries.filter(({ id }) => id.startsWith('spw-')).length,
}, null, 2));
