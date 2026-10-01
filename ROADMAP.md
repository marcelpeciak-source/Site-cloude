# Roadmapa

Nocna sesja bierze 1–2 pierwsze niezrobione pozycje (albo dopisuje nowy, ambitny pomysł).
Po zrobieniu: `[x]`, data i krótka notka w CHANGELOG.md.

## Zrobione

- [x] **v0.1 — fundament** (2026-09-29): preloader, hero z morfującą chmurą cząsteczek (Three.js + własne shadery),
      Lenis + GSAP ScrollTrigger, marquee reagujące na prędkość scrolla, manifest z odsłanianiem słów,
      karty usług z tiltem 3D, poziomy „pinowany” proces, liczniki, sekcja kontaktu z obracającym się przyciskiem,
      stopka z zegarem, kursor + magnetyczne przyciski, fallbacki (brak WebGL, reduced motion), test Playwright.

- [x] **Realizacje (case studies)** (2026-09-30): 4 projekty z okładkami malowanymi shaderem (bez plików graficznych),
      pływający podgląd WebGL za kursorem z przenikaniem „dissolve” i dystorsją od prędkości; na dotyku / reduced motion
      siatka kart z miniaturami renderowanymi raz tym samym shaderem.
- [x] **Logo z cząsteczek** (2026-09-30): chmura układa się w napis marki w stopce (próbkowanie tekstu z canvasa 2D),
      przyklejona do pozycji i szerokości napisu w DOM; nowy kształt „sześcian” dla sekcji Realizacje.

- [x] **Menu mobilne** (2026-10-01): pełnoekranowe, otwierane okręgiem z przycisku, linki wjeżdżają z masek,
      za menu chmura zamienia się w galaktykę; `inert`, Escape, fokus, blokada scrolla.
- [x] **Post-processing** (2026-10-01): własny „mip bloom” + aberracja chromatyczna zależna od prędkości scrolla
      w jednym przebiegu (bez EffectComposer), z drabiną jakości sterowaną FPS.

## Następne (w kolejności)

- [ ] **Opinie klientów** — karuzela 3D przeciągana myszą/palcem (GSAP Observer/Draggable).
- [ ] **Formularz kontaktowy** — walidacja, animowane stany, fallback `mailto:` (bez zewnętrznych usług bez zgody właściciela).
- [ ] **SEO i udostępnianie** — JSON-LD (Organization), `robots.txt`, `sitemap.xml`, obraz OG wygenerowany z Playwrighta.
- [ ] **Wydajność** — pauza renderu gdy karta jest ukryta, `prefers-reduced-data`, lazy init sceny, audyt Lighthouse.
- [ ] **Strona 404** z własną animacją cząsteczek.
- [ ] **Polityka prywatności / cookies** (RODO) jako podstrona + przejścia stron (View Transitions API).
- [ ] **Wersja EN** (przełącznik języka).
- [ ] **Easter egg** — np. kod Konami → „fajerwerki” z cząsteczek.

## Pomysły na później

- Podstrony case studies (zamiast samych wierszy listy) z przejściem: okładka z podglądu rozszerza się na pełny ekran.

- Dźwięk ambient (WebAudio, domyślnie wyłączony) sterowany scrollem.
- Interaktywny „konfigurator” 3D produktu/usługi.
- Sekcja zespołu z portretami z cząsteczek.
