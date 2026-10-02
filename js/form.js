// Contact form: inline validation (Polish messages, aria-invalid + aria-describedby), a loading
// state and an animated "sent" state. There is no backend: by default the form composes an
// e-mail and opens the visitor's mail app (mailto). If the owner sets data-endpoint on the form
// (e.g. a form service URL), the data is POSTed there as JSON instead.
const { gsap } = window;

const MESSAGES = {
  required: 'To pole jest wymagane.',
  email: 'Wpisz poprawny adres e-mail, np. jan@firma.pl.',
  short: (n) => `Napisz trochę więcej — co najmniej ${n} znaków.`,
  consent: 'Potrzebujemy tej zgody, żeby móc odpowiedzieć.',
};

export function initForm({ motion, onSent } = {}) {
  const form = document.querySelector('.form');
  if (!form) return;
  const body = form.querySelector('.form__body');
  const done = form.querySelector('.form__done');
  const submit = form.querySelector('.form__submit');
  const status = form.querySelector('.form__status');
  const fields = [...form.querySelectorAll('input[required], textarea[required]')];
  // Read at send time, so an endpoint set after load (or by another script) is honoured.
  const viaEndpoint = () => Boolean(form.dataset.endpoint);
  let sending = false;
  // JS takes over validation; without JS the browser's own checks guard the mailto fallback.
  form.noValidate = true;

  function errorFor(el) {
    const value = el.value.trim();
    if (el.type === 'checkbox') return el.checked ? '' : MESSAGES.consent;
    if (!value) return MESSAGES.required;
    if (el.type === 'email' && el.validity.typeMismatch) return MESSAGES.email;
    // minlength is checked by hand: the browser only reports tooShort after real typing.
    if (el.minLength > 0 && value.length < el.minLength) return MESSAGES.short(el.minLength);
    return '';
  }

  function validate(el) {
    const message = errorFor(el);
    const wrapper = el.closest('.field, .consent');
    const error = document.getElementById(el.getAttribute('aria-describedby'));
    const changed = error && error.textContent !== message;
    wrapper?.classList.toggle('is-invalid', Boolean(message));
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
    if (changed) {
      error.textContent = message;
      if (message && motion) gsap.fromTo(error, { y: -6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
    }
    return !message;
  }

  // Validate on leaving a field; once a field has shown an error, re-check while typing.
  fields.forEach((el) => {
    el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') validate(el); });
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      if (el.getAttribute('aria-invalid') === 'true') validate(el);
    });
  });

  function collect() {
    const data = new FormData(form);
    return {
      name: (data.get('name') || '').trim(),
      email: (data.get('email') || '').trim(),
      company: (data.get('company') || '').trim(),
      needs: data.getAll('needs'),
      budget: data.get('budget') || '',
      message: (data.get('message') || '').trim(),
      website: data.get('website') || '', // honeypot
    };
  }

  function mailtoUrl(d) {
    const subject = `Zapytanie ze strony — ${d.name}${d.company ? `, ${d.company}` : ''}`;
    const details = [
      `Imię i nazwisko: ${d.name}`,
      `E-mail: ${d.email}`,
      d.company ? `Firma: ${d.company}` : null,
      d.needs.length ? `Zakres: ${d.needs.join(', ')}` : null,
      d.budget ? `Budżet: ${d.budget}` : null,
    ].filter(Boolean);
    const text = `${d.message}\n\n—\n${details.join('\n')}`;
    return `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  }

  async function send(d) {
    if (viaEndpoint()) {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...d, website: undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return;
    }
    window.location.href = mailtoUrl(d);
  }

  function showDone(d) {
    const nameEl = done.querySelector('[data-form-name]');
    nameEl.textContent = d.name ? `, ${d.name.split(/\s+/)[0]}` : '';
    done.querySelectorAll('[data-mode]').forEach((p) => {
      p.hidden = p.dataset.mode !== (viaEndpoint() ? 'endpoint' : 'mailto');
    });
    form.classList.add('is-sent');
    done.hidden = false;
    body.hidden = true;
    if (motion) gsap.from(done.children, { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 });
    done.querySelector('.form__done-title').setAttribute('tabindex', '-1');
    done.querySelector('.form__done-title').focus({ preventScroll: true });
    onSent?.();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return; // Enter pressed again while the first send is still running
    const invalid = fields.filter((el) => !validate(el));
    if (invalid.length) {
      status.textContent = invalid.length === 1
        ? 'Popraw zaznaczone pole.'
        : `Popraw zaznaczone pola (${invalid.length}).`;
      invalid[0].focus();
      if (motion) gsap.fromTo(form, { x: 0 }, { keyframes: { x: [-8, 7, -5, 3, 0] }, duration: 0.45, ease: 'none' });
      return;
    }
    status.textContent = '';
    const d = collect();
    if (d.website) { showDone(d); return; } // bots fill the hidden field: pretend success

    sending = true;
    submit.classList.add('is-loading');
    try {
      await Promise.all([send(d), new Promise((r) => setTimeout(r, 700))]);
      showDone(d);
    } catch (err) {
      console.warn('Wysyłka formularza nie powiodła się:', err);
      status.textContent = `Nie udało się wysłać. Napisz bezpośrednio na ${form.dataset.mailto}.`;
    } finally {
      sending = false;
      submit.classList.remove('is-loading');
    }
  });

  done.querySelector('.form__again').addEventListener('click', () => {
    form.reset();
    fields.forEach((el) => {
      el.removeAttribute('aria-invalid');
      el.closest('.field, .consent')?.classList.remove('is-invalid');
      const error = document.getElementById(el.getAttribute('aria-describedby'));
      if (error) error.textContent = '';
    });
    status.textContent = '';
    form.classList.remove('is-sent');
    done.hidden = true;
    body.hidden = false;
    form.querySelector('input').focus();
  });
}
