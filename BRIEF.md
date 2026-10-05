# Brief projektu

> Ten plik jest „źródłem prawdy” dla nocnych sesji pracy nad stroną (codziennie ok. 04:00).
> **Chcesz coś zmienić? Edytuj ten plik** — wskazówki stąd mają pierwszeństwo przed ROADMAP.md.

## Cel

**Od 2026-10-05 (decyzja właściciela): strona ofertowa Marcela Pęciaka — strony internetowe dla lokalnych firm.**
Dotychczasowe demo „Lumora” przerabiamy na prawdziwą stronę, którą zobaczą firmy dostające od właściciela maile
i listy (fryzjerzy, mechanicy, gabinety kosmetyczne, dentyści, firmy budowlane z Pajęczna, Działoszyna, Łodzi i okolic).

- **Odbiorca:** właściciel małej firmy, zwykle bez strony albo z przestarzałą stroną, ogląda na telefonie, nie zna żargonu.
- **Jedno zadanie strony:** przekonać do zamówienia **bezpłatnej wizualizacji strony głównej** (telefon, SMS, e-mail, formularz).
- **Co sprzedajemy językiem korzyści:** więcej telefonów i rezerwacji, widoczność w Google, aktualne godziny/cennik/dojazd
  w jednym miejscu, przycisk „Zadzwoń”, strona gotowa w kilka dni, „resztę biorę na siebie”.
- Efekty 3D/animacje zostają jako pokaz umiejętności („tak może wyglądać Twoja strona”), ale treść ma być prosta,
  a strona szybka także na tanim telefonie.

## Marka i dane (prawdziwe — od 2026-10-05)

| Pole | Wartość | Uwagi |
| --- | --- | --- |
| Nazwa | **Marcel Pęciak — strony internetowe dla lokalnych firm** | robocza; jeśli właściciel poda nazwę marki, podmienić wszędzie |
| Oferta | strony-wizytówki i strony firmowe dla małych firm + **bezpłatna wizualizacja strony głównej** przed decyzją | wizualizacja zaakceptowana przez właściciela 2026-10-04 |
| Telefon | `662 868 774` (`tel:+48662868774`) | klikany na telefonie |
| E-mail | `zrobswojastrone@gmail.com` | z tej skrzynki idą maile do firm; także adres formularza (`mailto:`) |
| Region | Pajęczno, Działoszyn, Łódź, Pabianice i okolice | w treści i w JSON-LD (`areaServed`) |
| Ceny | **nie podawać** | ustalane po wizualizacji; właściciel nie podał cennika |
| Liczby, opinie, realizacje | **żadnych fikcyjnych** | usunąć przykładowe liczby i opinie; przykładowe projekty tylko wyraźnie podpisane „przykład / wizualizacja”; nigdy nazwy prawdziwych firm z listy kontaktów |
| Forma zwracania się | „Państwo” (jak w mailach do firm), prosty język | bez słów typu „konwersja”, „UX”, „brand” |
| Adres strony (SITE_URL) | `https://marcelpeciak-source.github.io/Site-cloude/` | po podpięciu domeny podmień w `index.html`, `robots.txt`, `sitemap.xml` i `npm run social`; `npm run consistency` pilnuje zgodności |
| Sitemap | `sitemap.xml` | pod podścieżką GitHub Pages `robots.txt` nie jest czytany — zgłoś sitemap w Google Search Console (albo podepnij domenę) |
| Formularz kontaktowy | `mailto:` na `zrobswojastrone@gmail.com` | dla wysyłki bez programu pocztowego ustaw `data-endpoint` na `<form>`; formularz zbiera dane → potrzebna polityka prywatności (RODO) |
| Social media | brak | nie wstawiać pustych linków |

**Repozytorium jest publiczne:** nie wpisuj tu ani na stronę danych firm z prywatnej tabeli leadów.

## Kierunek wizualny

- Ciemne tło `#07070b`, ciepła biel `#f3f0ea`, akcenty: fiolet `#8b6cff` → turkus `#3de3d0` → bursztyn `#ffb36b`.
- Typografia: **Syne** (nagłówki, szeroka i charakterna) + **Manrope** (tekst). Fonty hostowane lokalnie.
- Motyw przewodni: **jedna chmura ~22 000 cząsteczek**, która przez całą stronę zmienia kształt
  (sfera → węzeł → galaktyka → helisa DNA → fala → sfera), reaguje na kursor i prędkość przewijania.
- Detale premium: ziarno filmowe, winieta, kursor z etykietami, magnetyczne przyciski, karty z tiltem 3D.

## Zasady techniczne

- Statyczna strona bez kroku budowania (HTML + CSS + moduły ES). Hosting: GitHub Pages z gałęzi `main`.
- Biblioteki w `vendor/` (CDN-y są niedostępne w kontenerze buildowym): Three.js, GSAP (+ScrollTrigger, SplitText), Lenis.
  Nowe biblioteki: `npm i -D <pakiet>` + wpis w `scripts/vendor.mjs` + `npm run vendor`.
- Każda zmiana musi przejść `npm run verify` = `lint` (ESLint) + `consistency` (spójność HTML/JS/plików)
  + `check` (Playwright: zero błędów konsoli; desktop, mobile, reduced motion).
- **Kontrola jakości na koniec każdej sesji** (prośba właściciela, 2026-10-01): przed commitem przegląd kodu
  dzisiejszych zmian pod kątem błędów i spójności; każdy znaleziony błąd odtworzyć, naprawić i potwierdzić testem.
- Zawsze: fallback bez WebGL, `prefers-reduced-motion`, poprawna semantyka i fokus z klawiatury, brak poziomego scrolla na mobile.
- Język strony: polski (ewentualna wersja EN później).
- Dane strukturalne (JSON-LD) bez ocen i recenzji, dopóki nie ma prawdziwych opinii (za zgodą klientów).
- Dostępność: axe-core w `npm run check` — zero naruszeń „serious/critical”.
