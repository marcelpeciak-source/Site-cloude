// Generates the sharing image and app icons with Chromium: `npm run social`.
//   assets/og-image.jpg        1200×630, the live hero (Open Graph / Twitter card)
//   assets/icon-192.png, icon-512.png, apple-touch-icon.png   from favicon.svg, full-bleed
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { serve } from './static-server.mjs';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'assets');
await mkdir(out, { recursive: true });
const server = await serve(root);
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

// Sharing image: the hero with full effects, trimmed to the headline and the particle sphere.
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(`${server.base}?quality=max`);
  await page.waitForFunction(() => !document.querySelector('.preloader'), null, { timeout: 30000 });
  await page.addStyleTag({
    content: `.nav__links, .nav__actions, .hero__lead, .hero__actions, .hero__meta, .cursor, .grain { display: none !important; }
      .hero { justify-content: center !important; padding-top: 40px !important; }`,
  });
  await page.waitForTimeout(6000); // intro + particles collapsing into the sphere
  await page.screenshot({ path: join(out, 'og-image.jpg'), type: 'jpeg', quality: 86 });
  await page.close();
}

// Icons: the favicon on a full-bleed background (safe for maskable / iOS rounding).
const svg = await readFile(join(root, 'favicon.svg'), 'utf8');
for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#07070b;display:grid;place-items:center;height:100vh">
    <div style="width:78%;height:78%">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  await page.screenshot({ path: join(out, file) });
  await page.close();
}

await browser.close();
server.close();
console.log('assets/: og-image.jpg, apple-touch-icon.png, icon-192.png, icon-512.png');
