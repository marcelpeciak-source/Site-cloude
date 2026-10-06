// Full-screen mobile menu: opens as a circle growing out of the toggle button, labels rise
// from line masks, and the particle cloud behind it swirls into a galaxy until it closes.
const { gsap } = window;
const root = document.documentElement;
// Above this width the nav shows its links and the menu button is hidden (see .nav__toggle in CSS).
const NAV_BREAKPOINT = 1000;

export function initMenu({ lenis, scene, motion }) {
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('menu');
  if (!toggle || !menu) return;

  const links = [...menu.querySelectorAll('.menu__link')];
  const labels = menu.querySelectorAll('.menu__label');
  const extras = menu.querySelectorAll('.menu__num, .menu__foot');
  const page = [document.querySelector('main'), document.querySelector('.footer')].filter(Boolean);
  let open = false;
  let tl = null;

  function circle(radius) {
    const r = toggle.getBoundingClientRect();
    return `circle(${radius}px at ${r.left + r.width / 2}px ${r.top + r.height / 2}px)`;
  }

  function fullRadius() {
    const r = toggle.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) + 20;
  }

  function animate(opening) {
    tl?.kill();
    if (!motion) {
      gsap.set(menu, { visibility: opening ? 'visible' : 'hidden', clipPath: 'none' });
      return;
    }
    if (opening) {
      // Visible synchronously, so focus() can land on the first link right away.
      gsap.set(menu, { visibility: 'visible', clipPath: circle(0) });
      tl = gsap.timeline()
        .fromTo(menu, { clipPath: circle(0) }, { clipPath: circle(fullRadius()), duration: 0.9, ease: 'expo.inOut' })
        .fromTo(labels, { yPercent: 115 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.055 }, 0.3)
        .fromTo(extras, { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.03 }, 0.5);
    } else {
      tl = gsap.timeline()
        .to(labels, { yPercent: -115, duration: 0.45, ease: 'power3.in', stagger: 0.03 })
        .to(extras, { opacity: 0, duration: 0.3 }, 0)
        .to(menu, { clipPath: circle(0), duration: 0.7, ease: 'expo.inOut' }, 0.2)
        .set(menu, { visibility: 'hidden' });
    }
  }

  function setOpen(next, { focus = true } = {}) {
    if (next === open) return;
    open = next;
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    menu.inert = !open;
    page.forEach((el) => { el.inert = open; });

    if (open) {
      if (lenis) lenis.stop();
      else root.style.overflow = 'hidden';
      scene?.peek({ shape: 'galaxy', x: 0, y: 0.3, mobileY: 0.8, dim: 0.85 });
    } else {
      if (lenis) lenis.start();
      else root.style.overflow = '';
      scene?.unpeek();
    }

    animate(open);
    if (focus) (open ? links[0] : toggle).focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => setOpen(!open));

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault(); // the global anchor handler skips prevented clicks
      setOpen(false, { focus: false });
      // Scroll while the menu closes, so the section is already there when it uncovers.
      if (lenis) lenis.scrollTo(target, { duration: 1.4 });
      else target.scrollIntoView();
      // Keyboard / screen-reader users continue from the chosen section.
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  // In-page links outside the menu (logo, CTA — the bar sits above the menu) close it first,
  // in the capture phase, so Lenis is running again when the global anchor handler scrolls.
  document.addEventListener('click', (e) => {
    if (!open) return;
    const a = e.target.closest('a[href^="#"]');
    if (a && !menu.contains(a)) setOpen(false, { focus: false });
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (open && window.innerWidth > NAV_BREAKPOINT) setOpen(false, { focus: false });
  });
}
