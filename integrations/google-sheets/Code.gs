/** Claudia & Jorge · Backend de RSVP para Google Apps Script V8.
 * Pegar en Apps Script asociado a la hoja y ejecutar prepararRSVP una vez.
 * API_KEY y WEDDING_URL se configuran en Propiedades del script.
 * El navegador llama a Vercel; solo Vercel llama a este servicio con API_KEY.
 */
const SHEET_ID = '1xup8YEIi4OSnbCZizovOZj587_md5l0pjYDMb48INtk';
const GUEST_TAB = 'Invitados';
const RESPONSE_TAB = 'RSVP';
const GUEST_HEADERS = ['ID', 'Titular', 'Cupos', 'TokenHash', 'Enlace'];
const RESPONSE_HEADERS = ['ID', 'Asiste', 'Cantidad', 'Nombres', 'Mensaje', 'Actualizado'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Invitaciones')
    .addItem('Preparar hojas RSVP', 'prepararRSVP')
    .addItem('Generar o renovar enlace de la fila seleccionada', 'generarEnlaceSeleccionado')
    .addToUi();
}

function prepararRSVP() {
  const book = SpreadsheetApp.openById(SHEET_ID);
  ensureSheet_(book, GUEST_TAB, GUEST_HEADERS);
  ensureSheet_(book, RESPONSE_TAB, RESPONSE_HEADERS);
  // No se modifica contenido existente si las columnas no coinciden.
  book.toast('Hojas preparadas. Agrega Titular y Cupos en Invitados.');
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

function generarEnlaceSeleccionado() {
  const props = PropertiesService.getScriptProperties();
  const website = (props.getProperty('WEDDING_URL') || '').replace(/\/$/, '');
  if (!/^https:\/\/[^\s#?]+$/.test(website)) throw new Error('Configura WEDDING_URL con la URL HTTPS de la invitación, sin parámetros ni fragmentos.');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== GUEST_TAB || sheet.getActiveRange().getRow() < 2 || sheet.getActiveRange().getNumRows() !== 1) {
    throw new Error('Selecciona una sola fila de invitado en Invitados.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    checkHeaders_(sheet, GUEST_HEADERS);
    const row = sheet.getActiveRange().getRow();
    const values = sheet.getRange(row, 1, 1, GUEST_HEADERS.length).getValues()[0];
    if (!String(values[1]).trim() || !Number.isInteger(values[2]) || values[2] < 1 || values[2] > 100) throw new Error('Completa Titular y Cupos (entero entre 1 y 100).');
    const id = values[0] ? String(values[0]) : Utilities.getUuid();
    const existing = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues() : [];
    if (existing.some((entry, index) => index + 2 !== row && String(entry[0]) === id)) throw new Error('El ID está duplicado. Cada familia debe tener uno distinto.');
    const token = hash_(Utilities.getUuid() + Utilities.getUuid());
    sheet.getRange(row, 1).setValue(id);
    sheet.getRange(row, 4, 1, 2).setValues([[hash_(token), website + '/#invite=' + token]]);
    SpreadsheetApp.flush();
    SpreadsheetApp.getActiveSpreadsheet().toast('Enlace creado en la columna Enlace. Si había uno anterior, dejó de funcionar.');
  } finally { lock.releaseLock(); }
}

// Comprobación pública sin datos de invitados.
function doGet() { return json_({ ok: true, service: 'wedding-rsvp', version: 1 }); }

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
    const guests = book.getSheetByName(GUEST_TAB);
    const responses = book.getSheetByName(RESPONSE_TAB);
    checkHeaders_(guests, GUEST_HEADERS);
    checkHeaders_(responses, RESPONSE_HEADERS);
    const digest = hash_(request.token);
    const rows = guests.getLastRow() > 1 ? guests.getRange(2, 1, guests.getLastRow() - 1, GUEST_HEADERS.length).getValues() : [];
    const matches = rows.filter(row => same_(String(row[3]), digest));
    if (matches.length !== 1) return failure_('INVALID_INVITATION');
    const guest = matches[0];
    const id = String(guest[0]);
    const seats = guest[2]; // Única fuente de verdad: la hoja, nunca el navegador.
    if (!id || !String(guest[1]).trim() || !Number.isInteger(seats) || seats < 1 || seats > 100 || rows.filter(row => String(row[0]) === id).length !== 1) return failure_('INVALID_INVITATION');
    const saved = responses.getLastRow() > 1 ? responses.getRange(2, 1, responses.getLastRow() - 1, RESPONSE_HEADERS.length).getValues() : [];
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
    responses.getRange(targetRow, 1, 1, RESPONSE_HEADERS.length).setValues([[
      id, response.attending ? 'Sí' : 'No', response.count,
      JSON.stringify(response.names), text_(response.message), new Date()
    ]]);
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
