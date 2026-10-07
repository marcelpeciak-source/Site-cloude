// Consistency audit — things ESLint can't see. Run with `npm run consistency`.
// Checks the HTML against itself, the files on disk and the JS modules:
// anchors, ids, ARIA references, scene shapes, local assets, module imports/exports,
// section numbering, menus, accessible names, brand/contact consistency and the example pages.
import { readFile, readdir, access } from 'node:fs/promises';
import { join, dirname, normalize } from 'node:path';
import { parseHTML } from 'linkedom';
import { SHAPES } from '../js/shapes.js';
import { OWNER, render, loadExamples } from './przyklady.mjs';

const root = new URL('..', import.meta.url).pathname;
const problems = [];
const fail = (msg) => problems.push(msg);
const exists = (p) => access(p).then(() => true, () => false);

const html = await readFile(join(root, 'index.html'), 'utf8');
const { document } = parseHTML(html);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// 1. Unique ids
const ids = new Map();
for (const el of $$('[id]')) ids.set(el.id, (ids.get(el.id) || 0) + 1);
for (const [id, n] of ids) if (n > 1) fail(`duplicate id="${id}" (${n}×)`);

// 2. In-page anchors and ARIA references point at existing ids
for (const a of $$('a[href^="#"]')) {
  const id = a.getAttribute('href').slice(1);
  if (id && !ids.has(id)) fail(`link to missing #${id} ("${a.textContent.trim()}")`);
}
for (const attr of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
  for (const el of $$(`[${attr}]`)) {
    for (const id of el.getAttribute(attr).split(/\s+/)) {
      if (!ids.has(id)) fail(`${attr}="${id}" points at a missing id`);
    }
  }
}

// 3. Scene configuration
for (const el of $$('[data-scene]')) {
  const shape = el.getAttribute('data-scene');
  if (!SHAPES.includes(shape)) fail(`data-scene="${shape}" is not one of: ${SHAPES.join(', ')}`);
  for (const key of ['data-scene-x', 'data-scene-y', 'data-scene-mobile-y', 'data-scene-scale', 'data-scene-dim']) {
    const v = el.getAttribute(key);
    if (v !== null && !Number.isFinite(Number(v))) fail(`${key}="${v}" is not a number`);
  }
  const anchor = el.getAttribute('data-scene-anchor');
  if (anchor && document.querySelectorAll(anchor).length !== 1) fail(`data-scene-anchor="${anchor}" must match exactly one element`);
}

// 4. Local files referenced from the page (and from local CSS) exist
const isLocal = (u) => u && !/^(?:[a-z]+:|\/\/|#|data:)/i.test(u);
const localRefs = [
  ...$$('[src]').map((el) => el.getAttribute('src')),
  ...$$('link[href]').map((el) => el.getAttribute('href')),
];
const importMap = document.querySelector('script[type="importmap"]');
if (importMap) localRefs.push(...Object.values(JSON.parse(importMap.textContent).imports || {}));
for (const ref of localRefs.filter(isLocal)) {
  if (!(await exists(join(root, ref)))) fail(`missing file: ${ref}`);
}
for (const css of ['css/style.css', 'vendor/fonts.css', 'vendor/lenis.css']) {
  // Drop inline data: URIs first — an SVG inside one may contain url(#…) references of its own.
  const text = (await readFile(join(root, css), 'utf8')).replace(/url\(\s*(['"])data:.*?\1\s*\)/g, '');
  for (const [, url] of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    if (isLocal(url) && !(await exists(join(root, dirname(css), url)))) fail(`${css}: missing ${url}`);
  }
}

// 5. JS modules: relative imports resolve and imported names are exported
const jsFiles = (await readdir(join(root, 'js'))).filter((f) => f.endsWith('.js'));
const sources = Object.fromEntries(await Promise.all(jsFiles.map(async (f) => [f, await readFile(join(root, 'js', f), 'utf8')])));
const exportsOf = (src) => new Set([
  ...[...src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
  ...[...src.matchAll(/export\s*\{([^}]+)\}/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop())),
]);
for (const [file, src] of Object.entries(sources)) {
  for (const [, names, from] of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    const target = normalize(join('js', dirname(file), from));
    const targetFile = target.replace(/^js[/\\]/, '');
    if (!sources[targetFile]) { fail(`js/${file}: import from missing module ${from}`); continue; }
    const available = exportsOf(sources[targetFile]);
    for (const name of names.split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
      if (!available.has(name)) fail(`js/${file}: "${name}" is not exported by ${from}`);
    }
  }
  for (const [, from] of src.matchAll(/import\s+(?:\*\s+as\s+\w+\s+from\s+)?['"](\.[^'"]+)['"]/g)) {
    if (!(await exists(join(root, 'js', from)))) fail(`js/${file}: import of missing module ${from}`);
  }
}

// 6. Section numbering "(01) — …" runs 01, 02, 03 … in document order
$$('.section__label').forEach((el, i) => {
  const m = el.textContent.match(/\((\d+)\)/);
  if (!m || Number(m[1]) !== i + 1) fail(`section label "${el.textContent.trim()}" should be (${String(i + 1).padStart(2, '0')})`);
});
$$('.menu__num').forEach((el, i) => {
  if (Number(el.textContent) !== i + 1) fail(`menu number "${el.textContent}" should be ${String(i + 1).padStart(2, '0')}`);
});

// 7. Menus: the mobile menu lists every main section with an id, in page order;
//    the other menus only link to sections and keep page order.
const sectionIds = $$('main > section[id]').map((s) => s.id);
const menuTargets = (sel) => $$(sel).map((a) => a.getAttribute('href').slice(1));
const mobile = menuTargets('.menu__nav a');
if (mobile.join() !== sectionIds.join()) fail(`mobile menu (${mobile.join(', ')}) ≠ sections (${sectionIds.join(', ')})`);
for (const sel of ['.nav__links a', '.footer__col nav a, nav.footer__col a']) {
  const targets = menuTargets(sel).filter((id) => id && sectionIds.includes(id));
  const order = targets.map((id) => sectionIds.indexOf(id));
  if (order.some((v, i) => i && v < order[i - 1])) fail(`${sel}: links are not in page order (${targets.join(', ')})`);
}

// 8. Accessible names for interactive elements
for (const el of $$('a[href], button')) {
  const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
  const hidden = el.closest('[aria-hidden="true"]');
  if (!name && !hidden) fail(`<${el.tagName.toLowerCase()} class="${el.className}"> has no accessible name`);
}
for (const img of $$('img')) if (!img.hasAttribute('alt')) fail(`<img src="${img.getAttribute('src')}"> has no alt`);

// 8b. Forms: every control has a label, every group a legend, every button an explicit type
for (const el of $$('input, select, textarea')) {
  if (el.getAttribute('type') === 'hidden') continue;
  const labelled = (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label')
    || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
  if (!labelled) fail(`<${el.tagName.toLowerCase()} name="${el.getAttribute('name')}"> has no label`);
}
for (const fs of $$('fieldset')) if (!fs.querySelector('legend')) fail('<fieldset> without <legend>');
for (const b of $$('button')) if (!b.hasAttribute('type')) fail(`<button class="${b.className}"> has no type (defaults to submit inside forms)`);

// 8c. Carousel: slides are labelled "i z N" in order and the counter shows the same N
const slides = $$('.review');
slides.forEach((el, i) => {
  if (el.getAttribute('aria-label') !== `${i + 1} z ${slides.length}`) fail(`review slide ${i + 1} has aria-label "${el.getAttribute('aria-label')}"`);
});
const counter = document.querySelector('.reviews__status');
if (counter && !counter.textContent.trim().endsWith(`/ ${slides.length}`)) fail(`carousel counter "${counter.textContent.trim()}" ≠ ${slides.length} slides`);

// 9. Brand and contact consistency
const brand = document.querySelector('.footer__big')?.textContent.trim();
for (const sel of ['.nav__logo', '.footer__logo', '.preloader__brand']) {
  const text = document.querySelector(sel)?.textContent.replace('®', '').trim();
  if (text && text !== brand) fail(`${sel} says "${text}", the wordmark says "${brand}"`);
}
if (brand && !document.title.startsWith(brand)) fail(`<title> should start with the brand "${brand}"`);
const mails = new Set($$('a[href^="mailto:"]').map((a) => a.getAttribute('href').slice(7).split('?')[0]));
for (const f of $$('form[data-mailto]')) mails.add(f.getAttribute('data-mailto'));
for (const f of $$('form[action^="mailto:"]')) mails.add(f.getAttribute('action').slice(7).split('?')[0]);
if (mails.size > 1) fail(`different e-mail addresses on the page: ${[...mails].join(', ')}`);
for (const a of $$('a[href^="mailto:"]')) {
  const shown = a.textContent.trim();
  if (/^\S+@\S+$/.test(shown) && shown !== a.getAttribute('href').slice(7)) fail(`mailto link shows "${shown}" but sends to ${a.getAttribute('href')}`);
}
// One phone number everywhere, and every tel: link shows the number it dials.
const digits = (t) => t.replace(/\D/g, '').replace(/^48(?=\d{9}$)/, '');
const phones = new Set($$('a[href^="tel:"]').map((a) => digits(a.getAttribute('href'))));
if (phones.size > 1) fail(`different phone numbers on the page: ${[...phones].join(', ')}`);
for (const a of $$('a[href^="tel:"]')) {
  if (!/^tel:\+48\d{9}$/.test(a.getAttribute('href'))) fail(`tel link "${a.getAttribute('href')}" should be tel:+48 followed by 9 digits`);
  const shown = digits(a.textContent);
  if (shown && shown !== digits(a.getAttribute('href'))) fail(`tel link shows "${a.textContent.trim()}" but dials ${a.getAttribute('href')}`);
}

// 10. Headings: one <h1>, and levels never skip on the way down (h2 → h4)
const headings = $$('h1, h2, h3, h4, h5, h6');
if (headings.filter((h) => h.tagName === 'H1').length !== 1) fail('the page must have exactly one <h1>');
headings.forEach((h, i) => {
  const level = Number(h.tagName[1]);
  const prev = i ? Number(headings[i - 1].tagName[1]) : 0;
  if (level > prev + 1) fail(`heading <${h.tagName.toLowerCase()}> "${h.textContent.trim().slice(0, 30)}" skips a level after <h${prev}>`);
});

// 11. SEO & sharing: required tags, one site URL everywhere, files behind the URLs exist
const meta = (sel) => document.querySelector(sel)?.getAttribute('content') ?? document.querySelector(sel)?.getAttribute('href');
const required = {
  title: document.title,
  description: meta('meta[name="description"]'),
  canonical: meta('link[rel="canonical"]'),
  'og:title': meta('meta[property="og:title"]'),
  'og:description': meta('meta[property="og:description"]'),
  'og:url': meta('meta[property="og:url"]'),
  'og:image': meta('meta[property="og:image"]'),
  'twitter:card': meta('meta[name="twitter:card"]'),
};
for (const [name, value] of Object.entries(required)) if (!value) fail(`missing ${name}`);
const site = required.canonical || '';
if (!/^https:\/\/.+\/$/.test(site)) fail(`canonical "${site}" should be an absolute https URL ending with /`);
const underSite = (label, url) => {
  if (!url) return;
  if (!url.startsWith(site)) { fail(`${label} "${url}" is not under the site URL ${site}`); return; }
  const local = url.slice(site.length);
  if (local) localFiles.push([label, local]);
};
const localFiles = [];
if (required['og:url'] !== site) fail(`og:url "${required['og:url']}" ≠ canonical ${site}`);
underSite('og:image', required['og:image']);
underSite('twitter:image', meta('meta[name="twitter:image"]'));
for (const script of $$('script[type="application/ld+json"]')) {
  let data;
  try { data = JSON.parse(script.textContent); } catch (err) { fail(`JSON-LD is not valid JSON: ${err.message}`); continue; }
  if (data.url !== site) fail(`JSON-LD url "${data.url}" ≠ canonical ${site}`);
  underSite('JSON-LD logo', data.logo);
  underSite('JSON-LD image', data.image);
  if (data.email && !mails.has(data.email)) fail(`JSON-LD email ${data.email} differs from the page's mailto`);
  if (data.telephone && !phones.has(digits(data.telephone))) fail(`JSON-LD telephone ${data.telephone} differs from the page's tel: links`);
  if (data.aggregateRating || data.review) fail('JSON-LD must not carry ratings/reviews until there are real, consented client reviews');
}
// Crawlers read robots.txt only at the host root. While the site lives under a sub-path
// (GitHub Pages project site), the file is ready for a custom domain but not read yet.
const notes = [];
if (site && new URL(site).pathname !== '/') {
  notes.push(`robots.txt is only read at the host root; under ${site} submit sitemap.xml in Google Search Console (or use a custom domain)`);
}
const robots = await readFile(join(root, 'robots.txt'), 'utf8').catch(() => '');
if (!robots.includes(`Sitemap: ${site}sitemap.xml`)) fail(`robots.txt should point to ${site}sitemap.xml`);
const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8').catch(() => '');
if (!sitemap.includes(`<loc>${site}</loc>`)) fail(`sitemap.xml should list ${site}`);
const manifestHref = meta('link[rel="manifest"]');
if (manifestHref) {
  try {
    const manifest = JSON.parse(await readFile(join(root, manifestHref), 'utf8'));
    for (const icon of manifest.icons || []) localFiles.push(['manifest icon', icon.src]);
  } catch (err) { fail(`${manifestHref}: ${err.message}`); }
}
for (const [label, file] of localFiles) if (!(await exists(join(root, file)))) fail(`${label}: missing file ${file}`);

// 12. Performance: every module in js/ is modulepreloaded; three.js symbols used in js/ exist in
//     the subset bundle (re-run `npm run vendor` after using a new THREE.* class).
const preloaded = new Set($$('link[rel="modulepreload"]').map((l) => l.getAttribute('href')));
for (const f of jsFiles) if (!preloaded.has(`js/${f}`)) fail(`js/${f} has no <link rel="modulepreload">`);
const threeBundle = await readFile(join(root, 'vendor/three.module.min.js'), 'utf8');
// The bundle ends with one `export{a as Name,…}` statement.
const exportList = threeBundle.match(/export\s*\{([^}]*)\}\s*;?\s*$/)?.[1] ?? '';
const threeExports = new Set(exportList.split(',').map((e) => e.trim().split(/\s+as\s+/).pop()).filter(Boolean));
if (!threeExports.size) fail('vendor/three.module.min.js: export list not found');
const threeUsed = new Set(Object.values(sources).flatMap((src) => [...src.matchAll(/\bTHREE\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1])));
for (const name of threeUsed) if (!threeExports.has(name)) fail(`THREE.${name} is used but not in vendor/three.module.min.js — run npm run vendor`);

// 13. Example pages (przyklady/): generated from przyklady/dane/*.json and up to date, linked from the
//     "Przykłady" section, clearly labelled as examples, not indexed, and internally consistent.
if (!phones.has(digits(OWNER.tel)) || !mails.has(OWNER.email) || brand !== OWNER.name) {
  fail(`scripts/przyklady.mjs OWNER (${OWNER.name}, ${OWNER.tel}, ${OWNER.email}) differs from index.html`);
}
const examples = await loadExamples().catch((err) => { fail(err.message); return []; });
const exampleFiles = new Set(examples.map((d) => `przyklady/${d.slug}.html`));
for (const file of (await readdir(join(root, 'przyklady'))).filter((f) => f.endsWith('.html'))) {
  if (!exampleFiles.has(`przyklady/${file}`)) fail(`przyklady/${file} has no data file przyklady/dane/${file.replace(/\.html$/, '.json')}`);
}
const linked = $$('.work__link').map((a) => a.getAttribute('href'));
for (const file of exampleFiles) if (!linked.includes(file)) fail(`${file} is not linked from the "Przykłady" section`);
for (const href of linked) if (!exampleFiles.has(href)) fail(`.work__link points at ${href}, which is not a generated example`);
for (const a of $$('a[href]')) {
  const href = a.getAttribute('href').split('#')[0];
  if (isLocal(href) && !(await exists(join(root, href)))) fail(`link to missing page ${href}`);
}
for (const data of examples) {
  const file = `przyklady/${data.slug}.html`;
  let expected;
  try { expected = render(data); } catch (err) { fail(err.message); continue; }
  const onDisk = await readFile(join(root, file), 'utf8').catch(() => '');
  if (onDisk !== expected) fail(`${file} is out of date — run npm run przyklady`);
  const { document: doc } = parseHTML(onDisk);
  const all = (sel) => [...doc.querySelectorAll(sel)];
  const pageIds = new Set(all('[id]').map((el) => el.id));
  if (pageIds.size !== all('[id]').length) fail(`${file}: duplicate ids`);
  if (doc.querySelector('meta[name="robots"]')?.getAttribute('content') !== 'noindex') fail(`${file}: needs <meta name="robots" content="noindex">`);
  if (!doc.querySelector('.demo-bar')?.textContent.includes('Przykładowa strona')) fail(`${file}: the demo bar must say "Przykładowa strona"`);
  if (doc.querySelectorAll('h1').length !== 1) fail(`${file}: must have exactly one <h1>`);
  for (const a of all('a[href]')) {
    const href = a.getAttribute('href');
    if (href.startsWith('#')) { if (href.length > 1 && !pageIds.has(href.slice(1))) fail(`${file}: link to missing #${href.slice(1)}`); continue; }
    if (href.startsWith('../#') && !ids.has(href.slice(4))) fail(`${file}: link to missing index.html#${href.slice(4)}`);
    if (href.startsWith('tel:') && href !== `tel:${OWNER.tel}`) fail(`${file}: an example must not dial ${href} (fictional firm)`);
    if (href.startsWith('mailto:') && href !== `mailto:${OWNER.email}`) fail(`${file}: an example must not mail ${href} (fictional firm)`);
    if (!(a.textContent || a.getAttribute('aria-label') || '').trim()) fail(`${file}: <a href="${href}"> has no accessible name`);
  }
  for (const ref of [...all('[src]').map((el) => el.getAttribute('src')), ...all('a[href], link[href]').map((el) => el.getAttribute('href').split('#')[0])]) {
    if (isLocal(ref) && !(await exists(join(root, 'przyklady', ref)))) fail(`${file}: missing file ${ref}`);
  }
  for (const el of all('[aria-labelledby]')) if (!pageIds.has(el.getAttribute('aria-labelledby'))) fail(`${file}: aria-labelledby points at a missing id`);
  for (const el of all('input, select, textarea')) if (!el.closest('label')) fail(`${file}: <${el.tagName.toLowerCase()} name="${el.getAttribute('name')}"> has no label`);
  let prevLevel = 0;
  for (const h of all('h1, h2, h3, h4')) {
    const level = Number(h.tagName[1]);
    if (level > prevLevel + 1) fail(`${file}: heading "${h.textContent.trim().slice(0, 30)}" skips a level`);
    prevLevel = level;
  }
}

if (problems.length) {
  console.log(`consistency: ${problems.length} problem(s)`);
  problems.forEach((p) => console.log(`  ✖ ${p}`));
  process.exit(1);
}
notes.forEach((n) => console.log(`  ℹ ${n}`));
console.log('consistency: ok — anchors, ids, ARIA, scene, files, imports, numbering, menus, names, forms, carousel, brand, contact, headings, SEO, preload, three subset, example pages');
