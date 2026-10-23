/** Claudia & Jorge · Backend de RSVP para Google Apps Script V8.
 * Pegar en Apps Script asociado a la hoja y ejecutar prepararRSVP una vez.
 * API_KEY y WEDDING_URL se configuran en Propiedades del script.
 * El navegador llama a Vercel; solo Vercel llama a este servicio con API_KEY.
 */
const SHEET_ID = '1xup8YEIi4OSnbCZizovOZj587_md5l0pjYDMb48INtk';
const GUEST_TAB = 'Invitados';
const RESPONSE_TAB = 'RSVP';
const GUEST_HEADERS = ['ID', 'Titular', 'Cupos', 'TokenHash', 'Enlace'];
const SOURCE_GID = 1294208008;
const EXTRA_HEADERS = ['ID', 'TokenHash', 'Enlace', 'Asiste', 'Cantidad', 'Nombres', 'Actualizado'];
const RESPONSE_HEADERS = ['ID', 'Asiste', 'Cantidad', 'Nombres', 'Mensaje', 'Actualizado'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Invitaciones')
    .addItem('Preparar hojas RSVP', 'prepararRSVP')
    .addItem('Generar enlaces faltantes para toda la lista', 'generarEnlacesFaltantes')
    .addItem('Generar o renovar enlace de la fila seleccionada', 'generarEnlaceSeleccionado')
    .addToUi();
}

function prepararRSVP() {
  const book = SpreadsheetApp.openById(SHEET_ID);
  const layout = guestLayout_(book, true);
  if (!layout.existing) ensureSheet_(book, RESPONSE_TAB, RESPONSE_HEADERS);
  book.toast(layout.existing ? 'Lista conservada. Columnas D a J listas: ID, TokenHash, Enlace y confirmaciones.' : 'Hojas preparadas. Agrega Titular y Cupos en Invitados.');
}

// Reconoce la lista original: A se conserva, B=Invitados, C=Pases.
function guestLayout_(book, prepare) {
  const sheets = typeof book.getSheets === 'function' ? book.getSheets() : [];
  const candidates = sheets.filter(sheet => {
    const values = sheet.getRange(1, 2, 1, 2).getValues()[0];
    return String(values[0]).trim() === 'Invitados' && String(values[1]).trim() === 'Pases';
  });
  if (candidates.length > 1) throw new Error('Hay más de una pestaña con Invitados y Pases. Conserva esos encabezados solo en la lista que usará el RSVP.');
  const original = candidates.length === 1 ? candidates[0] : sheets.find(sheet => sheet.getSheetId() === SOURCE_GID);
  if (original) {
    const header = original.getRange(1, 2, 1, 2).getValues()[0];
    if (String(header[0]).trim() === 'Invitados' && String(header[1]).trim() === 'Pases') {
      const cells = original.getRange(1, 4, 1, EXTRA_HEADERS.length).getValues()[0];
      const formulas = original.getRange(1, 4, 1, EXTRA_HEADERS.length).getFormulas()[0];
      if (cells.some((value, index) => (value !== '' && value !== EXTRA_HEADERS[index]) || formulas[index])) throw new Error('Las columnas D a J ya tienen otros encabezados. No se modificó tu lista.');
      // No adjudicar columnas vacías de encabezado que ya contengan datos.
      if (prepare && original.getLastRow() > 1) {
        const range = original.getRange(2, 4, original.getLastRow() - 1, EXTRA_HEADERS.length);
        const values = range.getValues(), expressions = range.getFormulas();
        if (cells.some((value, index) => value === '' && values.some((row, rowIndex) => row[index] !== '' || expressions[rowIndex][index]))) throw new Error('Hay datos sin encabezado en D:J. No se sobrescribió nada.');
      }
      if (prepare) original.getRange(1, 4, 1, EXTRA_HEADERS.length).setValues([EXTRA_HEADERS]);
      else if (cells.some((value, index) => value !== EXTRA_HEADERS[index])) throw new Error('Ejecuta prepararRSVP primero.');
      return { sheet: original, existing: true, idColumn: 4, tokenColumn: 5 };
    }
    // Una pestaña RSVP ya usada por el formato anterior se admite sin migrar.
    if (original.getName() !== RESPONSE_TAB || String(original.getRange(1, 1).getValues()[0][0]) !== 'ID') throw new Error('La lista original debe tener Invitados en B1 y Pases en C1. No se modificó.');
  }
  const sheet = prepare ? ensureSheet_(book, GUEST_TAB, GUEST_HEADERS) : book.getSheetByName(GUEST_TAB);
  checkHeaders_(sheet, GUEST_HEADERS);
  return { sheet: sheet, existing: false, idColumn: 1, tokenColumn: 4 };
}

function guestRows_(layout) {
  const sheet = layout.sheet;
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, layout.existing ? 10 : 5).getValues()
    .map(row => layout.existing ? [row[3], row[1], row[2], row[4], row[5]] : row);
}

function ensureSheet_(book, name, headers) {
  const sheet = book.getSheetByName(name) || book.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  checkHeaders_(sheet, headers);
  return sheet;
}

function checkHeaders_(sheet, headers) {
  if (!sheet) throw new Error('Falta una pestaña requerida.');
  const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (actual.some((value, index) => value !== headers[index])) {
    throw new Error('La pestaña ' + sheet.getName() + ' debe tener estas columnas, en orden: ' + headers.join(', ') + '. No se modificaron sus datos.');
  }
}

function weddingUrl_() {
  // Dominio definitivo indicado por la pareja. No requiere WEDDING_URL.
  return 'https://claudiayjorge.vercel.app';
}

function validGuest_(values) {
  return values && String(values[1]).trim() !== '' && Number.isInteger(values[2]) && values[2] >= 1 && values[2] <= 100;
}

function writeGuestLink_(layout, row, allGuests, website) {
  const values = allGuests[row - 2];
  if (!validGuest_(values)) throw new Error('La fila ' + row + ' necesita nombre y pases enteros entre 1 y 100.');
  const id = values[0] ? String(values[0]) : Utilities.getUuid();
  if (allGuests.some((guest, index) => index + 2 !== row && String(guest[0]) === id)) throw new Error('ID duplicado en la fila ' + row + '. No se cambió ese enlace.');
  const token = hash_(Utilities.getUuid() + Utilities.getUuid());
  layout.sheet.getRange(row, layout.idColumn).setValue(id);
  layout.sheet.getRange(row, layout.tokenColumn, 1, 2).setValues([[hash_(token), website + '/#invite=' + token]]);
  values[0] = id;
}

function generarEnlaceSeleccionado() {
  const website = weddingUrl_();
  // Leer la selección del documento abierto ANTES de abrir la hoja por ID.
  const active = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = active && active.getActiveSheet();
  const range = sheet && sheet.getActiveRange();
  const layout = guestLayout_(SpreadsheetApp.openById(SHEET_ID), false);
  if (!range || sheet.getSheetId() !== layout.sheet.getSheetId() || range.getRow() < 2 || range.getNumRows() !== 1) {
    throw new Error('La selección no corresponde a una fila de ' + layout.sheet.getName() + '. Ejecuta generarEnlacesFaltantes para crear los enlaces sin seleccionar una celda.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    writeGuestLink_(layout, range.getRow(), guestRows_(layout), website);
    SpreadsheetApp.flush();
    active.toast('Enlace creado. Si había uno anterior para esta fila, dejó de funcionar.');
  } finally { lock.releaseLock(); }
}

// Se puede ejecutar directamente desde Apps Script: no depende de la selección.
// Conserva todos los enlaces existentes, incluso si se ejecuta varias veces.
function generarEnlacesFaltantes() {
  const website = weddingUrl_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const book = SpreadsheetApp.openById(SHEET_ID);
    const layout = guestLayout_(book, false);
    const rows = guestRows_(layout);
    const seen = new Set();
    rows.forEach(guest => {
      const id = String(guest[0]);
      if (id && seen.has(id)) throw new Error('Hay IDs duplicados. No se generó ningún enlace.');
      if (id) seen.add(id);
    });
    let created = 0, kept = 0;
    const invalidRows = [];
    rows.forEach((guest, index) => {
      if (!String(guest[1]).trim() && guest[2] === '') return;
      if (!validGuest_(guest)) { invalidRows.push(index + 2); return; }
      // Nunca reemplazar silenciosamente tokens o enlaces ya enviados.
      if (guest[3] || guest[4]) { kept++; return; }
      writeGuestLink_(layout, index + 2, rows, website);
      created++;
    });
    SpreadsheetApp.flush();
    book.toast('Enlaces creados: ' + created + '. Existentes conservados: ' + kept + (invalidRows.length ? '. Revisa nombre/pases en filas: ' + invalidRows.join(', ') : '.'));
    return { created: created, kept: kept, invalidRows: invalidRows };
  } finally { lock.releaseLock(); }
}

// Comprobación pública sin datos de invitados.
function doGet() { return json_({ ok: true, service: 'wedding-rsvp', version: 3 }); }

function doPost(event) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const raw = event && event.postData && event.postData.contents;
    if (typeof raw !== 'string' || raw.length > 20000) return failure_('INVALID_REQUEST');
    const request = JSON.parse(raw);
    const key = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (!key || key.length < 32) return failure_('NOT_CONFIGURED');
    if (!request || typeof request !== 'object' || Array.isArray(request) || !same_(request.apiKey, key)) return failure_('UNAUTHORIZED');
    if (!['lookup', 'save'].includes(request.action) || !/^[a-f0-9]{64}$/.test(request.token || '')) return failure_('INVALID_REQUEST');
    if (Object.keys(request).some(k => !['apiKey', 'action', 'token', 'response'].includes(k))) return failure_('INVALID_REQUEST');
    locked = lock.tryLock(20000);
    if (!locked) return failure_('BUSY');
    const book = SpreadsheetApp.openById(SHEET_ID);
    const layout = guestLayout_(book, false);
    const guests = layout.sheet;
    const responses = layout.existing ? guests : book.getSheetByName(RESPONSE_TAB);
    if (!layout.existing) checkHeaders_(responses, RESPONSE_HEADERS);
    const digest = hash_(request.token);
    const rows = guestRows_(layout);
    const matches = rows.filter(row => same_(String(row[3]), digest));
    if (matches.length !== 1) return failure_('INVALID_INVITATION');
    const guest = matches[0];
    const id = String(guest[0]);
    const seats = guest[2]; // Única fuente de verdad: la hoja, nunca el navegador.
    if (!id || !String(guest[1]).trim() || !Number.isInteger(seats) || seats < 1 || seats > 100 || rows.filter(row => String(row[0]) === id).length !== 1) return failure_('INVALID_INVITATION');
    const guestRow = rows.indexOf(guest) + 2;
    const current = layout.existing ? guests.getRange(guestRow, 7, 1, 4).getValues()[0] : null;
    const saved = layout.existing ? (current[0] === '' ? [] : [[id, current[0], current[1], current[2], '', current[3]]]) : (responses.getLastRow() > 1 ? responses.getRange(2, 1, responses.getLastRow() - 1, RESPONSE_HEADERS.length).getValues() : []);
    const indices = saved.map((row, i) => String(row[0]) === id ? i : -1).filter(i => i >= 0);
    if (indices.length > 1) return failure_('DATA_ERROR');
    const index = indices.length ? indices[0] : -1;
    if (request.action === 'lookup') {
      const previous = index >= 0 ? saved[index] : null;
      return json_({ ok: true, invitation: { name: String(guest[1]), seats: seats, response: previous ? { attending: previous[1] === 'Sí', count: Number(previous[2]), names: JSON.parse(String(previous[3])), message: untext_(previous[4]) } : null } });
    }
    let response;
    try { response = validateResponse_(request.response, seats); }
    catch (error) { return failure_('INVALID_RESPONSE'); }
    const targetRow = index >= 0 ? index + 2 : Math.max(2, responses.getLastRow() + 1);
    if (layout.existing) {
      responses.getRange(guestRow, 7, 1, 4).setValues([[response.attending ? 'Sí' : 'No', response.count, JSON.stringify(response.names), new Date()]]);
    } else {
      responses.getRange(targetRow, 1, 1, RESPONSE_HEADERS.length).setValues([[id, response.attending ? 'Sí' : 'No', response.count, JSON.stringify(response.names), text_(response.message), new Date()]]);
    }
    SpreadsheetApp.flush(); // Solo se responde éxito después de guardar.
    return json_({ ok: true });
  } catch (error) {
    // No registrar tokens, claves, nombres ni mensajes en logs.
    return failure_('SERVICE_ERROR');
  } finally { if (locked) lock.releaseLock(); }
}

function validateResponse_(value, seats) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['attending', 'count', 'names', 'message'].includes(k))) throw new Error('Invalid');
  if (typeof value.attending !== 'boolean' || !Number.isInteger(value.count) || value.count < 0 || value.count > seats) throw new Error('Invalid');
  if (value.attending ? value.count < 1 : value.count !== 0) throw new Error('Invalid');
  if (!Array.isArray(value.names) || value.names.length !== value.count || value.names.some(n => typeof n !== 'string' || !n.trim() || n.trim().length > 120)) throw new Error('Invalid');
  if (typeof value.message !== 'string' || value.message.length > 2000) throw new Error('Invalid');
  return { attending: value.attending, count: value.count, names: value.names.map(n => n.trim()), message: value.message.trim() };
}

function hash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
}
function same_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
// Evita interpretar los mensajes como fórmulas de Google Sheets.
function text_(value) { return /^[=+\-@'\t\r\n]/.test(value) ? "'" + value : value; }
function untext_(value) { return String(value).replace(/^'(?=[=+\-@'\t\r\n])/, ''); }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function failure_(code) { return json_({ ok: false, error: code }); }
