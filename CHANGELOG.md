# Changelog

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
