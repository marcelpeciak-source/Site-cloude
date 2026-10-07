# Changelog

## 2026-10-07 — v0.7 podstrony przykładów (i szablon bezpłatnych wizualizacji)

- **Podstrony przykładów:** każdy wiersz sekcji „Przykłady” otwiera stronę fikcyjnej firmy — Salon Fryzjerski Lazur,
  Auto Serwis Tłok, Gabinet Stomatologiczny Szkliwo, Firma Remontowa Poziomica. Lekkie (bez WebGL i bibliotek),
  najpierw pod telefon: oferta, cennik („ceny przykładowe”), galeria / kroki naprawy / pierwsza wizyta, godziny,
  dojazd i formularz. Na górze zawsze pasek „Przykładowa strona — fikcyjna firma” z powrotem do przykładów
  i „Chcę taką stronę”; `noindex`, bez numerów telefonów (przyciski-atrapy pokazują, co zrobią w gotowej stronie).
- **Rzeczy, które sprzedają stronę małej firmie:** status „Teraz otwarte · do 18:00” / „otwieramy jutro o 8:00”
  liczony wg czasu w Polsce, dzisiejszy dzień wyróżniony w godzinach, na telefonie stały pasek „Zadzwoń / Umów /
  Dojazd”, miejsca na zdjęcia z podpisem, co tam będzie.
- **Jeden szablon, dane w JSON:** `przyklady/dane/*.json` → `npm run przyklady`. Generator sprawdza dane (godziny,
  wymagane pola, kontrast kolorów WCAG ≥ 4.5:1 dla każdej pary tekst/tło) i nie wpuści do przykładu telefonu ani e-maila.
- **`npm run wizualizacja -- plik.json`:** ten sam szablon dla prawdziwej firmy — prawdziwy `tel:`, link do Map Google,
  pasek „Wizualizacja strony głównej dla … — projekt: Marcel Pęciak”; wynik to jeden plik (style, fonty, skrypt w środku)
  w `wizualizacje/`, które są w `.gitignore` (repo jest publiczne).
- **Strona główna:** cały wiersz/karta przykładu jest linkiem (kursor „Zobacz”, na kartach „Otwórz przykład →”),
  nowy opis pod listą. `npm run standalone` linkuje przykłady do opublikowanej strony.
- `npm run consistency`: przykłady aktualne względem danych, każdy podlinkowany z „Przykładów”, `noindex`, pasek
  „Przykładowa strona”, działające kotwice i pliki, brak cudzych `tel:`/`mailto:`, dane kontaktowe w generatorze = index.html.
- `npm run check`: każdy przykład na komputerze i telefonie — zero błędów konsoli, brak poziomego scrolla, axe-core,
  status godzin przy ustawionym zegarze (środa 10:30 i niedziela 12:00), komunikat przycisku-atrapy, formularz pokazowy.

**Kontrola jakości (koniec sesji):**
- `npm run verify` bez błędów (strona główna: desktop, telefon, reduced motion; 4 przykłady × 2 ekrany).
- Testy sprawdzone „na odwrót”: z celowo zepsutym szablonem (strefa czasowa UTC, formularz bez czyszczenia)
  i nieaktualnym/niepodlinkowanym przykładem testy zgłaszają błędy; walidator wyłapuje zły kontrast, zakres godzin
  i telefon w przykładzie.
- Zrzuty: w galerii co drugi kafelek był pusty (zmienna CSS odwołująca się do samej siebie) — osobna zmienna `--ph`;
  na telefonie długa nazwa gabinetu w przyklejonym nagłówku zajmowała 3 linie — na telefonie nagłówek nie jest
  przyklejony (kontakt jest w dolnym pasku) i ma mniejsze logo.
- Wizualizacja testowa (fikcyjne dane) otwarta z dysku (`file://`): bez błędów, fonty i status działają, plik usunięty.

## 2026-10-06 — v0.6 strona ofertowa (Marcel Pęciak — strony dla lokalnych firm)

Kierunek od właściciela (2026-10-05): demo „Lumora” staje się prawdziwą stroną ofertową. Dane kontaktowe z BRIEF.md.

- **Treść:** hero „Niech klienci znajdą Państwa w Google.” z przyciskiem „Bezpłatna wizualizacja”; O mnie (pierwsza
  osoba, forma „Państwo”); Oferta: strona-wizytówka, strona firmowa, widoczność w Google, opieka; Przykłady
  (fryzjer, warsztat, dentysta, remonty) wyraźnie podpisane „Przykład”, bez fikcyjnych wyników; Jak to działa
  (rozmowa → bezpłatna wizualizacja → gotowa strona → opieka); **Konkrety** zamiast wymyślonych liczb
  (0 zł za wizualizację, 4 kroki, 100% stron najpierw pod telefon, 1 osoba do kontaktu); **Pytania i odpowiedzi**
  w karuzeli 3D zamiast przykładowych opinii; kontakt z klikanym telefonem i e-mailem; stopka i logo z cząsteczek
  z nazwiskiem. Zero „Lumora” w plikach strony.
- **Formularz:** pod bezpłatną wizualizację — nowe pole telefonu, „Firma i miejscowość”, zakres i „Czy firma ma już
  stronę?” (zamiast budżetu), krótka informacja RODO przy zgodzie, komunikaty w formie „Państwo”, temat maila
  „Bezpłatna wizualizacja — …”.
- **Nawigacja:** na telefonie przycisk „Zadzwoń” (tel:) zamiast dłuższego CTA; menu-hamburger do 1000 px
  (imię i nazwisko + 5 linków + CTA nie mieściły się w jednym rzędzie między 821 a 1000 px).
- **SEO:** nowy `<title>`, opis, OG/Twitter, JSON-LD `ProfessionalService` z telefonem, `areaServed` (Pajęczno,
  Działoszyn, Łódź, Pabianice) i ofertą „Bezpłatna wizualizacja” za 0 zł; manifest; nowy obraz OG (`npm run social`).
- **Logo z cząsteczek:** font ładowany razem z podzbiorem polskich znaków (`document.fonts.load(…, tekst)`),
  żeby „ę” w nazwisku nie wypadło z innego kroju.
- `npm run consistency`: jeden numer telefonu na stronie, każdy link `tel:` pokazuje numer, który wybiera,
  JSON-LD `telephone` zgodny z linkami.

**Kontrola jakości (koniec sesji):**
- `npm run verify` — lint, spójność i Playwright (desktop, telefon, reduced motion, axe-core) bez błędów.
- Zrzuty: nagłówek strony w pierwszej wersji zajmował 4 wiersze i wypychał przyciski poza ekran (axe zgłosił też
  kontrast podpisu „Przewiń”) — krótszy nagłówek i lead; na telefonie nazwisko i CTA w nawigacji łamały się na dwie
  linie — przycisk „Zadzwoń” i mniejsze logo (zmierzone dla 320–600 px); długie nazwy przykładów skrócone.
- Przegląd kodu: **duży napis w stopce na telefonach ≤ 390 px wychodził poza margines i był przycinany**
  (nazwa nie zawija się, bo logo z cząsteczek próbkuje jedną linię) — odtworzone pomiarem, naprawione skalowaniem
  `clamp(22px, 7.4vw, 140px)`, dopisany test w `npm run check` (sprawdzony: na starej wersji zgłasza błąd);
  komunikat błędu zgody nie pokazałby się, bo `aria-describedby` wskazuje teraz notkę i błąd — `form.js`
  szuka komunikatu w polu, a nie po pojedynczym id.

## 2026-10-03 — v0.5 SEO, udostępnianie, wydajność, dostępność

- **SEO / udostępnianie:** `canonical`, Open Graph + Twitter Card z obrazem 1200×630 (`assets/og-image.jpg` — zrzut
  prawdziwego hero), JSON-LD `ProfessionalService` (bez ocen — opinie są przykładowe), `robots.txt`, `sitemap.xml`,
  `site.webmanifest` + ikony 180/192/512. Nowy skrypt `npm run social` generuje obraz OG i ikony w Chromium.
  Adres strony (SITE_URL) to adres GitHub Pages repozytorium — do zmiany po podpięciu domeny.
- **Wydajność:** three.js budowany tylko z używanych klas (742 → 536 KB, gzip 191 → 135 KB; lista z `THREE.*` w `js/`),
  `modulepreload` całego grafu modułów, WebGL podglądu/miniatur w Realizacjach tworzony dopiero przy zbliżeniu do sekcji,
  Save-Data / `prefers-reduced-data` → najlżejsza jakość, po 6 s bez interakcji scena rysuje co drugą klatkę.
- **Dostępność:** axe-core (silnik Lighthouse) w każdym `npm run check` — na starcie i po interakcjach;
  serious/critical przerywają test. Naprawione zgłoszenia: `aria-label` na `<span>` tytułu (SplitText) i na `<p>`
  manifestu, kontrast „ściemnionych” słów manifestu (teraz kolor zamiast przezroczystości, ≥ 3:1), kontrast kart
  bocznych karuzeli i dopisku „(opcjonalnie)”, `<figure role="group">` → `<div>`, menu mobilne jako `role="dialog"`.
- `npm run consistency`: jeden `<h1>` i hierarchia nagłówków, komplet meta tagów, jeden adres strony wszędzie
  (canonical/OG/JSON-LD/robots/sitemap), istnienie obrazów i ikon, `modulepreload` dla każdego modułu,
  klasy `THREE.*` obecne w paczce. Wspólny `scripts/static-server.mjs` dla skryptów.

**Kontrola jakości (koniec sesji):**
- Przegląd zrzutów: na telefonie strona była szersza niż ekran (476 px w 390 px) przez boczne karty karuzeli 3D —
  **błąd istniał od v0.4**; test przepełnienia go nie łapał, bo porównywał z `innerWidth`, który mobilny Chrome
  poszerza razem z treścią. Naprawione (`overflow-x: clip` na sekcji) i test poprawiony (porównanie z zadaną
  szerokością ekranu; potwierdzone, że bez poprawki zgłasza błąd).
- Przegląd kodu (2 zgłoszenia): intro mogło grać w połowie klatek, gdy strona ładowała się > 6 s (licznik bezczynności
  startował przed intro) — odtworzone na spowolnionych fontach i naprawione; `robots.txt` pod podścieżką nie jest
  czytany przez wyszukiwarki — opisane w BRIEF/README, audyt wypisuje przypomnienie.

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
