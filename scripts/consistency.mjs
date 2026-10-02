// Consistency audit — things ESLint can't see. Run with `npm run consistency`.
// Checks the HTML against itself, the files on disk and the JS modules:
// anchors, ids, ARIA references, scene shapes, local assets, module imports/exports,
// section numbering, menus, accessible names and brand/contact consistency.
import { readFile, readdir, access } from 'node:fs/promises';
import { join, dirname, normalize } from 'node:path';
import { parseHTML } from 'linkedom';
import { SHAPES } from '../js/shapes.js';

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

if (problems.length) {
  console.log(`consistency: ${problems.length} problem(s)`);
  problems.forEach((p) => console.log(`  ✖ ${p}`));
  process.exit(1);
}
console.log('consistency: ok — anchors, ids, ARIA, scene, files, imports, numbering, menus, names, forms, carousel, brand');
