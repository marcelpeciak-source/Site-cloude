# Roadmapa

> **Wznowione 2026-10-05** (wstrzymane 2026-10-04). Nowy kierunek od właściciela: demo „Lumora” staje się
> **stroną ofertową Marcela Pęciaka — strony dla lokalnych firm** (szczegóły w BRIEF.md, który ma pierwszeństwo).

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

- [x] **Opinie klientów** (2026-10-02): karuzela na cylindrze 3D (CSS 3D), przeciąganie z bezwładnością i dociąganiem,
      strzałki + klawiatura, autoodtwarzanie z pauzą; bez JS — przewijana lista.
- [x] **Formularz kontaktowy** (2026-10-02): walidacja z komunikatami po polsku, stany ładowania i sukcesu,
      wysyłka przez `mailto:` lub `data-endpoint` (POST JSON), honeypot, ścieżka awaryjna bez JS.

- [x] **SEO i udostępnianie** (2026-10-03): canonical, Open Graph/Twitter, JSON-LD (ProfessionalService),
      `robots.txt`, `sitemap.xml`, manifest + ikony, obraz OG 1200×630 z prawdziwej sceny (`npm run social`).
- [x] **Wydajność** (2026-10-03): three.js tylko z używanymi klasami (−29%), `modulepreload`, leniwy WebGL
      w Realizacjach, tryb oszczędzania danych, rysowanie co drugiej klatki w bezczynności, audyt dostępności axe-core
      w każdym `npm run check` (Lighthouse nie działa stabilnie na programowym GL w kontenerze).

## Następne (w kolejności)

- [ ] **v0.6 — przebudowa treści na stronę ofertową** (zgodnie z BRIEF.md): nowy `<title>`, opis, hero
      („Strony internetowe dla firm z Pajęczna, Działoszyna, Łodzi…” + przycisk „Bezpłatna wizualizacja”),
      usługi językiem korzyści (strona-wizytówka, strona firmowa, widoczność w Google/wizytówka Google, opieka),
      proces w 4 krokach (rozmowa → bezpłatna wizualizacja → strona w kilka dni → opieka),
      sekcję liczb i przykładowe opinie zastąpić czymś prawdziwym (np. „Co dostajesz” / FAQ),
      kontakt: klikany telefon, e-mail, formularz na `zrobswojastrone@gmail.com`; stopka, preloader, logo z cząsteczek,
      meta/OG/JSON-LD (`ProfessionalService` z `areaServed`, bez ocen), nowy obraz OG (`npm run social`).
      Zero „Lumora” w plikach strony (README/CHANGELOG mogą wspominać historię).
- [ ] **v0.7 — przykłady dla branż**: sekcja „Realizacje” → „Przykłady” + 4–5 lekkich podstron demo
      (fryzjer, mechanik, gabinet kosmetyczny, dentysta, firma budowlana) z fikcyjną, wyraźnie podpisaną firmą
      („przykład”); te same podstrony służą jako szablony do szybkich bezpłatnych wizualizacji.
- [ ] **v0.8 — polityka prywatności** (RODO dla formularza i kontaktu) jako podstrona + **strona 404** z animacją cząsteczek.
- [ ] **v0.9 — szybkość i lokalne SEO**: tryb lekki na słabych telefonach, test na emulacji wolnego CPU/sieci,
      treści i nagłówki pod lokalne wyszukiwania (Pajęczno, Działoszyn, Łódź, Pabianice), dostępność.

## Pomysły na później

- Domena + Google Search Console + wizytówka Google właściciela (wymaga działań właściciela).
- Przejścia stron (View Transitions API) między stroną główną a przykładami.
- Podstrony przykładów z przejściem: okładka z podglądu rozszerza się na pełny ekran.
- Easter egg — np. kod Konami → „fajerwerki” z cząsteczek.
- Wersja EN (raczej niepotrzebna przy lokalnych klientach).
- Dźwięk ambient (WebAudio, domyślnie wyłączony) sterowany scrollem.
