// Smoke test: serves the site, opens it in Chromium (desktop, mobile, reduced motion),
// fails on console/page errors and saves a screenshot of every section to screenshots/.
//   npm run check            — all runs
//   npm run check -- desktop — only the named run(s)
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { serve } from './static-server.mjs';

const AXE = new URL('../node_modules/axe-core/axe.min.js', import.meta.url).pathname;

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'screenshots');
const server = await serve(root);
const base = server.base;

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
  ['opinie', '#opinie'],
  ['opinie-ruch', '#opinie', 0, { reviews: true }],
  ['kontakt', '#kontakt'],
  ['formularz-bledy', '.form', 0, { form: 'invalid' }],
  ['formularz-wyslany', '.form', 0, { form: 'valid' }],
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
    // mailto: "fails" because the headless browser has no mail app — expected, and proof the form opened it.
    if (r.url().startsWith('mailto:')) return void warnings.push('mailto opened (no mail app in the test browser)');
    (r.url().startsWith(base) ? errors : warnings).push(msg);
  });
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });

  await page.goto(base + query, { waitUntil: 'load' });
  await page.waitForFunction(() => !document.querySelector('.preloader'), null, { timeout: 20000 });
  await page.waitForTimeout(2600);

  const info = await page.evaluate(async (designWidth) => {
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
      // Compare with the configured viewport, not innerWidth: mobile Chrome widens the layout
      // viewport to fit overflowing content, so innerWidth grows along with the bug.
      overflowX: Math.max(document.documentElement.scrollWidth, window.innerWidth) > designWidth + 1,
      layoutWidth: Math.max(document.documentElement.scrollWidth, window.innerWidth),
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
      // <button> doesn't inherit the font by default; every visible one must use the site fonts.
      foreignFontButtons: [...document.querySelectorAll('button')]
        .filter((b) => b.offsetParent && !/Manrope|Syne/.test(getComputedStyle(b).fontFamily))
        .map((b) => b.className),
    };
  }, options.viewport.width);
  // Accessibility (axe-core, the engine behind Lighthouse's a11y score): serious/critical fail the run.
  // Runs on the initial page and again after all interactions (form states, carousel, open menu).
  const auditA11y = async (when) => {
    if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ path: AXE });
    const found = await page.evaluate(async () => {
      const res = await window.axe.run(document, { resultTypes: ['violations'] });
      return res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
    });
    for (const v of found) {
      const msg = `a11y ${v.impact} (${when}): ${v.id} — ${v.help} [${v.nodes.join(' | ')}]`;
      (['serious', 'critical'].includes(v.impact) ? errors : warnings).push(msg);
    }
  };
  await auditA11y('start');
  if (info.overflowX) errors.push(`horizontal overflow: page is ${info.layoutWidth}px wide in a ${options.viewport.width}px viewport`);
  if (info.navOverflow) errors.push('navigation items overflow the nav bar (padding or screen edge)');
  if (!info.heroVisible) errors.push('hero title is not visible');
  if (info.foreignFontButtons.length) errors.push(`buttons without the site font: ${info.foreignFontButtons.join(', ')}`);

  for (const [shot, selector, fraction = 0, action = {}] of SECTIONS) {
    const { hover, click, mobileOnly, reviews, form } = action;
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
    } else if (reviews) {
      // Drag the carousel with the mouse (touch devices: the "next" button); the front card must change.
      const before = await page.evaluate(() => window.__site.reviews?.index);
      if (options.isMobile) {
        await page.locator('.reviews__btn[data-dir="1"]').click();
      } else {
        const box = await page.locator('.reviews__stage').boundingBox();
        const y = box.y + box.height / 2;
        await page.mouse.move(box.x + box.width / 2 + 160, y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 200, y, { steps: 14 });
        await page.mouse.up();
      }
      await page.waitForTimeout(1800);
      const after = await page.evaluate(() => window.__site.reviews?.index);
      if (before === after) errors.push(`reviews: the front card did not change (${before} → ${after})`);
      if (!options.reducedMotion && !options.isMobile) {
        // With the mouse off the carousel, autoplay must advance by itself (6 s + rotation).
        await page.mouse.move(1, 1);
        await page.waitForTimeout(9500);
        const later = await page.evaluate(() => window.__site.reviews?.index);
        if (later === after) errors.push('reviews: autoplay did not advance with the mouse outside the carousel');
      }
    } else if (form === 'invalid') {
      await page.locator('.form__submit').click();
      await page.waitForTimeout(800);
      const invalid = await page.locator('.form [aria-invalid="true"]').count();
      if (invalid < 4) errors.push(`form: empty submit marked ${invalid} fields invalid, expected 4`);
    } else if (form === 'valid') {
      await page.fill('#f-name', 'Jan Testowy');
      await page.fill('#f-email', 'jan@firma.pl');
      await page.fill('#f-company', 'Firma Testowa');
      await page.locator('label[for="f-need-www"]').click();
      await page.locator('label[for="f-budget-2"]').click();
      await page.fill('#f-message', 'Potrzebujemy nowej strony z elementami 3D i animacjami.');
      await page.locator('label[for="f-consent"]').click();
      await page.locator('.form__submit').click();
      await page.waitForTimeout(2200);
      // The thank-you panel must be rendered and the fields really gone (not just flagged hidden).
      const sent = await page.evaluate(() => {
        const shown = (sel) => getComputedStyle(document.querySelector(sel)).display !== 'none';
        return document.querySelector('.form').classList.contains('is-sent') && shown('.form__done') && !shown('.form__body');
      });
      if (!sent) errors.push('form: a valid submit did not reach the "sent" state (thank-you shown, fields hidden)');
    } else {
      await page.mouse.move(1, 1);
    }
    await page.screenshot({ path: join(outDir, `${name}-${String(SECTIONS.findIndex((s) => s[0] === shot)).padStart(2, '0')}-${shot}.png`) });
  }

  await auditA11y('after interactions');

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
