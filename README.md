# Ryzyko zakażenia w kabinie Boeinga 737

Interaktywna symulacja ryzyka zakażenia w kabinie Boeinga 737.

Wszystkie obliczenia wykonuje przeglądarka, aplikacja nie ma backendu. Cały stan (parametry, widok, język) jest zapisany w adresie URL, więc link albo kod QR otwiera dokładnie ten sam widok.

## Uruchomienie

Wymagany Node.js 20 lub nowszy.

```bash
npm install
npm run dev
```

Aplikacja działa pod adresem http://localhost:3000.

## Testy

```bash
npm test
```

Testy (Vitest) sprawdzają model na wartościach odniesienia ze sprawozdania z tolerancją 0,15 punktu procentowego: odległość od chorego, wentylację, chorobę, maseczki, czas 8 h i oczekiwaną liczbę zakażonych E. Sprawdzają też odczyt adresu URL z błędnymi wartościami.

Sprawdzenie typów: `npm run typecheck`.

## Budowanie

```bash
npm run build
npm start
```

## Wdrożenie na Vercel

Jednorazowo: `npm i -g vercel`, potem `vercel login`.

```bash
vercel          # wersja podglądowa (preview)
vercel --prod   # wersja produkcyjna
```

Vercel sam wykrywa Next.js, żadna konfiguracja nie jest potrzebna. Obrazek podglądu linku (Open Graph) jest generowany przy budowaniu.

## Kod QR do slajdu

```bash
npm run qr -- https://twoj-adres.vercel.app
```

Tworzy `qr/qr.svg` i `qr/qr.png` (1024 px, korekcja błędów H, margines 4 moduły). SVG najlepiej skaluje się na slajdzie.

## Parametry w adresie URL

| Klucz | Znaczenie | Zakres |
|---|---|---|
| `ach` | wymiany powietrza na godzinę | 3 do 40 |
| `d` | choroba: `flu`, `covid`, `measles`, `custom` | |
| `q` | emisja dla choroby własnej [kwanty/h] | 1 do 2000 |
| `mo`, `mi` | skuteczność maseczki przy wydechu i wdechu [%] | 0 do 95 |
| `T` | czas lotu [h] | 0,5 do 12 |
| `pax` | liczba pasażerów (co 6, czyli pełne rzędy) | 108 do 216 |
| `br` | mieszanie wzdłuż kabiny β / Q_r | 0,3 do 10 |
| `s` | miejsca chorych, np. `s=15C,15D,23A` (kilku w jednym rzędzie też można) | |
| `me` | Twój rząd | |
| `v` | widok: `time`, `map`, `distance` | |
| `cb` | porównanie: `ventilation`, `distance`, `disease`, `masks`, `mixing` | |
| `ab=1` | porównanie dwóch scenariuszy, parametry B z przedrostkiem `b` (np. `bach=6`) | |
| `lang=en` | wersja angielska | |

Błędne lub skrajne wartości są przycinane do dozwolonego zakresu, więc żaden link nie zepsuje aplikacji.

## Struktura

- `lib/model.ts`: obliczenia
- `lib/state.ts`: parametry, zapis i odczyt adresu URL
- `lib/model.test.ts`: testy
- `components/`: wykresy, mapa siedzeń, ustawienia
- `app/opengraph-image.tsx`: obrazek podglądu linku
- `scripts/qr.mjs`: generator kodu QR

Symulacja orientacyjna, rząd wielkości, nie prognoza.

## Licencja

MIT, szczegóły w pliku [LICENSE](LICENSE).
