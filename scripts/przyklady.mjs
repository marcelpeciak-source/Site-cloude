// Small-business page template → HTML.
//   npm run przyklady                      przyklady/dane/*.json → przyklady/<slug>.html (example pages, in the repo)
//   npm run wizualizacja -- <dane.json>    one self-contained file wizualizacje/<slug>.html (a free visualisation
//                                          for a real firm; that folder is git-ignored, the repo is public)
// The data format is described by validate() below; przyklady/dane/fryzjer.json is a complete example.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;

// The owner's real contact details; scripts/consistency.mjs checks they match index.html.
export const OWNER = {
  name: 'Marcel Pęciak',
  phone: '662 868 774',
  tel: '+48662868774',
  email: 'zrobswojastrone@gmail.com',
};

const DAY = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
const MOTYW = ['tlo', 'karta', 'tekst', 'przygaszony', 'akcent', 'akcentTekst', 'miekki'];
const SEKCJA = {
  galeria: { id: 'galeria', nav: 'Galeria' },
  kroki: { id: 'jak-pracujemy', nav: 'Jak pracujemy' },
  info: { id: 'informacje', nav: 'Informacje' },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const minutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// WCAG 2 contrast ratio of two #rrggbb colours.
export function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Throws a list of every problem in the data, so a visualisation can be fixed in one go.
export function validate(d, mode) {
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };
  const text = (v) => typeof v === 'string' && v.trim().length > 0;

  need(typeof d.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug), 'slug: małe litery, cyfry i myślniki (to nazwa pliku)');
  for (const key of ['nazwa', 'branza', 'haslo', 'lead', 'adres', 'miejscowosc']) need(text(d[key]), `${key}: brak tekstu`);

  const m = d.motyw ?? {};
  for (const key of MOTYW) need(/^#[0-9a-f]{6}$/i.test(m[key] ?? ''), `motyw.${key}: kolor w formacie #rrggbb`);
  if (MOTYW.every((key) => /^#[0-9a-f]{6}$/i.test(m[key] ?? ''))) {
    // Every text/background pair the template uses must stay readable (WCAG AA, 4.5:1).
    const pairs = [['tekst', 'tlo'], ['tekst', 'karta'], ['tekst', 'miekki'], ['przygaszony', 'tlo'], ['przygaszony', 'karta'],
      ['akcent', 'tlo'], ['akcent', 'karta'], ['akcentTekst', 'akcent']];
    for (const [fg, bg] of pairs) {
      const ratio = contrast(m[fg], m[bg]);
      need(ratio >= 4.5, `motyw: ${fg} na ${bg} ma kontrast ${ratio.toFixed(2)}:1, potrzeba co najmniej 4.5:1`);
    }
  }

  const g = d.godziny;
  need(Array.isArray(g) && g.length === 7, 'godziny: 7 pozycji, od poniedziałku do niedzieli (null = nieczynne)');
  if (Array.isArray(g)) {
    g.forEach((day, i) => {
      if (day === null) return;
      const ok = Array.isArray(day) && day.length === 2 && day.every((t) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(t)) && minutes(day[0]) < minutes(day[1]);
      need(ok, `godziny[${i}] (${DAY[i]}): ["8:00", "16:00"] albo null`);
    });
    need(g.some(Boolean), 'godziny: co najmniej jeden dzień otwarty');
  }

  need(text(d.cta?.tekst) && ['formularz', 'telefon'].includes(d.cta?.cel), 'cta: { "tekst": "…", "cel": "formularz" | "telefon" }');
  need(Array.isArray(d.uslugi) && d.uslugi.length >= 3 && d.uslugi.length <= 9 && d.uslugi.every((u) => text(u?.nazwa) && text(u?.opis)),
    'uslugi: 3–9 pozycji { "nazwa", "opis" }');
  if (d.cennik !== undefined) {
    need(Array.isArray(d.cennik) && d.cennik.length > 0 && d.cennik.every((p) => Array.isArray(p) && p.length === 2 && p.every(text)),
      'cennik: lista par ["usługa", "cena"] (albo pomiń pole)');
  }
  if (d.cennikUwaga !== undefined) need(text(d.cennikUwaga), 'cennikUwaga: brak tekstu (albo pomiń pole)');
  if (d.sekcja !== undefined) {
    const s = d.sekcja;
    need(Object.hasOwn(SEKCJA, s?.typ), 'sekcja.typ: "galeria", "kroki" albo "info"');
    need(text(s?.naglowek), 'sekcja.naglowek: brak tekstu');
    const items = Array.isArray(s?.elementy) ? s.elementy : [];
    need(items.length > 0 && items.every((e) => (s?.typ === 'galeria' ? text(e) : Array.isArray(e) && e.length === 2 && e.every(text))),
      'sekcja.elementy: podpisy zdjęć (galeria) albo pary ["tytuł", "opis"] (kroki, info)');
  }
  need(text(d.formularz?.naglowek) && text(d.formularz?.opis) && text(d.formularz?.wybor), 'formularz: { "naglowek", "opis", "wybor" }');

  if (mode === 'przyklad') {
    // Example pages show fictional firms: no real phone numbers or e-mails, and the town stays generic.
    need(d.telefon === undefined && d.email === undefined, 'przykład: bez pól telefon/email (fikcyjna firma)');
  } else {
    if (d.telefon !== undefined) need(/^(\+48)?\d{9}$/.test(String(d.telefon).replace(/[\s-]/g, '')), 'telefon: 9 cyfr, np. "600 100 200"');
    if (d.email !== undefined) need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email), 'email: niepoprawny adres');
  }
  if (errors.length) throw new Error(`${d.slug ?? '(bez sluga)'}:\n  - ${errors.join('\n  - ')}`);
}

// Consecutive days with the same hours share one row: "Poniedziałek – piątek  9:00–18:00".
export function hourRows(godziny) {
  const rows = [];
  godziny.forEach((day, i) => {
    const key = day ? day.join('–') : 'nieczynne';
    const last = rows.at(-1);
    if (last && last.key === key) last.days.push(i);
    else rows.push({ key, days: [i] });
  });
  return rows.map(({ key, days }) => {
    const first = DAY[days[0]];
    const end = DAY[days.at(-1)];
    const label = days.length === 1 ? cap(first) : days.length === 2 ? `${cap(first)} i ${end}` : `${cap(first)} – ${end}`;
    return { label, hours: key, days };
  });
}

const digits = (phone) => String(phone).replace(/\D/g, '').slice(-9);
const showPhone = (phone) => digits(phone).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

export function render(d, { mode = 'przyklad' } = {}) {
  validate(d, mode);
  const demo = mode === 'przyklad';
  const up = demo ? '../' : '';
  const sekcja = d.sekcja && SEKCJA[d.sekcja.typ];
  const mono = d.nazwa.trim().split(/\s+/).at(-1).charAt(0).toUpperCase();
  const address = `${d.adres}, ${d.miejscowosc}`;

  // Links that only work on the finished site become placeholders that explain what they will do.
  const demoAttr = (msg) => `href="#kontakt" data-demo="${esc(msg)}"`;
  const call = d.telefon
    ? `href="tel:+48${digits(d.telefon)}"`
    : demoAttr(demo
      ? 'To przykład — w gotowej stronie ten przycisk od razu wybiera numer firmy.'
      : 'Tu wstawię Państwa numer — jedno dotknięcie i klient już dzwoni.');
  const route = demo
    ? demoAttr('W gotowej stronie tu jest mapa Google z dojazdem — jedno dotknięcie i nawigacja prowadzi pod same drzwi.')
    : `href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(address)}" target="_blank" rel="noopener"`;
  const formMsg = demo
    ? 'To tylko przykład, nic nie zostało wysłane. W gotowej stronie wiadomość trafi prosto na Państwa telefon lub e-mail.'
    : 'To wizualizacja, nic nie zostało wysłane. W gotowej stronie zgłoszenie trafi prosto do Państwa.';
  const ctaHref = d.cta.cel === 'telefon' ? call : 'href="#formularz"';

  const nav = [['oferta', 'Oferta'], d.cennik && ['cennik', 'Cennik'], sekcja && [sekcja.id, sekcja.nav], ['kontakt', 'Kontakt']].filter(Boolean);

  const sections = [];
  sections.push({
    id: 'oferta',
    title: 'Oferta',
    body: `<ul class="cards">\n${d.uslugi.map((u) => `          <li class="card"><h3>${esc(u.nazwa)}</h3><p>${esc(u.opis)}</p></li>`).join('\n')}\n        </ul>`,
  });
  if (d.cennik) {
    const note = d.cennikUwaga ?? (demo
      ? 'Ceny przykładowe. W Państwa stronie wpiszemy prawdziwy cennik — i zmienimy go, kiedy tylko trzeba.'
      : 'Ceny do potwierdzenia przez Państwa.');
    sections.push({
      id: 'cennik',
      title: 'Cennik',
      body: `<dl class="prices">\n${d.cennik.map(([n, c]) => `          <div><dt>${esc(n)}</dt><dd>${esc(c)}</dd></div>`).join('\n')}\n        </dl>
        <p class="note">${esc(note)}</p>`,
    });
  }
  if (sekcja) {
    const s = d.sekcja;
    let body;
    if (s.typ === 'galeria') {
      body = `<ul class="gallery">\n${s.elementy.map((e, i) => `          <li class="ph" data-mono="${i + 1}"><span class="ph__cap">${esc(e)}</span></li>`).join('\n')}\n        </ul>`;
    } else if (s.typ === 'kroki') {
      body = `<ol class="steps">\n${s.elementy.map(([t, p]) => `          <li><h3>${esc(t)}</h3><p>${esc(p)}</p></li>`).join('\n')}\n        </ol>`;
    } else {
      body = `<ul class="cards">\n${s.elementy.map(([t, p]) => `          <li class="card"><h3>${esc(t)}</h3><p>${esc(p)}</p></li>`).join('\n')}\n        </ul>`;
    }
    sections.push({ id: sekcja.id, title: s.naglowek, intro: s.wstep, body });
  }

  const rows = hourRows(d.godziny).map((r) => `              <tr data-dni="${r.days.join(' ')}"><th scope="row">${esc(r.label)}</th><td>${esc(r.hours)}</td></tr>`).join('\n');
  const options = [...d.uslugi.map((u) => u.nazwa), 'Inne'].map((o) => `<option>${esc(o)}</option>`).join('');
  const contactLines = [
    `<p>${esc(address)}</p>`,
    d.telefon ? `<p><a ${call}>${esc(showPhone(d.telefon))}</a></p>` : `<p><a ${call}>Zadzwoń</a></p>`,
    d.email && `<p><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></p>`,
  ].filter(Boolean).join('\n              ');
  sections.push({
    id: 'kontakt',
    title: 'Kontakt i dojazd',
    body: `<div class="contact">
          <div>
            <div class="contact__lines">
              ${contactLines}
            </div>
            <h3 class="contact__h">Godziny otwarcia</h3>
            <table class="hours">
${rows}
            </table>
            <a class="map" ${route}><span class="map__pin">${esc(address)}</span><span class="map__go">Wyznacz trasę <span aria-hidden="true">→</span></span></a>
          </div>
          <form class="form" id="formularz" data-demo="${esc(formMsg)}">
            <h3>${esc(d.formularz.naglowek)}</h3>
            <p>${esc(d.formularz.opis)}</p>
            <div class="form__grid">
              <label>Imię <input name="imie" autocomplete="given-name" required></label>
              <label>Telefon <input name="telefon" type="tel" inputmode="tel" autocomplete="tel" required></label>
              <label>${esc(d.formularz.wybor)} <select name="wybor">${options}</select></label>
              <label>Wiadomość (opcjonalnie) <textarea name="wiadomosc" rows="3"></textarea></label>
            </div>
            <button class="btn" type="submit">Wyślij</button>
            <p class="form__small">${demo ? 'Formularz pokazowy — nic nie zostanie wysłane.' : 'Wizualizacja — formularz jeszcze niczego nie wysyła.'}</p>
          </form>
        </div>`,
  });

  const sectionHtml = sections.map((s, i) => `    <section class="sec${i % 2 ? ' sec--alt' : ''}" id="${s.id}" aria-labelledby="${s.id}-h">
      <div class="wrap">
        <h2 id="${s.id}-h">${esc(s.title)}</h2>${s.intro ? `\n        <p class="sec__intro">${esc(s.intro)}</p>` : ''}
        ${s.body}
      </div>
    </section>`).join('\n\n');

  const m = d.motyw;
  const ownerTel = `<a href="tel:${OWNER.tel}">${OWNER.phone}</a>`;
  const bar = demo
    ? `<p><strong>Przykładowa strona</strong> — fikcyjna firma, przykładowe ceny i dane. Tak może wyglądać strona Państwa firmy.</p>
    <p class="demo-bar__links"><a href="../#przyklady"><span aria-hidden="true">←</span> Wszystkie przykłady</a><a href="../#kontakt">Chcę taką stronę</a></p>`
    : `<p><strong>Wizualizacja strony głównej</strong> dla: ${esc(d.nazwa)}. Projekt: ${OWNER.name}. Zdjęcia i treści do uzupełnienia razem z Państwem.</p>
    <p class="demo-bar__links">${ownerTel}<a href="mailto:${OWNER.email}">${OWNER.email}</a></p>`;
  const title = demo
    ? `${d.nazwa} — przykładowa strona (${d.branza.toLowerCase()}) | ${OWNER.name}`
    : `${d.nazwa} — wizualizacja strony głównej`;
  const credit = demo
    ? `<p>Fikcyjna firma. Strona przykładowa: <a href="../">${OWNER.name} — strony dla lokalnych firm</a></p>`
    : `<p>Projekt strony: ${OWNER.name} · ${ownerTel}</p>`;

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(d.lead)}">
  <meta name="theme-color" content="${m.tlo}">
  <link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${up}vendor/fonts.css">
  <link rel="stylesheet" href="${demo ? '' : 'przyklady/'}szablon.css">
  <style>:root { ${MOTYW.map((k) => `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${m[k]};`).join(' ')} color-scheme: ${contrast(m.tlo, '#000000') > contrast(m.tlo, '#ffffff') ? 'light' : 'dark'}; }</style>
  <script src="${demo ? '' : 'przyklady/'}szablon.js" defer></script>
</head>
<body>
  <a class="skip" href="#tresc">Przejdź do treści</a>
  <aside class="demo-bar" aria-label="O tej stronie">
    ${bar}
  </aside>

  <header class="top">
    <div class="wrap top__in">
      <a class="top__logo" href="#tresc">${esc(d.nazwa)}</a>
      <nav class="top__nav" aria-label="Sekcje strony">
        ${nav.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('\n        ')}
      </nav>
      <a class="btn btn--small top__call" ${call}>Zadzwoń</a>
    </div>
  </header>

  <main id="tresc">
    <section class="hero" aria-labelledby="hero-h">
      <div class="wrap hero__in">
        <div>
          <p class="hero__kicker">${esc(d.branza)} · ${esc(d.miejscowosc)}</p>
          <h1 id="hero-h">${esc(d.haslo)}</h1>
          <p class="hero__lead">${esc(d.lead)}</p>
          <div class="hero__actions">
            <a class="btn" ${ctaHref}>${esc(d.cta.tekst)}</a>
            <a class="btn btn--ghost" href="#oferta">Zobacz ofertę</a>
          </div>
          <p class="status" data-status hidden></p>
        </div>
        <figure class="ph" data-mono="${esc(mono)}"><figcaption class="ph__cap">Miejsce na zdjęcie firmy</figcaption></figure>
      </div>
    </section>

${sectionHtml}
  </main>

  <footer class="foot">
    <div class="wrap foot__in">
      <p>© ${esc(d.nazwa)}</p>
      ${credit}
    </div>
  </footer>

  <nav class="dock" aria-label="Szybki kontakt">
    <a ${call}>Zadzwoń</a>
    <a href="#formularz">${d.cta.cel === 'formularz' ? esc(d.cta.tekst) : 'Napisz'}</a>
    <a ${route}>Dojazd</a>
  </nav>
  <div class="toast" role="status"></div>
  <script type="application/json" id="godziny">${JSON.stringify(d.godziny)}</script>
</body>
</html>
`;
}

// Inlines the stylesheets, fonts, favicon and script so a visualisation is one file that opens from disk
// or goes out as an e-mail attachment.
async function inline(html) {
  const read = (p, enc = 'utf8') => readFile(join(root, p), enc);
  let fonts = await read('vendor/fonts.css');
  for (const [, file] of fonts.matchAll(/url\(fonts\/([^)]+\.woff2)\)/g)) {
    const b64 = (await read(`vendor/fonts/${file}`, null)).toString('base64');
    fonts = fonts.replace(`url(fonts/${file})`, `url(data:font/woff2;base64,${b64})`);
  }
  const css = await read('przyklady/szablon.css');
  const js = await read('przyklady/szablon.js');
  const favicon = Buffer.from(await read('favicon.svg')).toString('base64');
  const swap = (from, to) => {
    if (!html.includes(from)) throw new Error(`wizualizacja: nie znaleziono ${from}`);
    html = html.replace(from, () => to);
  };
  swap('<link rel="icon" href="favicon.svg" type="image/svg+xml">', `<link rel="icon" href="data:image/svg+xml;base64,${favicon}" type="image/svg+xml">`);
  swap('<link rel="stylesheet" href="vendor/fonts.css">', `<style>\n${fonts.replaceAll('</style', '<\\/style')}\n</style>`);
  swap('<link rel="stylesheet" href="przyklady/szablon.css">', `<style>\n${css.replaceAll('</style', '<\\/style')}\n</style>`);
  swap('<script src="przyklady/szablon.js" defer></script>', '');
  swap('</body>', `<script>\n${js.replaceAll('</script', '<\\/script')}\n</script>\n</body>`);
  const left = html.match(/(?:src|href)="(?!https?:|data:|mailto:|tel:|#)[^"]+"/g);
  if (left) throw new Error(`wizualizacja: zostały lokalne odwołania: ${left.join(', ')}`);
  return html;
}

export async function loadExamples() {
  const dir = join(root, 'przyklady/dane');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(files.map(async (f) => {
    const data = JSON.parse(await readFile(join(dir, f), 'utf8'));
    if (`${data.slug}.json` !== f) throw new Error(`${f}: slug "${data.slug}" musi zgadzać się z nazwą pliku`);
    return data;
  }));
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--wizualizacja') {
    if (!args[1]) throw new Error('Użycie: npm run wizualizacja -- ścieżka/do/dane.json');
    const data = JSON.parse(await readFile(resolve(args[1]), 'utf8'));
    const html = await inline(render(data, { mode: 'wizualizacja' }));
    await mkdir(join(root, 'wizualizacje'), { recursive: true });
    const out = join(root, 'wizualizacje', `${data.slug}.html`);
    await writeFile(out, html);
    console.log(`wizualizacje/${data.slug}.html — ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, jeden plik (nie trafia do repozytorium)`);
    return;
  }
  for (const data of await loadExamples()) {
    await writeFile(join(root, 'przyklady', `${data.slug}.html`), render(data));
    console.log(`przyklady/${data.slug}.html`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
