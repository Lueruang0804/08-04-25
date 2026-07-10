/* ============================================================
   POST /api/photo   body: { code, slot, imageBase64, contentType }
                      -> { ok: true }

   Uploads a gallery photo to Supabase Storage (public bucket
   "photos"), admin-passcode protected, using the service_role key
   (server-only). Stored at a fixed path per slot — "photo1".."photo6",
   deliberately with NO file extension, so the public URL the gallery
   references never changes no matter what image format is uploaded;
   Supabase serves it with whatever Content-Type was set at upload
   time, which is all a browser needs to render it correctly.
   ============================================================ */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 6 * 1024 * 1024; // 6MB, comfortably under Vercel's body limit

function normalize(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

async function uploadPhoto(slot, buffer, contentType) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing_supabase_config');

  const resp = await fetch(
    url + '/storage/v1/object/photos/photo' + slot,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: buffer
    }
  );
  if (!resp.ok) {
    const text = await resp.text().catch(function () { return ''; });
    throw new Error('supabase_storage_upload_failed: ' + resp.status + ' ' + text);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const adminPasscode = normalize(process.env.ADMIN_PASSCODE);
  if (!adminPasscode) {
    return res.status(500).json({ error: 'not_configured' });
  }
  const enteredCode = normalize(body.code);
  if (enteredCode.length === 0 || enteredCode !== adminPasscode) {
    return res.status(401).json({ error: 'invalid_passcode' });
  }

  const slot = parseInt(body.slot, 10);
  if (!slot || slot < 1 || slot > 6) {
    return res.status(400).json({ error: 'invalid_slot' });
  }

  const contentType = typeof body.contentType === 'string' ? body.contentType : '';
  if (ALLOWED_TYPES.indexOf(contentType) === -1) {
    return res.status(400).json({ error: 'unsupported_type' });
  }

  if (typeof body.imageBase64 !== 'string' || body.imageBase64.length === 0) {
    return res.status(400).json({ error: 'missing_image' });
  }

  let buffer;
  try {
    const base64 = body.imageBase64.replace(/^data:[^;]+;base64,/, '');
    buffer = Buffer.from(base64, 'base64');
  } catch (err) {
    return res.status(400).json({ error: 'invalid_image_data' });
  }

  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return res.status(400).json({ error: 'image_too_large' });
  }

  try {
    await uploadPhoto(slot, buffer, contentType);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: 'save_failed' });
  }
};
