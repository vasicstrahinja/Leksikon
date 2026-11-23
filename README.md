# Moj leksikon

Digitalni leksikon (spomenar): ljudi otključaju stranicu šifrom, popune formu i listaju upise drugih.

## Fajlovi

- `index.html`: cijela aplikacija (forma, listanje, postavke)
- `pitanja.csv`: zadana pitanja

## Pitanja (CSV)

Kolone `pitanje;tip;opcije` (radi i zarez umjesto tačka-zareza).

| tip | izgled |
|---|---|
| `kratko` | jedan red teksta |
| `dugo` | veće polje za tekst |
| `broj` | broj |
| `datum` | kalendar |
| `izbor` | ponuđeni odgovori, opcije odvojene sa `\|` |

Ako pitanje završava sa `*`, obavezno je. Vlasnik može učitati novi CSV u Postavkama, a ta pitanja onda zamjenjuju `pitanja.csv`.

## Šifra

Zadana šifra je `leksikon`. Vlasnik je mijenja u Postavkama, a čuva se samo njen SHA-256 hash. Šifra služi da stranicu ne otvori bilo ko, ali nije prava zaštita podataka.

## Napomena o pokretanju

Stranica čuva upise preko `claude.use("db")` i `claude.use("user")`, a te funkcije postoje samo kad je stranica objavljena kao Claude artifact na claude.ai. Ako je otvoriš direktno iz ovog repoa ili preko GitHub Pages, forma će se prikazati, ali upisi se neće spremati. Za samostalni hosting treba zamijeniti sloj za podatke drugim backendom, npr. Firebase ili Supabase.
