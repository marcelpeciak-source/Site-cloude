// Smoke test: serves the site, opens it in Chromium (desktop, mobile, reduced motion),
// fails on console/page errors and saves a screenshot of every section to screenshots/.
// Then the example pages (przyklady/*.html) on desktop and mobile.
//   npm run check              — all runs
//   npm run check -- desktop   — only the named run(s); "przyklady" = only the example pages
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { serve } from './static-server.mjs';
import { loadExamples } from './przyklady.mjs';

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
const checkExamples = !only.length || only.includes('przyklady');

const SECTIONS = [
  ['hero', null],
  ['o-mnie', '#o-mnie'],
  ['oferta', '#oferta'],
  ['przyklady', '#przyklady'],
  ['przyklady-hover', '#przyklady', 0, { hover: '.work__item:nth-child(2)' }],
  ['jak-to-dziala', '#jak-to-dziala'],
  ['jak-to-dziala-mid', '#jak-to-dziala', 0.5],
  ['konkrety', '#konkrety'],
  ['pytania', '#pytania'],
  ['pytania-ruch', '#pytania', 0, { reviews: true }],
  ['kontakt', '#kontakt'],
  ['formularz-bledy', '.form', 0, { form: 'invalid' }],
  ['formularz-wyslany', '.form', 0, { form: 'valid' }],
  ['stopka', '.footer'],
  ['menu', '#oferta', 0, { click: '.nav__toggle', mobileOnly: true }],
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
      // The footer wordmark doesn't wrap (the particle logo is sampled from one line): its glyphs
      // must stay inside the footer's side padding, or the name gets clipped on narrow phones.
      wordmarkOut: (() => {
        const el = document.querySelector('.footer__big');
        if (!el) return false;
        const pad = parseFloat(getComputedStyle(document.querySelector('.footer')).paddingLeft);
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return r.left < pad - 1 || r.right > window.innerWidth - pad + 1;
      })(),
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
  if (info.wordmarkOut) errors.push('footer wordmark reaches past the side padding (clipped on this screen width)');
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
      await page.fill('#f-phone', '600 100 200');
      await page.fill('#f-company', 'Zakład Testowy, Pajęczno');
      await page.locator('label[for="f-need-card"]').click();
      await page.locator('label[for="f-current-2"]').click();
      await page.fill('#f-message', 'Prowadzimy zakład w Pajęcznie i chcemy pierwszej strony.');
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

// Example pages: light, no WebGL. Time is pinned to Polish time so the open/closed badge is deterministic.
const EXAMPLE_RUNS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const WED_1030 = new Date('2026-10-07T10:30:00+02:00'); // Wednesday (index 2), 10:30 in Poland
const SUN_1200 = new Date('2026-10-11T12:00:00+02:00'); // Sunday (index 6), noon
const expectedStatus = (godziny, day, minutes) => {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const today = godziny[day];
  if (today && minutes >= toMin(today[0]) && minutes < toMin(today[1])) return `Teraz otwarte · do ${today[1]}`;
  if (today && minutes < toMin(today[0])) return `Teraz zamknięte · otwieramy dziś o ${today[0]}`;
  const next = godziny[(day + 1) % 7];
  return next ? `Teraz zamknięte · otwieramy jutro o ${next[0]}` : null; // the examples all open on the next day
};
const examples = checkExamples ? await loadExamples() : [];
for (const [run, options] of checkExamples ? Object.entries(EXAMPLE_RUNS) : []) {
  for (const data of examples) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [];
    const warnings = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => (r.url().startsWith(base) ? errors : warnings).push(`request failed: ${r.url()}`));
    page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
    const url = `${base}przyklady/${data.slug}.html`;

    await page.clock.setFixedTime(SUN_1200);
    await page.goto(url, { waitUntil: 'load' });
    const sunday = await page.locator('[data-status]').textContent();
    if (sunday !== expectedStatus(data.godziny, 6, 12 * 60)) errors.push(`status on Sunday noon: "${sunday}"`);
    await page.clock.setFixedTime(WED_1030);
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const info = await page.evaluate((designWidth) => ({
      status: document.querySelector('[data-status]:not([hidden])')?.textContent,
      today: [...document.querySelectorAll('.hours tr.is-today')].map((tr) => tr.dataset.dni),
      overflowX: Math.max(document.documentElement.scrollWidth, window.innerWidth) > designWidth + 1,
      demoBar: document.querySelector('.demo-bar')?.getBoundingClientRect().top === 0,
    }), options.viewport.width);
    if (info.status !== expectedStatus(data.godziny, 2, 10 * 60 + 30)) errors.push(`status on Wednesday 10:30: "${info.status}"`);
    if (info.today.length !== 1 || !info.today[0].split(' ').includes('2')) errors.push(`today's hours row: ${JSON.stringify(info.today)}`);
    if (info.overflowX) errors.push('horizontal overflow');
    if (!info.demoBar) errors.push('the "example page" bar is not at the very top');

    if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ path: AXE });
    const found = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] }))
      .violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })));
    for (const v of found) (['serious', 'critical'].includes(v.impact) ? errors : warnings).push(`a11y ${v.impact}: ${v.id} [${v.nodes.join(' | ')}]`);

    await page.screenshot({ path: join(outDir, `przyklady-${run}-${data.slug}.png`), fullPage: true });

    // Placeholder buttons explain themselves instead of dialling; the demo form "sends" without leaving the page.
    const callButton = page.locator(options.isMobile ? '.dock a' : '.top__call').first();
    await callButton.click();
    const toast = page.locator('.toast.is-on');
    if (await toast.textContent({ timeout: 2000 }).catch(() => null) !== await callButton.getAttribute('data-demo')) {
      errors.push('the call placeholder did not show its note');
    }
    await page.fill('#formularz [name="imie"]', 'Jan');
    await page.fill('#formularz [name="telefon"]', '600 100 200');
    await page.locator('#formularz [type="submit"]').click();
    await page.waitForTimeout(300);
    const sent = await page.evaluate(() => ({
      toast: document.querySelector('.toast.is-on')?.textContent,
      expected: document.querySelector('#formularz').dataset.demo,
      cleared: document.querySelector('#formularz [name="imie"]').value === '',
      url: location.href,
    }));
    if (sent.toast !== sent.expected || !sent.cleared || sent.url.split('#')[0] !== url) errors.push(`demo form: ${JSON.stringify(sent)}`);

    if (errors.length) failed = true;
    console.log(`\n[przyklady/${data.slug} · ${run}] ${errors.length ? 'FAIL' : 'ok'}`);
    errors.forEach((e) => console.log(`  ✖ ${e}`));
    warnings.forEach((w) => console.log(`  ⚠ ${w}`));
    await context.close();
  }
}

await browser.close();
server.close();
console.log(`\nScreenshots: ${outDir}`);
process.exit(failed ? 1 : 0);
