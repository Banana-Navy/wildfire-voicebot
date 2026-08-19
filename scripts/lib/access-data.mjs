import { setTimeout as delay } from 'node:timers/promises';

export const USER_AGENT =
  'FeuxEnMilieuNaturelBot/1.0 (+https://github.com/Banana-Navy/wildfire-voicebot; official-data-reader)';

export const STATUS_BASE_URL =
  'https://banana-navy.github.io/wildfire-voicebot/data/access';

export function decodeHtml(value = '') {
  const named = {
    amp: '&', apos: "'", quot: '"', nbsp: ' ', lt: '<', gt: '>',
    eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', ugrave: 'ù',
    ocirc: 'ô', icirc: 'î', ccedil: 'ç', rsquo: '’', ndash: '–', mdash: '—',
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

export function stripHtml(value = '') {
  return decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?(?:p|li|h[1-6]|div|blockquote|time|br|spw-[^ >]+)[^>]*>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s*\.\s*\.\s*/g, '. ')
    .replace(/\s+/g, ' ')
    .replace(/^\.\s*/, '')
    .trim();
}

export function parseFlandersProvinceWarning(html, provinceSlug) {
  const marker = `href="/waarschuwingen/${provinceSlug}"`;
  const markerIndex = html.indexOf(marker);
  const nextRowIndex = html.indexOf(
    'anb-waarschuwing--provincie views-row',
    markerIndex + marker.length,
  );
  const block = markerIndex >= 0
    ? html.slice(markerIndex, nextRowIndex >= 0 ? nextRowIndex : markerIndex + 8_000)
    : '';
  return {
    code: block.match(/anb-waarschuwing__status[^>]+status=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? null,
    officialTextNl: stripHtml(
      block.match(/anb-waarschuwing__content__description[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] ?? '',
    ),
  };
}

export function parseWalloniaGlobalAlert(html) {
  const block = html.match(/<div[^>]+id="spw-global-alert"[\s\S]*?<\/div>\s*<\/div>/i)?.[0] ?? '';
  const href = block.match(/href="([^"]+)"/i)?.[1] ?? null;
  const text = stripHtml(block);
  return {
    href,
    text,
    hasWildfireAlert: /incendie|feu.{0,20}(?:for[eê]t|fagne|milieu naturel)/i.test(text),
  };
}

export function parseWalloniaAccessArticle(html) {
  const updatedMatch = html.match(/<time[^>]+datetime="([^"]+)"[^>]*>[\s\S]*?Mis à jour[^<]*<\/time>/i)
    ?? html.match(/<time[^>]+datetime="([^"]+)"/i);
  const extracts = [];
  const currentArticleHtml = html.split(/<aside\b/i)[0];
  const blockPattern = /<(p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of currentArticleHtml.matchAll(blockPattern)) {
    const text = stripHtml(match[2]);
    const isAccessMeasure = /\b(?:acc[eè]s|circulation|ferm[eé]e?s?|interdit(?:e|es|s)?|interdiction|[eé]vacuation|r[eé]int[eé]grer|retour)\b/i.test(text);
    const namesAPlace = /\b(?:for[eê]ts?|r[eé]serves?|fagnes?|barrages?|routes?|villages?|cantonnements?|communes?|domaines?|tour panoramique|N\s?\d{2,3}|Sourbrodt|Küchelscheid|Leykaul|Bütgenbach|Waimes|Baelen|Verviers|Malmedy|Elsenborn|Eupen|Gileppe|Spa)\b/i.test(text);
    if (isAccessMeasure && namesAPlace && text.length >= 25 && text.length <= 1_200) extracts.push(text);
  }
  return {
    updatedAt: updatedMatch?.[1] ?? null,
    extracts: unique(extracts).slice(0, 40),
  };
}

export function slugify(value = '') {
  return decodeHtml(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '-')
    .replace(/&/g, ' et ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function brusselsDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function fetchText(url, { attempts = 3, timeoutMs = 25_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(attempt * 600);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Lecture impossible de ${url}: ${lastError?.message ?? 'erreur inconnue'}`);
}

export async function fetchJson(url, options) {
  const text = await fetchText(url, options);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`JSON invalide reçu de ${url}: ${error.message}`);
  }
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function placeAliases(name, extra = []) {
  const original = decodeHtml(name).replace(/\s+/g, ' ').trim();
  const withoutType = original.replace(
    /^(?:de|het|la|le|les|l'|d'|nationaal park|natuurgebied|réserve naturelle(?: domaniale| agréée)?|réserve forestière|zone humide d'intérêt biologique|parc naturel)\s+/i,
    '',
  );
  return unique([original, withoutType, ...extra]).filter((alias) => alias.length >= 3);
}

export function provinceStatusKey(province) {
  const normalized = slugify(province)
    .replace(/^province-d-?/, '')
    .replace(/^province-de-?/, '')
    .replace(/^provincie-/, '');
  const mapping = {
    antwerpen: 'flanders-antwerpen',
    anvers: 'flanders-antwerpen',
    limburg: 'flanders-limburg',
    limbourg: 'flanders-limburg',
    'oost-vlaanderen': 'flanders-oost-vlaanderen',
    'flandre-orientale': 'flanders-oost-vlaanderen',
    'vlaams-brabant': 'flanders-vlaams-brabant',
    'brabant-flamand': 'flanders-vlaams-brabant',
    'west-vlaanderen': 'flanders-west-vlaanderen',
    'flandre-occidentale': 'flanders-west-vlaanderen',
  };
  return mapping[normalized] ?? null;
}
