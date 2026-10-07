// Small-business page template: "open now / closed" in Polish time, today's row in the opening hours
// and short notes on placeholder buttons (an example page does not dial or send anything).
// Classic script, no dependencies; the page works without it.
(function () {
  'use strict';

  // "otwieramy w poniedziałek", "we wtorek"… (accusative, with the right preposition)
  const DNI = ['w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę', 'w niedzielę'];
  const SKROTY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Day of the week (0 = Monday) and minutes after midnight in Poland, whatever the visitor's time zone.
  function teraz() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Warsaw', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return { dzien: SKROTY.indexOf(get('weekday')), minuty: Number(get('hour')) * 60 + Number(get('minute')) };
  }
  const minuty = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  function opisStatusu(godziny, dzien, m) {
    const dzis = godziny[dzien];
    if (dzis && m >= minuty(dzis[0]) && m < minuty(dzis[1])) {
      return { otwarte: true, tekst: `Teraz otwarte · do ${dzis[1]}` };
    }
    if (dzis && m < minuty(dzis[0])) return { otwarte: false, tekst: `Teraz zamknięte · otwieramy dziś o ${dzis[0]}` };
    for (let i = 1; i <= 7; i += 1) {
      const d = (dzien + i) % 7;
      if (!godziny[d]) continue;
      const kiedy = i === 1 ? 'jutro' : DNI[d];
      return { otwarte: false, tekst: `Teraz zamknięte · otwieramy ${kiedy} o ${godziny[d][0]}` };
    }
    return null;
  }

  function godzinyOtwarcia() {
    const dane = document.getElementById('godziny');
    if (!dane) return;
    let godziny;
    try { godziny = JSON.parse(dane.textContent); } catch { return; }
    const status = document.querySelector('[data-status]');

    const odswiez = () => {
      const { dzien, minuty: m } = teraz();
      const opis = opisStatusu(godziny, dzien, m);
      if (status && opis) {
        status.textContent = opis.tekst;
        status.classList.toggle('is-open', opis.otwarte);
        status.hidden = false;
      }
      document.querySelectorAll('.hours tr[data-dni]').forEach((tr) => {
        const dzis = tr.dataset.dni.split(' ').map(Number).includes(dzien);
        tr.classList.toggle('is-today', dzis);
        if (dzis) tr.setAttribute('aria-current', 'date');
        else tr.removeAttribute('aria-current');
      });
    };
    odswiez();
    setInterval(odswiez, 60 * 1000);
  }

  function atrapy() {
    const toast = document.querySelector('.toast');
    if (!toast) return;
    let timer = 0;
    const pokaz = (tekst) => {
      toast.textContent = tekst;
      toast.classList.add('is-on');
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove('is-on'), 5000);
    };

    document.addEventListener('click', (e) => {
      const el = e.target.closest('a[data-demo]');
      if (!el) return;
      e.preventDefault();
      pokaz(el.dataset.demo);
    });
    document.querySelectorAll('form[data-demo]').forEach((form) => {
      // The browser checks the required fields first; submit only fires for a filled-in form.
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        pokaz(form.dataset.demo);
        form.reset();
      });
    });
  }

  godzinyOtwarcia();
  atrapy();
})();
