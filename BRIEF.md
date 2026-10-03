# Brief projektu

> Ten plik jest „źródłem prawdy” dla nocnych sesji pracy nad stroną (codziennie ok. 04:00).
> **Chcesz coś zmienić? Edytuj ten plik** — wskazówki stąd mają pierwszeństwo przed ROADMAP.md.

## Cel

Strona biznesowa, która robi wrażenie od pierwszej sekundy: immersyjne 3D (WebGL), płynne
animacje przewijania i mikrointerakcje — a przy tym szybka, dostępna i czytelna na telefonie.

## Marka (placeholder — do podmiany)

| Pole | Obecna wartość | Uwagi |
| --- | --- | --- |
| Nazwa | **Lumora** (Lumora Studio) | fikcyjna nazwa robocza |
| Branża | studio cyfrowych doświadczeń dla biznesu | strategia, design, strony 3D |
| E-mail | `kontakt@lumora.example` | domena `.example` = placeholder |
| Liczby w sekcji „Wyniki” | 120+, 3,4×, 98%, 24 | **przykładowe** — podmienić na prawdziwe |
| Social media | linki `#` | uzupełnić |
| Opinie klientów (sekcja 06) | 6 przykładowych cytatów | **placeholder** — zastąpić prawdziwymi, za zgodą klientów |
| Adres strony (SITE_URL) | `https://marcelpeciak-source.github.io/Site-cloude/` | po podpięciu domeny podmień w `index.html`, `robots.txt`, `sitemap.xml` i `npm run social`; `npm run consistency` pilnuje zgodności |
| Sitemap | `sitemap.xml` | pod podścieżką GitHub Pages `robots.txt` nie jest czytany — zgłoś sitemap w Google Search Console (albo podepnij domenę) |
| Formularz kontaktowy | wysyła przez `mailto:` | dla wysyłki bez programu pocztowego ustaw `data-endpoint` na `<form>` (usługa formularzy lub własny backend) |
| Miasta | Warszawa · Kraków · zdalnie | |

Jeśli strona ma być dla konkretnej firmy — wpisz tu jej nazwę, branżę, ofertę, dane kontaktowe
i ton komunikacji, a kolejna nocna sesja przerobi treści.

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
- Dane strukturalne (JSON-LD) bez ocen i recenzji, dopóki opinie są przykładowe.
- Dostępność: axe-core w `npm run check` — zero naruszeń „serious/critical”.
