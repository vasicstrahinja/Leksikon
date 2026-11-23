// Leksikon – pozadina u Google tabeli.
// Nalepi ovaj kod u Extensions → Apps Script u svojoj Google tabeli (uputstvo u README.md).

const SIFRA_DEFAULT = 'leksikon';
const MAX_ODGOVOR = 2000;
const MAX_PITANJA = 150;
const FOLDER = 'Leksikon slike';

function sheet_(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === 'Upisi') { sh.appendRow(['id', 'prvi upis', 'poslednja izmena']); sh.setFrozenRows(1); }
    if (name === 'Postavke') sh.appendRow(['šifra', SIFRA_DEFAULT]);
  }
  return sh;
}

// Pokreni jednom ručno (dugme Run) da napravi listove i zatraži dozvole.
function setup() {
  sheet_('Upisi');
  sheet_('Postavke');
  DriveApp.getRootFolder();
}

function sifra_() {
  const v = sheet_('Postavke').getRange('B1').getDisplayValue();
  return String(v || SIFRA_DEFAULT).trim();
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) { return handle_((e && e.parameter) || {}); }
function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (_) {}
  return handle_(b);
}

function handle_(r) {
  try {
    if (String(r.pass || '').trim() !== sifra_()) return out_({ ok: false, err: 'sifra' });
    if (r.action === 'list') return out_(list_(String(r.id || '')));
    if (r.action === 'saveMany') return out_(saveMany_(r));
    if (r.action === 'save') return out_(saveMany_({ id: r.id, items: [{ p: r.p, o: r.o }] }));
    if (r.action === 'upload') return out_(upload_(r));
    return out_({ ok: false, err: 'akcija' });
  } catch (err) {
    return out_({ ok: false, err: String(err) });
  }
}

function list_(id) {
  const range = sheet_('Upisi').getDataRange();
  const v = range.getDisplayValues();
  const f = range.getFormulas();
  v.forEach((row, i) => row.forEach((_, c) => {
    const m = String(f[i][c] || '').match(/^=IMAGE\("([^"]+)"/i);
    if (m) row[c] = m[1];
  }));
  const head = v[0] || [];
  const rows = v.slice(1).filter(r => r[0]);
  const entries = rows.map(r => {
    const o = {};
    for (let c = 3; c < head.length; c++) if (head[c] && r[c] !== '') o[head[c]] = r[c];
    return o;
  });
  return { ok: true, entries: entries, mine: rows.findIndex(r => r[0] === id) };
}

// Više odgovora jedne osobe u jednom zahtevu.
function saveMany_(r) {
  const items = (Array.isArray(r.items) ? r.items : []).slice(0, MAX_PITANJA).map(it => {
    let o = String(it && it.o != null ? it.o : '').slice(0, MAX_ODGOVOR);
    if (/^[=+\-@]/.test(o)) o = "'" + o; // da tabela ne pretvori odgovor u formulu
    return { p: String((it && it.p) || ''), empty: !o, write: cell => { cell.setNumberFormat('@'); cell.setValue(o); } };
  });
  return writeCells_(r.id, items);
}

// Slika ide u Google Drive (folder "Leksikon slike"), a u tabelu se upisuje =IMAGE(...)
function upload_(r) {
  const m = String(r.data || '').match(/^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[3].length > 4000000) return { ok: false, err: 'slika' };
  const id = String(r.id || '');
  if (!/^[a-f0-9]{32}$/.test(id)) return { ok: false, err: 'podaci' };
  const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
  const blob = Utilities.newBlob(Utilities.base64Decode(m[3]), m[1], 'leksikon-' + id.slice(0, 6) + '-' + Date.now() + '.' + ext);
  const file = folder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = 'https://lh3.googleusercontent.com/d/' + file.getId();
  const res = writeCells_(id, [{ p: r.p, empty: false, write: cell => {
    const old = String(cell.getFormula() || '').match(/googleusercontent\.com\/d\/([\w-]+)/);
    if (old) { try { DriveApp.getFileById(old[1]).setTrashed(true); } catch (_) {} }
    cell.setFormula('=IMAGE("' + url + '")');
  } }]);
  if (!res.ok) { file.setTrashed(true); return res; }
  res.url = url;
  return res;
}

function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}

// Upisuje ćelije jedne osobe; pravi red i kolone po potrebi.
function writeCells_(idRaw, items) {
  const id = String(idRaw || '');
  items = items.map(it => Object.assign({}, it, { p: String(it.p || '').trim().slice(0, 200) })).filter(it => it.p);
  if (!/^[a-f0-9]{32}$/.test(id)) return { ok: false, err: 'podaci' };
  if (!items.length) return { ok: true };

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const u = sheet_('Upisi');
    const lastCol = Math.max(u.getLastColumn(), 3);
    const head = u.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const lastRow = u.getLastRow();
    const ids = lastRow > 1 ? u.getRange(2, 1, lastRow - 1, 1).getDisplayValues().map(x => x[0]) : [];
    let row = ids.indexOf(id) + 2;
    const now = new Date();
    if (row < 2) {
      if (items.every(it => it.empty)) return { ok: true };
      u.appendRow([id, now, now]);
      row = u.getLastRow();
    } else {
      u.getRange(row, 3).setValue(now);
    }
    items.forEach(it => {
      let col = head.indexOf(it.p) + 1;
      if (col < 4) {
        if (head.length >= MAX_PITANJA + 3) return;
        head.push(it.p);
        col = head.length;
        u.getRange(1, col).setValue(it.p);
      }
      it.write(u.getRange(row, col));
    });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
