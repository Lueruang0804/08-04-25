/* ============================================================
   POST /api/verify-passcode
   Body: { code: string }

   Checks the entered code against the two secret passcodes, both
   of which live ONLY in server environment variables — neither
   ever ships to the browser. Responds with a role so the client
   knows whether to reveal the public site or the admin editor.

   Response: { role: 'viewer' | 'admin' }  (200)
             { error: 'invalid' }           (401)
   ============================================================ */

// No hardcoded defaults on purpose: the real passcodes must only ever
// exist as Vercel environment variables (VIEW_PASSCODE, ADMIN_PASSCODE),
// never in source, so they aren't exposed if this repo is public.

function normalize(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const viewPasscode = normalize(process.env.VIEW_PASSCODE);
  const adminPasscode = normalize(process.env.ADMIN_PASSCODE);
  if (!viewPasscode || !adminPasscode) {
    return res.status(500).json({ error: 'not_configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const entered = normalize(body && body.code);

  if (entered.length === 0) {
    return res.status(401).json({ error: 'invalid' });
  }

  if (entered === adminPasscode) {
    return res.status(200).json({ role: 'admin' });
  }
  if (entered === viewPasscode) {
    return res.status(200).json({ role: 'viewer' });
  }
  return res.status(401).json({ error: 'invalid' });
};
