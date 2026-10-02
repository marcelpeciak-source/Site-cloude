// "Opinie": testimonial cards placed around a 3D cylinder (CSS 3D transforms).
// Drag (mouse / touch), arrow buttons or keyboard arrows rotate it; on release it coasts with
// the drag velocity and snaps to the nearest card. Autoplay advances every few seconds while
// the section is on screen and nobody is interacting. Without JS the cards stay a scroll list.
const { gsap, ScrollTrigger } = window;

const AUTOPLAY_SECONDS = 6;

export function initReviews({ motion }) {
  const section = document.querySelector('.reviews');
  const stage = section?.querySelector('.reviews__stage');
  const ring = section?.querySelector('.reviews__ring');
  if (!stage || !ring) return null;

  const cards = [...ring.querySelectorAll('.review')];
  const count = cards.length;
  const step = 360 / count;
  const indexEl = section.querySelector('[data-review-index]');
  const state = { rot: 0 };
  let radius = 0;
  let current = 0;

  section.classList.add('is-3d');

  function layout() {
    const width = cards[0].offsetWidth;
    // Radius at which neighbouring cards sit side by side with a small gap.
    radius = Math.round((width / 2 + 28) / Math.tan(Math.PI / count));
    cards.forEach((card, i) => {
      card.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`;
    });
    render();
  }

  function render() {
    ring.style.transform = `translateZ(${-radius}px) rotateY(${state.rot}deg)`;
    cards.forEach((card, i) => {
      // Angle of this card relative to the viewer: 0 = front, ±180 = back.
      const a = ((((i * step + state.rot) % 360) + 540) % 360) - 180;
      const facing = Math.cos((a * Math.PI) / 180);
      card.style.opacity = (0.08 + 0.92 * Math.max(0, (facing + 0.35) / 1.35)).toFixed(3);
      const front = Math.abs(a) < step / 2;
      card.classList.toggle('is-front', front);
      card.setAttribute('aria-hidden', String(!front));
    });
  }

  function frontIndex(rot) {
    return ((Math.round(-rot / step) % count) + count) % count;
  }

  function settle() {
    const index = frontIndex(state.rot);
    if (index !== current) {
      current = index;
      if (indexEl) indexEl.textContent = String(index + 1);
    }
    scheduleAutoplay();
  }

  function rotateTo(rot, duration = 1.1) {
    gsap.killTweensOf(state);
    gsap.to(state, {
      rot,
      duration: motion ? duration : 0,
      ease: 'expo.out',
      onUpdate: render,
      onComplete: settle,
    });
  }

  function go(delta) {
    const snapped = Math.round(state.rot / step) * step;
    rotateTo(snapped - delta * step);
  }

  // --- Drag ------------------------------------------------------------------
  let drag = null;

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    gsap.killTweensOf(state);
    drag = { id: e.pointerId, x: e.clientX, rot: state.rot, lastX: e.clientX, lastT: performance.now(), v: 0 };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
    pauseAutoplay();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const degPerPx = step / (cards[0].offsetWidth * 0.9);
    state.rot = drag.rot + (e.clientX - drag.x) * degPerPx;
    const now = performance.now();
    const dt = Math.max(now - drag.lastT, 1);
    // Smoothed velocity in degrees per millisecond.
    drag.v = drag.v * 0.7 + (((e.clientX - drag.lastX) * degPerPx) / dt) * 0.3;
    drag.lastX = e.clientX;
    drag.lastT = now;
    render();
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    stage.classList.remove('is-dragging');
    // Coast with the release velocity, then snap to the nearest card. The velocity fades while
    // the pointer rests, so holding still before letting go doesn't fling the ring onwards.
    const velocity = drag.v * Math.exp(-(performance.now() - drag.lastT) / 60);
    const coast = gsap.utils.clamp(-step * 2, step * 2, velocity * 260);
    const target = Math.round((state.rot + coast) / step) * step;
    drag = null;
    rotateTo(target, 1.2);
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // --- Buttons & keyboard -------------------------------------------------
  section.querySelectorAll('.reviews__btn').forEach((btn) => {
    btn.addEventListener('click', () => go(Number(btn.dataset.dir)));
  });
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });

  // --- Autoplay -----------------------------------------------------------
  let inView = false;
  let hovered = false;
  let focused = false;
  let timer = null;

  function pauseAutoplay() {
    timer?.kill();
    timer = null;
  }
  function scheduleAutoplay() {
    pauseAutoplay();
    if (!motion || !inView || hovered || focused || drag) return;
    timer = gsap.delayedCall(AUTOPLAY_SECONDS, () => go(1));
  }

  // Hover pauses only over the carousel itself — the section is full width, so section-level
  // hover would keep autoplay off whenever a mouse rests anywhere on that part of the page.
  const carousel = section.querySelector('.reviews__carousel') || stage;
  carousel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovered = true; pauseAutoplay(); } });
  carousel.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovered = false; scheduleAutoplay(); } });
  // Only keyboard focus pauses autoplay: a tap also focuses the stage (tabindex), but that
  // focus would linger and keep autoplay off for the rest of the visit.
  section.addEventListener('focusin', (e) => {
    if (!e.target.matches(':focus-visible')) return;
    focused = true;
    pauseAutoplay();
  });
  section.addEventListener('focusout', (e) => {
    if (!section.contains(e.relatedTarget)) { focused = false; scheduleAutoplay(); }
  });
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => { inView = self.isActive; scheduleAutoplay(); },
  });

  window.addEventListener('resize', layout);
  layout();

  return { go, get index() { return current; }, get rotation() { return state.rot; } };
}
