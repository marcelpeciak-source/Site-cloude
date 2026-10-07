// Builds one self-contained file, dist/strona.html, that opens straight from disk (double-click,
// no server, works offline): `npm run standalone`. Browsers refuse ES modules and fonts over
// file://, so the modules are bundled into one classic script and the CSS and fonts are inlined.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = new URL('..', import.meta.url).pathname;
const read = (p, enc = 'utf8') => readFile(join(root, p), enc);
// Inline code must not close its own <script>/<style> element early.
const safe = (code, tag) => code.replaceAll(`</${tag}`, `<\\/${tag}`);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

let html = await read('index.html');
const replaceOnce = (pattern, value) => {
  if (!pattern.test(html)) throw new Error(`standalone: pattern not found: ${pattern}`);
  html = html.replace(pattern, value);
};

// 1. App modules + the three.js subset → one IIFE (the import map points "three" at vendor/).
const { outputFiles } = await build({
  absWorkingDir: root,
  entryPoints: ['js/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  alias: { three: './vendor/three.module.min.js' },
  logLevel: 'warning',
});
const app = outputFiles[0].text;

// 2. Stylesheets inline; the font files become data: URIs.
let fonts = await read('vendor/fonts.css');
for (const [, file] of fonts.matchAll(/url\(fonts\/([^)]+\.woff2)\)/g)) {
  const b64 = (await read(`vendor/fonts/${file}`, null)).toString('base64');
  fonts = fonts.replace(`url(fonts/${file})`, `url(data:font/woff2;base64,${b64})`);
}
for (const [href, css] of [['vendor/fonts.css', fonts], ['vendor/lenis.css', await read('vendor/lenis.css')], ['css/style.css', await read('css/style.css')]]) {
  replaceOnce(new RegExp(`<link rel="stylesheet" href="${esc(href)}">`), () => `<style>\n${safe(css, 'style')}\n</style>`);
}

// 3. Drop what only makes sense over http(s): font preloads, the import map, module preloads,
//    the manifest and the PNG touch icon. The SVG favicon is inlined.
html = html
  .replace(/^\s*<link rel="preload" href="vendor\/fonts\/[^"]+" as="font"[^>]*>\n/gm, '')
  .replace(/^\s*<script type="importmap">.*<\/script>\n/m, '')
  .replace(/^\s*<!-- Fetch the whole module graph.*-->\n/m, '')
  .replace(/^\s*<link rel="modulepreload" href="[^"]+">\n/gm, '')
  .replace(/^\s*<link rel="manifest" href="[^"]+">\n/m, '')
  .replace(/^\s*<link rel="apple-touch-icon" href="[^"]+">\n/m, '');
const favicon = Buffer.from(await read('favicon.svg')).toString('base64');
replaceOnce(/<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/, `<link rel="icon" href="data:image/svg+xml;base64,${favicon}" type="image/svg+xml">`);

// 4. The libraries (classic scripts, `defer` in the original) and the app run at the end of <body>,
//    i.e. after the document is parsed, like the deferred/module scripts they replace.
const libs = [];
for (const src of ['vendor/gsap.min.js', 'vendor/ScrollTrigger.min.js', 'vendor/SplitText.min.js', 'vendor/lenis.min.js']) {
  replaceOnce(new RegExp(`^\\s*<script src="${esc(src)}" defer><\\/script>\\n`, 'm'), '');
  libs.push(await read(src));
}
replaceOnce(/^\s*<script type="module" src="js\/main\.js"><\/script>\n/m, '');
const scripts = [...libs, app].map((code) => `<script>\n${safe(code, 'script')}\n</script>`).join('\n');
replaceOnce(/<\/body>/, () => `${scripts}\n</body>`);

// 5. The example pages (przyklady/*.html) stay separate files: link to them on the published site.
const site = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
if (!site) throw new Error('standalone: canonical URL not found');
html = html.replace(/href="(przyklady\/[^"]+)"/g, (_, path) => `href="${site}${path}"`);

if (/(?:src|href)="(?!https?:|data:|mailto:|tel:|#)[^"]+"/.test(html)) {
  const left = html.match(/(?:src|href)="(?!https?:|data:|mailto:|tel:|#)[^"]+"/g);
  throw new Error(`standalone: local references left: ${left.join(', ')}`);
}

await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist/strona.html'), html);
console.log(`dist/strona.html — ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, opens from disk without a server`);
