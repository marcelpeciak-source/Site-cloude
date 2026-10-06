# Marcel Pęciak — strony internetowe dla lokalnych firm

Strona ofertowa (do v0.5 demo „Lumora”): strony dla firm z Pajęczna, Działoszyna, Łodzi i Pabianic,
z bezpłatną wizualizacją strony głównej. Statyczna strona z immersyjną sceną WebGL (Three.js, własne shadery), animacjami przewijania
(GSAP + ScrollTrigger + SplitText, Lenis) i mikrointerakcjami. Rozwijana codziennie przez nocną sesję
Claude Code — plan w [ROADMAP.md](ROADMAP.md), założenia w [BRIEF.md](BRIEF.md), historia w [CHANGELOG.md](CHANGELOG.md).

## Uruchomienie

```bash
npm install        # biblioteki + Playwright (tylko do testów)
npm run vendor     # kopiuje/minifikuje biblioteki i fonty do vendor/ (wynik jest w repo; three.js tylko z używanych klas)
npm run social     # obraz do udostępniania (assets/og-image.jpg) i ikony z favicon.svg
npm run serve      # http://localhost:4173
npm run check      # test w Chromium (+ audyt dostępności axe-core) i zrzuty ekranu do screenshots/
npm run lint       # ESLint (js/, scripts/)
npm run consistency # spójność: kotwice, id, ARIA, kształty sceny, pliki, importy/eksporty, numeracja, menu, marka
npm run verify     # lint + consistency + check — obowiązkowe przed każdym commitem
```

Strona nie wymaga budowania — wystarczy dowolny serwer statyczny.

Formularz kontaktowy domyślnie otwiera program pocztowy (`mailto:`). Aby wysyłać zgłoszenia na serwer,
ustaw na `<form class="form">` atrybut `data-endpoint="https://…"` — dane pójdą jako JSON metodą POST.

Jakość grafiki dobiera się sama na podstawie FPS. Do testów: `?quality=max` (zawsze pełne efekty)
albo `?quality=low` (najlżejszy tryb).

## Publikacja (GitHub Pages)

Settings → Pages → *Build and deployment* → Source: **Deploy from a branch** → `main` / `(root)`.
Plik `.nojekyll` jest już w repo.

## Struktura

```
index.html          treść i sekcje (atrybuty data-scene-* sterują chmurą cząsteczek)
css/style.css       style, tokeny kolorów, responsywność, reduced motion
js/main.js          start, preloader, Lenis, ScrollTrigger, odsłanianie treści
js/scene.js         scena Three.js: shadery, morfing, kursor, adaptacja jakości
js/shapes.js        generatory kształtów chmury (sfera, węzeł, fala, helisa, galaktyka)
js/interactions.js  kursor, magnetyczne przyciski, tilt kart
js/work.js          Realizacje: okładki z shadera, podgląd WebGL za kursorem, miniatury
js/postfx.js        post-processing: mip bloom + aberracja chromatyczna (jeden przebieg)
js/menu.js          pełnoekranowe menu mobilne
js/reviews.js       opinie: karuzela 3D (przeciąganie, klawiatura, autoodtwarzanie)
js/form.js          formularz kontaktowy: walidacja, stany, mailto / data-endpoint
scripts/            vendor.mjs (biblioteki), check.mjs (test Playwright), consistency.mjs (audyt spójności)
vendor/             three, gsap, lenis, fonty (generowane)
```

### Sterowanie sceną z HTML

Każda sekcja z `data-scene` przełącza chmurę po wejściu w widok:

```html
<section data-scene="helix" data-scene-x="0" data-scene-y="0" data-scene-scale="1" data-scene-dim="0.6">
```

Kształty: `sphere`, `knot`, `wave`, `helix`, `galaxy`, `cube`, `logo` (nowe dodaje się w `js/shapes.js` + vertex shaderze).
`logo` to napis z `.footer__big` próbkowany z fontu; `data-scene-anchor="<selektor>"` przykleja chmurę do elementu na stronie.
