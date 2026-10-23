import { wedding } from './config.js';
const $ = id => document.getElementById(id);
const media = (id, src, alt) => { if (!src) return; const img = new Image(); img.src = src; img.alt = alt; img.loading = id === 'monogram' ? 'eager' : 'lazy'; const fallback = [...$(id).childNodes]; img.addEventListener('error', () => $(id).replaceChildren(...fallback)); $(id).replaceChildren(img); };
media('monogram', wedding.assets.monogram, 'Monograma original C y J con anturio blanco');
media('couple-photo', wedding.assets.couple, 'Claudia y Jorge');
media('chapel', wedding.assets.chapel, 'Acuarela de la capilla del ANCPCPP');
media('cats', wedding.assets.cats, 'Hera y Ramsés');
if (wedding.mapsUrl && /^https:\/\/(www\.)?(google\.(com|com.pe)|maps\.app\.goo\.gl)\//.test(wedding.mapsUrl)) { $('maps').href = wedding.mapsUrl; $('maps').hidden = false; $('maps-pending').hidden = true; }

if (wedding.giftText) $('gift-details').textContent = wedding.giftText;
for (const color of wedding.guestPalette) { if (!/^#[\da-f]{6}$/i.test(color.hex)) continue; const item = document.createElement('span'); item.className = 'swatch'; const chip = document.createElement('i'); chip.style.backgroundColor = color.hex; item.append(chip, document.createTextNode(color.name)); $('swatches').append(item); }
if ($('swatches').children.length) $('palette-note').textContent = 'Tonos sugeridos, a tu elección.';
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) { document.documentElement.classList.add('js-motion'); const observer = new IntersectionObserver(items => items.forEach(item => { if (item.isIntersecting) { item.target.classList.add('visible'); observer.unobserve(item.target); } }), { threshold: .08 }); document.querySelectorAll('.reveal').forEach(el => observer.observe(el)); }
const film = $('film');
let introTimeout;
function closeIntro() { clearTimeout(introTimeout); film.pause(); $('intro').hidden = true; document.body.style.overflow = ''; }
film.onended = closeIntro;
film.onerror = closeIntro;
// Sin controles: reproducción automática silenciada. Si no puede reproducirse,
// se muestra la invitación; nunca se deja una pantalla bloqueada.
if (wedding.assets.video && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  film.muted = true;
  film.src = wedding.assets.video;
  film.poster = 'assets/hero.jpg';
  $('intro').hidden = false;
  document.body.style.overflow = 'hidden';
  introTimeout = setTimeout(closeIntro, 15000);
  film.play().catch(closeIntro);
}
const demo = wedding.rsvp.mode !== 'live';
let invitation;
// Fragment tokens avoid sending invitation identifiers to static hosting logs.
const token = new URLSearchParams(location.hash.slice(1)).get('invite');
async function api(method, data) { const response = await fetch(wedding.rsvp.endpoint, { method, headers: { Authorization: `Bearer ${token}`, ...(data ? {'Content-Type':'application/json'} : {}) }, ...(data ? { body: JSON.stringify(data) } : {}), cache: 'no-store', credentials: 'same-origin', referrerPolicy: 'no-referrer' }); if (!response.ok) throw new Error(response.status === 401 || response.status === 404 ? 'No pudimos validar tu invitación. Contacta a los novios.' : 'No se pudo completar la solicitud. Inténtalo nuevamente.'); return response.json(); }
function renderNames(values = []) { const count = Number($('quantity').value); $('names').replaceChildren(); for (let i=0;i<count;i++) { const label = document.createElement('label'); label.textContent = `Nombre del asistente ${i+1}`; const input = document.createElement('input'); input.required = true; input.maxLength = 120; input.name = `attendee-${i}`; input.value = values[i] || ''; label.append(input); $('names').append(label); } }
function syncAttendance() { const yes = document.querySelector('[name=attendance]:checked')?.value === 'yes'; $('attendee-fields').hidden = !yes; $('names').querySelectorAll('input').forEach(input => input.disabled = !yes); }
$('quantity').onchange = () => { const values = [...$('names').querySelectorAll('input')].map(i => i.value); renderNames(values); syncAttendance(); };
document.querySelectorAll('[name=attendance]').forEach(input => input.onchange = syncAttendance);
async function initRSVP() { try { if (!demo && !token) throw new Error('Abre el enlace privado de tu invitación para consultar tus lugares y confirmar.'); invitation = demo ? wedding.rsvp.demo : await api('GET'); if (!Number.isInteger(invitation.seats) || invitation.seats < 1 || invitation.seats > 100 || typeof invitation.name !== 'string') throw new Error('No se pudo validar la información de la invitación.'); $('guest').value = invitation.name; $('guest-name').textContent = invitation.name; $('seat-count').textContent = invitation.seats; for (let n=1;n<=invitation.seats;n++) $('quantity').add(new Option(String(n),String(n))); renderNames(); if (!demo) { $('mode-note').textContent = 'Invitación personal · Puedes actualizar tu confirmación desde este mismo enlace.'; $('submit-rsvp').textContent = 'Confirmar asistencia'; const saved = invitation.response; if (saved) { const radio = document.querySelector(`[name=attendance][value="${saved.attending ? 'yes' : 'no'}"]`); radio.checked = true; if (saved.attending && Number.isInteger(saved.count) && saved.count >= 1 && saved.count <= invitation.seats) $('quantity').value = saved.count; renderNames(Array.isArray(saved.names) ? saved.names : []); $('message').value = saved.message || ''; syncAttendance(); } } } catch(error) { $('seat-count').textContent = '—'; $('guest-name').textContent = 'Invitación privada'; $('rsvp-form').querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = true); $('form-status').textContent = error.message; $('mode-note').textContent = 'No se han cargado los datos de la invitación.'; } }
$('rsvp-form').onsubmit = async event => { event.preventDefault(); const attending = document.querySelector('[name=attendance]:checked')?.value === 'yes'; const count = attending ? Number($('quantity').value) : 0; if (!invitation || !Number.isInteger(count) || count < 0 || (attending && count < 1) || count > invitation.seats) { $('form-status').textContent = 'Selecciona una cantidad válida dentro de los lugares asignados.'; return; } const names = attending ? [...$('names').querySelectorAll('input')].map(input => input.value.trim()) : []; if (attending && (names.length !== count || names.some(n => !n))) { $('form-status').textContent = 'Completa los nombres de los asistentes.'; return; } if (demo) { $('form-status').textContent = `Demostración: ${attending ? `${count} asistentes` : 'no asistirás'}. No se guardó ni envió ningún dato.`; return; } $('submit-rsvp').disabled = true; try { await api('PUT', { attending, count, names, message: $('message').value.trim() }); $('form-status').textContent = 'Gracias. Tu confirmación se guardó correctamente. Puedes actualizarla desde este enlace.'; } catch(error) { $('form-status').textContent = error.message; } finally { $('submit-rsvp').disabled = false; } };
initRSVP();
