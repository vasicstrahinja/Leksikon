// Leksikon – pozadina u Google tabeli.
// Nalepi ovaj kod u Extensions → Apps Script u svojoj Google tabeli (uputstvo u README.md).

const SIFRA_DEFAULT = 'leksikon';
const MAX_ODGOVOR = 2000;
const MAX_PITANJA = 150;
const FOLDER = 'Leksikon slike';

function sheet_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

// Pokreni jednom ručno (dugme Run) da napravi listove i zatraži dozvole.
function setup() {
  const u = sheet_('Upisi');
  if (u.getLastRow() === 0) u.appendRow(['id', 'prvi upis', 'poslednja izmena']);
  u.setFrozenRows(1);
  const p = sheet_('Postavke');
  if (p.getLastRow() === 0) p.appendRow(['šifra', SIFRA_DEFAULT]);
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
    setup();
    if (String(r.pass || '').trim() !== sifra_()) return out_({ ok: false, err: 'sifra' });
    if (r.action === 'list') return out_(list_(String(r.id || '')));
    if (r.action === 'save') return out_(save_(r));
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

function save_(r) {
  let o = String(r.o == null ? '' : r.o).slice(0, MAX_ODGOVOR);
  if (/^[=+\-@]/.test(o)) o = "'" + o; // da tabela ne pretvori odgovor u formulu
  return writeCell_(r, !o, cell => { cell.setNumberFormat('@'); cell.setValue(o); });
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
  const res = writeCell_(r, false, cell => {
    const old = String(cell.getFormula() || '').match(/googleusercontent\.com\/d\/([\w-]+)/);
    if (old) { try { DriveApp.getFileById(old[1]).setTrashed(true); } catch (_) {} }
    cell.setFormula('=IMAGE("' + url + '")');
  });
  if (!res.ok) { file.setTrashed(true); return res; }
  res.url = url;
  return res;
}

function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}

function writeCell_(r, empty, write) {
  const id = String(r.id || '');
  const p = String(r.p || '').trim().slice(0, 200);
  if (!/^[a-f0-9]{32}$/.test(id) || !p) return { ok: false, err: 'podaci' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const u = sheet_('Upisi');
    const lastCol = Math.max(u.getLastColumn(), 3);
    const head = u.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    let col = head.indexOf(p) + 1;
    if (col < 4) {
      if (head.length >= MAX_PITANJA + 3) return { ok: false, err: 'previse pitanja' };
      col = lastCol + 1;
      u.getRange(1, col).setValue(p);
    }
    const ids = u.getLastRow() > 1 ? u.getRange(2, 1, u.getLastRow() - 1, 1).getDisplayValues().map(x => x[0]) : [];
    let row = ids.indexOf(id) + 2;
    const now = new Date();
    if (row < 2) {
      if (empty) return { ok: true };
      u.appendRow([id, now, now]);
      row = u.getLastRow();
    } else {
      u.getRange(row, 3).setValue(now);
    }
    write(u.getRange(row, col));
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
