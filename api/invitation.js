// Vercel server function. Never send RSVP_API_KEY to the browser.
// Solo códigos de diagnóstico: nunca claves, tokens, nombres ni respuestas de Google.
function unavailable(res, reason) {
  console.error('[RSVP_CONNECTION]', reason);
  if (['SCRIPT_BUSY', 'SCRIPT_TIMEOUT', 'SCRIPT_NETWORK_ERROR', 'SCRIPT_HTTP_429', 'SCRIPT_HTTP_502', 'SCRIPT_HTTP_503', 'SCRIPT_HTTP_504'].includes(reason)) res.setHeader('Retry-After', '2');
  return res.status(503).json({ error: 'SERVICE_UNAVAILABLE' });
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!['GET', 'PUT', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PUT, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const token = /^Bearer ([a-f0-9]{24}|[a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
  if (!token) return res.status(401).json({ error: 'INVALID_INVITATION' });
  const endpoint = 'https://script.google.com/macros/s/AKfycbxI9qiR24_O1ng66gGS9KZdwCNToXEmLvMevIPPmJPL58Y4ObWG6vx_uS-1hENuZvM/exec';
  const key = process.env.RSVP_API_KEY;
  if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint) || !key || key.length < 32) {
    console.error('[RSVP_CONNECTION]', 'VERCEL_API_KEY_MISSING');
    return res.status(503).json({ error: 'NOT_CONFIGURED' });
  }
  let response;
  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      response = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!response || Buffer.byteLength(JSON.stringify(response)) > 16000) throw new Error();
    } catch { return res.status(400).json({ error: 'INVALID_RESPONSE' }); }
  }
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key, token, action: req.method === 'GET' ? 'lookup' : req.method === 'POST' ? 'gift' : 'save', ...(response ? { response } : {}) }),
      signal: AbortSignal.timeout(25000), redirect: 'follow'
    });
    if (!upstream.ok) return unavailable(res, 'SCRIPT_HTTP_' + upstream.status);
    let result;
    try { result = await upstream.json(); }
    catch { return unavailable(res, 'SCRIPT_RESPONSE_NOT_JSON'); }
    if (!result || typeof result !== 'object') return unavailable(res, 'SCRIPT_RESPONSE_INVALID');
    if (result.ok !== true) {
      const code = result.error;
      const status = code === 'INVALID_INVITATION' ? 401 : ['INVALID_REQUEST', 'INVALID_RESPONSE'].includes(code) ? 400 : 503;
      if (status === 503) {
        const reasons = { UNAUTHORIZED: 'SCRIPT_API_KEY_MISMATCH', NOT_CONFIGURED: 'SCRIPT_API_KEY_MISSING', SERVICE_ERROR: 'SCRIPT_SHEETS_ERROR', DATA_ERROR: 'SCRIPT_DATA_ERROR', BUSY: 'SCRIPT_BUSY' };
        return unavailable(res, Object.hasOwn(reasons, code) ? reasons[code] : 'SCRIPT_REJECTED');
      }
      return res.status(status).json({ error: code });
    }
    if (req.method === 'GET') {
      const invitation = result.invitation;
      if (!invitation || typeof invitation.name !== 'string' || !Number.isInteger(invitation.seats) || invitation.seats < 1 || invitation.seats > 100) return unavailable(res, 'SCRIPT_INVITATION_INVALID');
      return res.status(200).json(invitation);
    }
    return res.status(200).json({ ok: true });
  } catch (error) { return unavailable(res, ['TimeoutError', 'AbortError'].includes(error?.name) ? 'SCRIPT_TIMEOUT' : 'SCRIPT_NETWORK_ERROR'); }
};
