import { createScene } from './scene.js';
import { initCursor, initMagnetic, initTilt } from './interactions.js';
import { initWork } from './work.js';
import { initMenu } from './menu.js';
import { initReviews } from './reviews.js';
import { initForm } from './form.js';

const root = document.documentElement;
const motion = root.classList.contains('motion');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const { gsap, ScrollTrigger, SplitText, Lenis } = window;

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

start().catch((err) => {
  // Never leave the visitor staring at a preloader or hidden content.
  console.error(err);
  root.classList.remove('motion');
  root.classList.add('is-ready');
  $('.preloader')?.remove();
  $('[data-hero-title]')?.style.setProperty('visibility', 'visible');
});

async function start() {
  if (!gsap || !ScrollTrigger || !SplitText) throw new Error('GSAP nie został załadowany');
  root.classList.add('is-ready');
  gsap.registerPlugin(ScrollTrigger, SplitText);

  if (motion) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }

  const lenis = motion && Lenis ? initLenis() : null;

  let scene = null;
  try {
    scene = createScene($('.webgl'), { motion });
  } catch (err) {
    console.warn('WebGL niedostępny:', err);
  }
  if (!scene) root.classList.add('no-webgl');
  if (scene) {
    scene.go(sceneConfig($('.hero')), true);
    lenis?.on('scroll', (e) => scene.setVelocity(e.velocity));
  }

  window.__site = { lenis, scene };

  initAnchors(lenis);
  initMenu({ lenis, scene, motion });
  initNav();
  initClock();
  initMarquee(lenis);
  initWork({ motion, finePointer });
  initForm({ motion, onSent: () => scene?.burst() });
  if (motion && finePointer) {
    initCursor();
    initMagnetic();
    initTilt();
  }

  lenis?.stop();
  await preload();
  lenis?.start();
  await initParticleLogo(scene);

  // Order matters: pinned sections first, so later triggers measure the pin spacing.
  initProcess();
  window.__site.reviews = initReviews({ motion });
  initReveals();
  initCounters();
  initSceneSections(scene);
  ScrollTrigger.refresh();

  intro(scene);
}

/* ------------------------------------------------------------------------ */

function initLenis() {
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

function preload() {
  const el = $('.preloader');
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  if (!motion || !el) {
    el?.remove();
    return Promise.race([fonts, wait(1500)]);
  }

  const count = $('[data-count]', el);
  const bar = $('.preloader__bar span', el);
  const progress = { v: 0 };
  const render = () => {
    count.textContent = Math.round(progress.v);
    bar.style.transform = `scaleX(${progress.v / 100})`;
  };
  const loaded = new Promise((r) => {
    if (document.readyState === 'complete') r();
    else window.addEventListener('load', r, { once: true });
  });
  const ready = Promise.race([Promise.all([fonts, loaded]), wait(4000)]);
  const fill = gsap.to(progress, { v: 88, duration: 1.7, ease: 'power2.inOut', onUpdate: render });

  return Promise.all([ready, fill]).then(() => new Promise((resolve) => {
    gsap.timeline({ onComplete: () => el.remove() })
      .to(progress, { v: 100, duration: 0.45, ease: 'power2.out', onUpdate: render })
      .to('.preloader__inner', { yPercent: -40, opacity: 0, duration: 0.8, ease: 'expo.in' }, '+=0.1')
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.35')
      .add(resolve, '-=0.7');
  }));
}

function intro(scene) {
  scene?.intro();
  if (!motion) return;

  const title = $('[data-hero-title]');
  const split = SplitText.create($$('.line', title), { type: 'words,chars' });
  gsap.set(title, { visibility: 'visible' });

  gsap.timeline({ defaults: { ease: 'expo.out' } })
    // Children, not .nav itself: .nav's transform belongs to the CSS hide-on-scroll transition.
    .from('.nav > *', { yPercent: -160, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.2)
    .from(split.chars, { yPercent: 120, rotate: 10, duration: 1.5, stagger: 0.016 }, 0)
    .fromTo('.hero [data-fade]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.3, stagger: 0.12 }, 0.5);
}

/* ------------------------------------------------------------------------ */

async function initParticleLogo(scene) {
  const mark = $('.footer__big');
  if (!scene || !motion || !mark) return;
  // Sample the wordmark only once the display font is really available.
  await Promise.race([document.fonts?.load('800 100px "Syne Variable"'), wait(2000)]).catch(() => {});
  if (scene.setLogo(mark.textContent.trim())) root.classList.add('has-particle-logo');
}

function sceneConfig(el) {
  const d = el.dataset;
  const num = (v) => (v === undefined ? undefined : parseFloat(v));
  return {
    anchor: d.sceneAnchor ? $(d.sceneAnchor) : undefined,
    shape: d.scene,
    x: num(d.sceneX),
    y: num(d.sceneY),
    mobileY: num(d.sceneMobileY),
    scale: num(d.sceneScale),
    dim: num(d.sceneDim),
  };
}

function initSceneSections(scene) {
  if (!scene) return;
  $$('[data-scene]').forEach((el) => {
    // Anchored shapes (the footer logo) need the live render loop to follow the page.
    if (el.dataset.sceneAnchor && !root.classList.contains('has-particle-logo')) return;
    const cfg = sceneConfig(el);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: 'bottom 55%',
      onEnter: () => scene.go(cfg),
      onEnterBack: () => scene.go(cfg),
    });
  });
}

function initProcess() {
  const section = $('.process');
  const track = $('.process__track');
  const bar = $('.process__progress span');
  if (!section || !track || !motion) return;

  gsap.matchMedia().add('(min-width: 900px)', () => {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
      },
    });

    $$('.step', track).forEach((step) => {
      gsap.fromTo(step, { opacity: 0.2, scale: 0.9, rotateY: -14 }, {
        opacity: 1, scale: 1, rotateY: 0, ease: 'power2.out',
        scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 95%', end: 'left 50%', scrub: true },
      });
    });
  });
}

function initReveals() {
  if (!motion) return;

  $$('[data-reveal]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 110,
        duration: 1.3,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      }),
    });
  });

  const manifesto = $('[data-words]');
  if (manifesto) {
    const split = SplitText.create(manifesto, { type: 'words' });
    gsap.fromTo(split.words, { opacity: 0.12 }, {
      opacity: 1,
      ease: 'none',
      stagger: 0.1,
      scrollTrigger: { trigger: manifesto, start: 'top 80%', end: 'bottom 55%', scrub: true },
    });
  }

  $$('[data-fade]').filter((el) => !el.closest('.hero')).forEach((el) => {
    gsap.fromTo(el, { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  const cards = $$('.card');
  gsap.set(cards, { opacity: 0 });
  ScrollTrigger.batch(cards, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.fromTo(batch, { opacity: 0, y: 90, rotateX: -16 }, {
      opacity: 1, y: 0, rotateX: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12,
      clearProps: 'transform',
    }),
  });
}

function initCounters() {
  const fmt = (v, d) => v.toLocaleString('pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d });
  $$('[data-counter]').forEach((el) => {
    const end = parseFloat(el.dataset.counter);
    const decimals = Number(el.dataset.decimals) || 0;
    const suffix = el.dataset.suffix || '';
    const set = (v) => { el.textContent = fmt(v, decimals) + suffix; };
    if (!motion) { set(end); return; }

    const o = { v: 0 };
    set(0);
    gsap.to(o, {
      v: end,
      duration: 2.4,
      ease: 'expo.out',
      onUpdate: () => set(o.v),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

/* ------------------------------------------------------------------------ */

function initAnchors(lenis) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (e.defaultPrevented || !a || a.classList.contains('skip-link')) return;
    const id = a.getAttribute('href');
    if (id === '#') { e.preventDefault(); return; } // placeholder links
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.8 });
    else if (target === 0) window.scrollTo({ top: 0 });
    else target.scrollIntoView();
  });
}

function initNav() {
  const nav = $('.nav');
  if (!nav) return;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 40);
      nav.classList.toggle('is-hidden', self.direction === 1 && y > window.innerHeight * 0.6);
    },
  });
}

function initClock() {
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
  const el = $('[data-clock]');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });
  const update = () => { el.textContent = fmt.format(new Date()); };
  update();
  setInterval(update, 15000);
}

function initMarquee(lenis) {
  const inner = $('.marquee__inner');
  if (!inner || !lenis) return;
  const skew = gsap.quickTo(inner, 'skewX', { duration: 0.6, ease: 'power3' });
  const anims = $$('.marquee__track').flatMap((t) => t.getAnimations());
  lenis.on('scroll', ({ velocity }) => {
    skew(gsap.utils.clamp(-12, 12, -velocity * 0.3));
    // Scrolling speeds the marquee up; scrolling back reverses it.
    const rate = 1 + gsap.utils.clamp(-5, 5, velocity * 0.12);
    anims.forEach((a) => { a.playbackRate = Math.abs(rate) < 0.2 ? 1 : rate; });
  });
}
