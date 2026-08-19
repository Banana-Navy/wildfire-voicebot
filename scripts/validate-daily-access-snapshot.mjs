import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brusselsDate } from './lib/access-data.mjs';

const root = resolve(import.meta.dirname, '..');
const base = resolve(root, 'public/data/access');
const readJson = async (...parts) => JSON.parse(await readFile(resolve(base, ...parts), 'utf8'));

const manifest = await readJson('manifest.json');
assert.equal(manifest.valid_for_date, brusselsDate(), 'Le snapshot ne correspond pas au jour belge courant.');
assert.ok(Date.parse(manifest.fresh_until) > Date.now(), 'Le snapshot est déjà périmé.');
assert.equal(manifest.source_health.flanders, 'ok');
assert.equal(manifest.source_health.wallonia, 'ok');
assert.ok(manifest.coverage.place_records >= 1_500, 'Le registre de lieux a perdu une partie importante de sa couverture.');
assert.ok(manifest.coverage.resolvable_aliases >= 1_700, 'Le registre ne contient plus assez de variantes de noms.');

const allowedCodes = new Set(['groen', 'geel', 'oranje', 'rood']);
for (const province of ['antwerpen', 'limburg', 'oost-vlaanderen', 'vlaams-brabant', 'west-vlaanderen']) {
  const status = await readJson('status', `flanders-${province}.json`);
  assert.equal(status.valid_for_date, manifest.valid_for_date);
  assert.equal(status.source_health, 'ok');
  assert.ok(allowedCodes.has(status.official_risk.code), `Code flamand invalide pour ${province}.`);
  assert.equal(status.access.individually_confirmed_open, false);
  assert.match(status.direct_answer.fr, /Respectez la signalétique/);
  assert.match(status.direct_answer.nl, /Volg de plaatselijke signalisatie/);
  assert.match(status.direct_answer.de, /Beachten Sie die örtliche Beschilderung/);
}

const wallonia = await readJson('status', 'wallonia-regional.json');
assert.equal(wallonia.valid_for_date, manifest.valid_for_date);
assert.equal(wallonia.source_health, 'ok');
assert.ok(Array.isArray(wallonia.official_access_extracts_fr));
assert.ok(Array.isArray(wallonia.official_access_extracts_de));
assert.match(wallonia.access.no_match_answer_template.fr, /ni confirmer son accès, ni affirmer/);
assert.match(wallonia.access.no_match_answer_template.nl, /niet bevestigen/);
assert.match(wallonia.access.no_match_answer_template.de, /weder bestätigen/);
assert.ok(wallonia.access.scope_limited_places.includes('Hautes Fagnes'));
assert.match(wallonia.access.scope_limited_answer_template.fr, /statut de toute cette zone/);
assert.match(wallonia.access.scope_limited_answer_template.de, /Status des gesamten Gebiets/);
assert.match(wallonia.access.action_templates.closed_natural_area.de, /Betreten Sie das Gebiet nicht/);
if (wallonia.active_wildfire_alert) {
  assert.ok(wallonia.official_access_extracts_fr.length > 0, 'Alerte wallonne sans mesure extraite.');
  if (wallonia.source.article_url_de) {
    assert.ok(wallonia.official_access_extracts_de.length > 0, 'Traduction allemande sans mesure extraite.');
  }
}

const expectedPlaces = {
  'kalmthoutse-heide': 'flanders-antwerpen',
  'hautes-fagnes': 'wallonia-regional',
  'hohes-venn': 'wallonia-regional',
  n68: 'wallonia-regional',
  anvers: 'flanders-antwerpen',
  'foret-de-chimay': 'wallonia-regional',
};
for (const [slug, statusKey] of Object.entries(expectedPlaces)) {
  const place = await readJson('places', `${slug}.json`);
  assert.equal(place.found, true, `${slug} n'est plus résolu.`);
  assert.equal(place.ambiguous, false, `${slug} est devenu ambigu.`);
  assert.equal(place.status_key, statusKey);
}

const ambiguousPlace = await readJson('places', 'zonienwoud.json');
assert.equal(ambiguousPlace.found, false);
assert.equal(ambiguousPlace.ambiguous, true);
assert.ok(ambiguousPlace.candidates.length >= 2);

console.log(JSON.stringify({
  result: 'ok',
  valid_for_date: manifest.valid_for_date,
  place_records: manifest.coverage.place_records,
  resolvable_aliases: manifest.coverage.resolvable_aliases,
  wallonia_active_alert: manifest.wallonia_active_alert,
}, null, 2));
