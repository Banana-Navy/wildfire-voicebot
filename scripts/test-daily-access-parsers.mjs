import assert from 'node:assert/strict';
import {
  parseFlandersProvinceWarning,
  parseFlandersWarningApi,
  parseWalloniaAccessArticle,
  parseWalloniaGlobalAlert,
  parseWalloniaTranslationLinks,
  slugify,
} from './lib/access-data.mjs';

const flandersFixture = `
  <div class="anb-waarschuwing--provincie views-row">
    <a href="/waarschuwingen/antwerpen">Antwerpen</a>
    <span class="anb-waarschuwing__status" status="oranje"></span>
    <div class="anb-waarschuwing__content__description">
      <p>Het is erg droog en brandgevaarlijk in natuurgebieden.</p>
      <p>Vuur maken is verboden.</p>
    </div></div>
  </div>
  <div class="anb-waarschuwing--provincie views-row">
    <a href="/waarschuwingen/limburg">Limburg</a>
    <span class="anb-waarschuwing__status" status="geel"></span>
    <div class="anb-waarschuwing__content__description"><p>Er is brandgevaar.</p></div></div>
  </div>`;

const antwerpen = parseFlandersProvinceWarning(flandersFixture, 'antwerpen');
assert.equal(antwerpen.code, 'oranje');
assert.match(antwerpen.officialTextNl, /erg droog/i);
assert.doesNotMatch(antwerpen.officialTextNl, /Limburg/);

const apiWarning = parseFlandersWarningApi([{
  status_lower: 'oranje',
  text: 'Het is erg droog en brandgevaarlijk in natuurgebieden.',
}]);
assert.equal(apiWarning.code, 'oranje');
assert.match(apiWarning.officialTextNl, /brandgevaarlijk/i);

const walloniaIndexFixture = `
  <div id="spw-global-alert"><div>
    <a href="/fr/actualites/incendie-dans-les-fagnes">Incendie dans les Hautes Fagnes</a>
  </div></div>`;
const alert = parseWalloniaGlobalAlert(walloniaIndexFixture);
assert.equal(alert.hasWildfireAlert, true);
assert.equal(alert.href, '/fr/actualites/incendie-dans-les-fagnes');

const walloniaArticleFixture = `
  <time datetime="2026-08-19T12:00:00Z">Mis à jour le 19 août</time>
  <h2><spw-link href="/de/brand-im-hohen-venn" target="_blank">Klicken Sie hier, um die Meldung auf Deutsch anzuzeigen</spw-link></h2>
  <p>La circulation du public dans les forêts et réserves naturelles du périmètre est interdite.</p>
  <p>Ce périmètre concerne les cantonnements forestiers de Verviers, Malmedy et Elsenborn. Ces mesures d'interdiction restent applicables.</p>
  <li>Les routes N68, N672 et N676 sont fermées à la circulation.</li>
  <p>Un paragraphe sans mesure d'accès ne doit pas être repris.</p>
  <aside><p>L'accès à une ancienne zone est interdit.</p></aside>`;
const article = parseWalloniaAccessArticle(walloniaArticleFixture);
assert.equal(article.updatedAt, '2026-08-19T12:00:00Z');
assert.equal(article.extracts.length, 3);
assert.match(article.extracts[0], /circulation du public/i);
assert.match(article.extracts[2], /N68/);
assert.deepEqual(parseWalloniaTranslationLinks(walloniaArticleFixture), {
  de: '/de/brand-im-hohen-venn',
});

const germanArticleFixture = `
  <time datetime="2026-08-19T12:00:00Z">Aktualisiert am 19. August</time>
  <p>Der Zugang zu den Wäldern und Naturschutzgebieten im Perimeter ist untersagt.</p>
  <p>Die Forstämter Verviers, Malmedy und Elsenborn sind betroffen.</p>
  <li>Die Straßen N68 und N672 sind für den Verkehr gesperrt.</li>
  <p>Am Wochenende mussten Unterkünfte in Waimes und Bütgenbach evakuiert werden.</p>`;
const germanArticle = parseWalloniaAccessArticle(germanArticleFixture);
assert.equal(germanArticle.extracts.length, 3);
assert.match(germanArticle.extracts[0], /Zugang/);
assert.match(germanArticle.extracts[2], /gesperrt/);

assert.equal(slugify('Forêt de Soignes'), 'foret-de-soignes');
assert.equal(slugify('Barrage d\'Eupen'), 'barrage-d-eupen');

console.log(JSON.stringify({ tests: 17, result: 'ok' }, null, 2));
