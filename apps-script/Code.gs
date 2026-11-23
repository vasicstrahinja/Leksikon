// Leksikon – pozadina u Google tabeli.
// Nalepi ovaj kod u Extensions → Apps Script u svojoj Google tabeli (uputstvo u README.md).

const SIFRA_DEFAULT = 'leksikon';
const MAX_ODGOVOR = 2000;
const MAX_PITANJA = 150;

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
    return out_({ ok: false, err: 'akcija' });
  } catch (err) {
    return out_({ ok: false, err: String(err) });
  }
}

function list_(id) {
  const v = sheet_('Upisi').getDataRange().getDisplayValues();
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
  const id = String(r.id || '');
  const p = String(r.p || '').trim().slice(0, 200);
  let o = String(r.o == null ? '' : r.o).slice(0, MAX_ODGOVOR);
  if (!/^[a-f0-9]{32}$/.test(id) || !p) return { ok: false, err: 'podaci' };
  if (/^[=+\-@]/.test(o)) o = "'" + o; // da tabela ne pretvori odgovor u formulu

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
      if (!o) return { ok: true };
      u.appendRow([id, now, now]);
      row = u.getLastRow();
    } else {
      u.getRange(row, 3).setValue(now);
    }
    const cell = u.getRange(row, col);
    cell.setNumberFormat('@');
    cell.setValue(o);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
