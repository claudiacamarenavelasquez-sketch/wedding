// Vercel server function. Never send RSVP_API_KEY to the browser.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!['GET', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
  if (!token) return res.status(401).json({ error: 'INVALID_INVITATION' });
  const endpoint = process.env.RSVP_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxI9qiR24_O1ng66gGS9KZdwCNToXEmLvMevIPPmJPL58Y4ObWG6vx_uS-1hENuZvM/exec';
  const key = process.env.RSVP_API_KEY;
  if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint) || !key || key.length < 32) {
    return res.status(503).json({ error: 'NOT_CONFIGURED' });
  }
  let response;
  if (req.method === 'PUT') {
    try {
      response = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!response || Buffer.byteLength(JSON.stringify(response)) > 16000) throw new Error();
    } catch { return res.status(400).json({ error: 'INVALID_RESPONSE' }); }
  }
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key, token, action: req.method === 'GET' ? 'lookup' : 'save', ...(response ? { response } : {}) }),
      signal: AbortSignal.timeout(25000), redirect: 'follow'
    });
    if (!upstream.ok) throw new Error();
    const result = await upstream.json();
    if (result.ok !== true) {
      const code = result.error;
      const status = code === 'INVALID_INVITATION' ? 401 : ['INVALID_REQUEST', 'INVALID_RESPONSE'].includes(code) ? 400 : 503;
      return res.status(status).json({ error: status === 503 ? 'SERVICE_UNAVAILABLE' : code });
    }
    if (req.method === 'GET') {
      const invitation = result.invitation;
      if (!invitation || typeof invitation.name !== 'string' || !Number.isInteger(invitation.seats) || invitation.seats < 1 || invitation.seats > 100) throw new Error();
      return res.status(200).json(invitation);
    }
    return res.status(200).json({ ok: true });
  } catch { return res.status(503).json({ error: 'SERVICE_UNAVAILABLE' }); }
};
