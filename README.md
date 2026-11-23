# Moj leksikon

Digitalni leksikon kao onaj iz škole. Svaka strana je jedno pitanje, a ispod njega su odgovori svih ljudi. Svako ima isti redni broj na svakoj strani, a novi ljudi odgovaraju u poslednjem redu. Stranica se otključava šifrom.

Radi besplatno: stranica je na **GitHub Pages**, a odgovori se čuvaju u tvojoj **Google tabeli**.

## Fajlovi

| fajl | šta je |
|---|---|
| `index.html` | stranica leksikona |
| `pitanja.csv` | pitanja, po jedno u redu |
| `config.js` | adresa tvoje Google tabele (Apps Script) |
| `apps-script/Code.gs` | kod koji nalepiš u Google tabelu |
| `claude-artifact/` | verzija koja radi na claude.ai |

## Podešavanje (jednom, oko 10 minuta)

### 1. Google tabela

1. Otvori [sheets.new](https://sheets.new) i nazovi tabelu, npr. „Leksikon“.
2. U meniju izaberi **Extensions → Apps Script**.
3. Obriši sve što piše u editoru i nalepi ceo sadržaj fajla `apps-script/Code.gs`. Sačuvaj (ikonica diskete).
4. Gore u padajućem meniju izaberi funkciju `setup` i klikni **Run**. Google će tražiti dozvolu. Izaberi svoj nalog, pa **Advanced → Go to … (unsafe) → Allow**. To je tvoj kod, pa je bezbedno.
5. U tabeli su se pojavila dva lista: **Upisi** i **Postavke**. U listu **Postavke**, u ćeliju **B1**, upiši svoju šifru (umesto `leksikon`).

### 2. Objavi skript

1. U Apps Script-u klikni **Deploy → New deployment**.
2. Kod „Select type“ izaberi **Web app**.
3. Za **Execute as** izaberi **Me**, a za **Who has access** izaberi **Anyone**.
4. Klikni **Deploy** i kopiraj **Web app URL** (završava se sa `/exec`).

### 3. Poveži stranicu

1. Na GitHubu otvori `config.js` i klikni olovčicu (Edit).
2. Nalepi adresu između navodnika:
   ```js
   window.LEKSIKON_API = "https://script.google.com/macros/s/.../exec";
   ```
3. Klikni **Commit changes**.

### 4. Uključi GitHub Pages

1. U repou otvori **Settings → Pages**.
2. Pod **Source** izaberi **Deploy from a branch**, granu `main` i folder `/ (root)`, pa **Save**.
3. Posle minut-dva leksikon je na adresi `https://vasicstrahinja.github.io/Leksikon/`.

Tu adresu i šifru pošalji ljudima.

## Svakodnevno

- **Odgovori:** vidiš ih u listu **Upisi**. Jedan red je jedna osoba, jedna kolona je jedno pitanje.
- **Brisanje upisa:** obriši ceo red u tabeli. Ljudi ispod se pomere za jedan broj gore.
- **Promena šifre:** promeni ćeliju B1 u listu **Postavke**. Ljudi će morati da unesu novu šifru.
- **Promena pitanja:** izmeni `pitanja.csv` na GitHubu. Odgovori se vezuju za tekst pitanja, pa ako preimenuješ pitanje, stari odgovori ostaju u staroj koloni u tabeli.
- **Ako promeniš `Code.gs`:** Deploy → Manage deployments → olovčica → Version: New version → Deploy. Adresa ostaje ista.

## Pitanja (CSV)

Kolone su `pitanje;tip;opcije`. Može i zarez umesto tačka-zareza.

| tip | izgled |
|---|---|
| `kratko` | jedan red teksta |
| `dugo` | veće polje za tekst |
| `broj` | broj |
| `datum` | kalendar |
| `izbor` | ponuđeni odgovori, opcije odvojene sa `\|` |
| `slika` | ljudi dodaju svoju sliku |

## Slike

Slike se čuvaju besplatno na tvom Google Drive-u, u folderu **Leksikon slike**, a u tabeli se prikazuju direktno u ćeliji. Stranica ih pre slanja smanji na najviše 1200 piksela, pa jedna slika ima oko 100–300 KB. Kad neko promeni sliku, stara ide u kantu za smeće na Drive-u.

Ako si `Code.gs` nalepio pre nego što su slike dodate: nalepi novi kod, klikni **Run** na `setup`, odobri pristup Drive-u, pa uradi Deploy → Manage deployments → olovčica → **New version** → Deploy.

## Dobro je znati

- Šifru proverava Google skript, pa bez nje niko ne može da čita ni upisuje. Ipak, nemoj tražiti osetljive podatke.
- Telefon ili pregledač pamti ko si. Ako neko pređe na drugi uređaj ili obriše podatke pregledača, dobiće novi red, kao nova osoba. Duplikat obrišeš u tabeli.
- Tuđi odgovori se osvežavaju na svakih 20 sekundi.
