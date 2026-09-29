# Roadmapa

Nocna sesja bierze 1–2 pierwsze niezrobione pozycje (albo dopisuje nowy, ambitny pomysł).
Po zrobieniu: `[x]`, data i krótka notka w CHANGELOG.md.

## Zrobione

- [x] **v0.1 — fundament** (2026-09-29): preloader, hero z morfującą chmurą cząsteczek (Three.js + własne shadery),
      Lenis + GSAP ScrollTrigger, marquee reagujące na prędkość scrolla, manifest z odsłanianiem słów,
      karty usług z tiltem 3D, poziomy „pinowany” proces, liczniki, sekcja kontaktu z obracającym się przyciskiem,
      stopka z zegarem, kursor + magnetyczne przyciski, fallbacki (brak WebGL, reduced motion), test Playwright.

## Następne (w kolejności)

- [ ] **Realizacje (case studies)** — sekcja z 3–4 projektami; okładki generowane shaderem (bez zdjęć),
      efekt dystorsji/fali WebGL na hover, podgląd podążający za kursorem.
- [ ] **Logo z cząsteczek** — nowy kształt chmury: napis „Lumora” próbkowany z canvasa 2D; pojawia się w sekcji kontaktu/stopce.
- [ ] **Menu mobilne** — pełnoekranowe, z animacją maski i dużą typografią (dziś na mobile są tylko logo + CTA).
- [ ] **Post-processing** — subtelny bloom + aberracja chromatyczna (three/addons przez `THREE_ADDONS` w vendor.mjs), z adaptacją jakości.
- [ ] **Opinie klientów** — karuzela 3D przeciągana myszą/palcem (GSAP Observer/Draggable).
- [ ] **Formularz kontaktowy** — walidacja, animowane stany, fallback `mailto:` (bez zewnętrznych usług bez zgody właściciela).
- [ ] **SEO i udostępnianie** — JSON-LD (Organization), `robots.txt`, `sitemap.xml`, obraz OG wygenerowany z Playwrighta.
- [ ] **Wydajność** — pauza renderu gdy karta jest ukryta, `prefers-reduced-data`, lazy init sceny, audyt Lighthouse.
- [ ] **Strona 404** z własną animacją cząsteczek.
- [ ] **Polityka prywatności / cookies** (RODO) jako podstrona + przejścia stron (View Transitions API).
- [ ] **Wersja EN** (przełącznik języka).
- [ ] **Easter egg** — np. kod Konami → „fajerwerki” z cząsteczek.

## Pomysły na później

- Dźwięk ambient (WebAudio, domyślnie wyłączony) sterowany scrollem.
- Interaktywny „konfigurator” 3D produktu/usługi.
- Sekcja zespołu z portretami z cząsteczek.
