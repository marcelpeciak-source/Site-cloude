# Changelog

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
