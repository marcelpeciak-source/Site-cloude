# Changelog

## 2026-10-02 — v0.4 opinie klientów + formularz kontaktowy

- **Opinie** (`js/reviews.js`, sekcja 06): 6 kart na obracającym się cylindrze 3D; przeciąganie myszą/palcem
  z bezwładnością i dociąganiem do najbliższej karty, przyciski ←/→, strzałki klawiatury, licznik „N / 6”
  (aria-live), autoodtwarzanie co 6 s (pauza przy najechaniu na karuzelę, fokusie z klawiatury, poza ekranem,
  wyłączone przy reduced motion). Bez JS: zwykła przewijana lista. Treści opinii są przykładowe.
- **Formularz kontaktowy** (`js/form.js`, sekcja Kontakt 07): pływające etykiety, „chipsy” zakresu i budżetu,
  zgoda RODO, walidacja z polskimi komunikatami (`aria-invalid`, `aria-describedby`, fokus na pierwszym błędzie,
  lekkie „potrząśnięcie”), stan ładowania, animowany stan sukcesu (rysowany znacznik + wir chmury `scene.burst()`).
  Wysyłka: `mailto:` z gotowym tematem i treścią albo POST JSON na `data-endpoint`; honeypot na boty;
  bez JS — natywna walidacja i `action="mailto:"`.
- Menu mobilne: nowa pozycja „Opinie”; sekcje przenumerowane do 07.
- `npm run check`: przeciągnięcie karuzeli (musi zmienić kartę), autoodtwarzanie, pusty i poprawny formularz
  (asercje stanów), sprawdzenie fontu wszystkich przycisków; `npm run consistency`: etykiety pól, legendy,
  `type` przycisków, numeracja slajdów, adres w `data-mailto`/`action`.

**Kontrola jakości (koniec sesji):**
- Przegląd zrzutów: stan „wysłane” pokazywał pola formularza (CSS `display:flex` nadpisywał `hidden`);
  etykieta pola z błędem traciła kolor przy fokusie; przyciski `<button>` miały systemowy font
  → poprawione, każde zabezpieczone testem.
- Przegląd kodu (5 zgłoszeń, wszystkie odtworzone testem i naprawione):
  1. bez JS formularz wysyłał dane do adresu strony (`?name=…`) — dodana ścieżka `action="mailto:"`;
  2. podwójne Enter = podwójna wysyłka — blokada w trakcie wysyłania;
  3. przy `data-endpoint` podziękowanie mówiło o programie pocztowym — osobny tekst dla obu trybów;
  4. dotknięcie karuzeli wyłączało autoodtwarzanie na stałe — pauzuje tylko fokus z klawiatury;
  5. puszczenie po zatrzymaniu przeciągania „przerzucało” karty — prędkość wygasa w spoczynku.
- Dodatkowo wykryte testem: pauza „przy najechaniu” obejmowała całą (pełnoszeroką) sekcję, więc na desktopie
  autoodtwarzanie praktycznie nie działało — zawężona do samej karuzeli.

## 2026-10-01 — kontrola jakości (na prośbę właściciela)

- Nowy stały krok na koniec każdej sesji: `npm run lint` (ESLint, flat config) + `npm run consistency`
  (audyt spójności: kotwice ↔ id, ARIA, kształty `data-scene`, pliki lokalne i `url()` w CSS, importy ↔ eksporty
  modułów, numeracja sekcji i menu, kompletność menu mobilnego, nazwy dostępne, spójność marki i e-maila)
  + przegląd kodu zmian dnia. `npm run verify` uruchamia całość. Audyt sprawdzony na celowo zepsutej kopii (5/5 błędów wykrytych).
- Naprawione po pierwszym przeglądzie (v0.3):
  - przy otwartym menu kliknięcie logo lub „Porozmawiajmy” w pasku nie zamykało menu ani nie przewijało
    (Lenis był zatrzymany) — teraz takie linki najpierw zamykają menu;
  - urządzenia z limitem 30 FPS (ekran 30 Hz, tryb oszczędzania) spadały na najniższą jakość, choć nie były
    przeciążone — krok w dół, który nie podnosi FPS, jest cofany i pomiar się kończy.
- Porządki z ESLint: `const` zamiast `let`, usunięte przesłanianie zmiennych (m.in. indeks szczebla helisy).

## 2026-10-01 — v0.3 menu mobilne + post-processing

- **Post-processing** (`js/postfx.js`): scena renderowana do tekstury z mipmapami, a jeden końcowy przebieg dodaje
  poświatę z kilku rozmytych poziomów mipmap („mip bloom”, zamiast wieloprzebiegowego blur) oraz radialną
  aberrację chromatyczną, która rośnie przy szybkim przewijaniu.
- **Drabina jakości** zamiast jednorazowego pomiaru: mierzy FPS w oknach 2,5 s (od końca intro) i schodzi stopniami:
  post-fx → DPR 1 → 60% cząsteczek. Telefony startują bez post-fx. `?quality=max` / `?quality=low` wymuszają poziom.
- **Menu mobilne** (`js/menu.js`): przycisk burger → X, pełnoekranowe menu odsłaniane okręgiem z pozycji przycisku,
  duża typografia wjeżdżająca z masek, w tle chmura cząsteczek zmienia się w galaktykę (`scene.peek/unpeek`),
  a treść strony gaśnie. Dostępność: `aria-expanded`, `inert` na treści, Escape, fokus na pierwszy link
  i do wybranej sekcji po nawigacji, blokada scrolla. Bez animacji przy reduced motion.
- Nawigacja na wąskich ekranach (≤ 480 px): mniejsze logo i CTA, żeby przycisk menu nie wchodził na margines.
- `npm run check`: desktop z `?quality=max` (efekty widoczne na zrzutach), zrzut otwartego menu na mobile,
  raport poziomu jakości, nowy test „elementy nawigacji mieszczą się w pasku”.

## 2026-09-30 — v0.2 Realizacje + logo z cząsteczek

- Nowa sekcja **Realizacje** (Aurora, Monolit, Halo, Pulse — projekty przykładowe): okładki generowane w fragment shaderze
  (zorza, monolit z odbiciem w wodzie, pastelowe metaballe, neonowy tunel).
  - Desktop (mysz): duże wiersze z wypełnianiem konturu nazwy, pływający podgląd WebGL za kursorem,
    przenikanie szumem między projektami, rozmycie RGB i „płynna” dystorsja zależna od prędkości kursora.
  - Dotyk / reduced motion: siatka kart z miniaturami wyrenderowanymi raz tym samym shaderem (kontekst WebGL od razu zwalniany);
    bez WebGL — gradienty CSS.
- **Logo z cząsteczek**: w stopce chmura układa się w napis marki (tekst próbkowany z canvasa po załadowaniu fontu),
  przyklejony do pozycji/szerokości napisu `.footer__big`, który zostaje jako niewidoczna kotwica (widoczny bez WebGL/animacji).
- Nowy kształt chmury: **sześcian** (krawędzie + ściany).
- Poprawka: adaptacja jakości przy niskim FPS ucinała dolną część kształtów (punkty były uporządkowane);
  teraz punkty są generowane w permutowanej kolejności, więc `drawRange` daje równomierną podpróbkę.
- Nawigacja/stopka: link „Realizacje”, przenumerowane sekcje (01–06).
- `npm run check`: czyści stare zrzuty, dodany zrzut sekcji Realizacje oraz zrzut z najechaniem myszą (podgląd WebGL).

## 2026-09-29 — v0.1 fundament

- Struktura strony (PL): hero, marquee, O nas (manifest), Usługi, Proces, Wyniki, Kontakt, stopka.
- Scena WebGL: ~22k cząsteczek (10k na mobile), 5 kształtów morfowanych przez wagi w vertex shaderze,
  szum simplex, odpychanie kursorem, „wybuch” na starcie, agitacja przy szybkim scrollu, adaptacja jakości przy niskim FPS.
- Animacje: preloader z licznikiem, wejście tytułu litera po literze (SplitText), odsłanianie linii nagłówków,
  manifest „zapalany” słowo po słowie, poziomy pin procesu (desktop), liczniki, marquee zależne od prędkości.
- Interakcje: własny kursor z etykietami, magnetyczne przyciski, tilt 3D kart usług z podświetleniem.
- Dostępność: skip link, fokus, `prefers-reduced-motion` (statyczna scena, brak animacji), fallback bez WebGL,
  failsafe gdy skrypty się nie wczytają.
- Fonty Syne + Manrope hostowane lokalnie; biblioteki w `vendor/` (`npm run vendor`).
- `npm run check` — Playwright: błędy konsoli, overflow, zrzuty każdej sekcji (desktop / mobile / reduced motion).
