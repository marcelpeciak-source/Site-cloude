// Smoke test: serves the site, opens it in Chromium (desktop, mobile, reduced motion),
// fails on console/page errors and saves a screenshot of every section to screenshots/.
//   npm run check            — all runs
//   npm run check -- desktop — only the named run(s)
import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'screenshots');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
};

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, path.endsWith('/') ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const RUNS = {
  // ?quality=max keeps post-processing on despite SwiftShader's low fps, so it shows up in screenshots.
  desktop: { viewport: { width: 1440, height: 900 }, query: '?quality=max' },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  reduced: { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' },
};
const only = process.argv.slice(2);
const runs = Object.entries(RUNS).filter(([name]) => !only.length || only.includes(name));

const SECTIONS = [
  ['hero', null],
  ['o-nas', '#o-nas'],
  ['uslugi', '#uslugi'],
  ['realizacje', '#realizacje'],
  ['realizacje-hover', '#realizacje', 0, { hover: '.work__item:nth-child(2)' }],
  ['proces', '#proces'],
  ['proces-mid', '#proces', 0.5],
  ['wyniki', '#wyniki'],
  ['kontakt', '#kontakt'],
  ['stopka', '.footer'],
  ['menu', '#uslugi', 0, { click: '.nav__toggle', mobileOnly: true }],
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

let failed = false;
for (const [name, { query = '', ...options }] of runs) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  const warnings = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    else if (m.type() === 'warning') warnings.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    const msg = `request failed: ${r.url()} (${r.failure()?.errorText})`;
    // External hosts (fonts) may be blocked in CI containers; local files must load.
    (r.url().startsWith(base) ? errors : warnings).push(msg);
  });
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });

  await page.goto(base + query, { waitUntil: 'load' });
  await page.waitForFunction(() => !document.querySelector('.preloader'), null, { timeout: 20000 });
  await page.waitForTimeout(2600);

  const info = await page.evaluate(async () => {
    const frames = await new Promise((resolve) => {
      let n = 0;
      const t0 = performance.now();
      const step = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(step); else resolve(n / 1.5); };
      requestAnimationFrame(step);
    });
    const c = document.documentElement.classList;
    return {
      webgl: !c.contains('no-webgl'),
      motion: c.contains('motion'),
      fps: Math.round(frames),
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      // Fixed elements don't widen the page, so check that the nav bar's items stay inside
      // its content box (i.e. don't eat into the side padding or leave the screen).
      navOverflow: (() => {
        const nav = document.querySelector('.nav');
        const cs = getComputedStyle(nav);
        const box = nav.getBoundingClientRect();
        const left = box.left + parseFloat(cs.paddingLeft) - 1;
        const right = box.right - parseFloat(cs.paddingRight) + 1;
        return [...nav.children].some((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > right || r.left < left);
        });
      })(),
      heroVisible: getComputedStyle(document.querySelector('.hero__title')).visibility === 'visible',
    };
  });
  if (info.overflowX) errors.push('horizontal overflow: page is wider than the viewport');
  if (info.navOverflow) errors.push('navigation items overflow the nav bar (padding or screen edge)');
  if (!info.heroVisible) errors.push('hero title is not visible');

  for (const [shot, selector, fraction = 0, action = {}] of SECTIONS) {
    const { hover, click, mobileOnly } = action;
    if (hover && (options.isMobile || options.reducedMotion)) continue;
    if (mobileOnly && !options.isMobile) continue;
    await page.evaluate(({ sel, frac }) => {
      let y = 0;
      if (sel) {
        const el = document.querySelector(sel);
        y = el.getBoundingClientRect().top + window.scrollY;
        if (frac) {
          const pin = window.ScrollTrigger?.getAll().find((t) => t.pin && el.contains(t.trigger));
          y = pin ? pin.start + (pin.end - pin.start) * frac : y + window.innerHeight * frac;
        }
      }
      const lenis = window.__site?.lenis;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    }, { sel: selector, frac: fraction });
    await page.waitForTimeout(options.reducedMotion ? 600 : 2600);
    if (hover) {
      // Glide the mouse onto the element so pointer-driven effects (e.g. the WebGL preview) kick in.
      const box = await page.locator(hover).boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.2, box.y - 40);
        await page.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2, { steps: 12 });
        await page.waitForTimeout(1200);
      }
    } else if (click) {
      await page.locator(click).click();
      await page.waitForTimeout(1800);
    } else {
      await page.mouse.move(1, 1);
    }
    await page.screenshot({ path: join(outDir, `${name}-${String(SECTIONS.findIndex((s) => s[0] === shot)).padStart(2, '0')}-${shot}.png`) });
  }

  // Quality level the adaptive ladder settled on (0 = full post-fx … 3 = reduced particles).
  const quality = await page.evaluate(() => window.__site?.scene?.quality ?? '-');
  const status = errors.length ? 'FAIL' : 'ok';
  if (errors.length) failed = true;
  console.log(`\n[${name}] ${status} — webgl: ${info.webgl}, motion: ${info.motion}, ~${info.fps} fps (SwiftShader, software GL), quality level: ${quality}`);
  errors.forEach((e) => console.log(`  ✖ ${e}`));
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  await context.close();
}

await browser.close();
server.close();
console.log(`\nScreenshots: ${outDir}`);
process.exit(failed ? 1 : 0);
