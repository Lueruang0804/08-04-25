/* ============================================================
   POST /api/music   body: { code, audioBase64, contentType }
                      -> { ok: true }

   Uploads the background song to Supabase Storage (public bucket
   "music"), admin-passcode protected, using the service_role key
   (server-only). Stored at a fixed path "our-song" with NO file
   extension — same trick as api/photo.js — so the public URL the
   player references never changes no matter what audio format is
   uploaded; Supabase serves it with whatever Content-Type was set
   at upload time.
   ============================================================ */

const ALLOWED_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
  'audio/mp4', 'audio/x-m4a', 'audio/aac'
];
// Kept comfortably under Vercel's request body limit — base64 inflates
// the payload by ~33%, so a 4MB file becomes a ~5.3MB request.
const MAX_BYTES = 4 * 1024 * 1024;

function normalize(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

async function uploadMusic(buffer, contentType) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing_supabase_config');

  const resp = await fetch(
    url + '/storage/v1/object/music/our-song',
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

  const contentType = typeof body.contentType === 'string' ? body.contentType : '';
  if (ALLOWED_TYPES.indexOf(contentType) === -1) {
    return res.status(400).json({ error: 'unsupported_type' });
  }

  if (typeof body.audioBase64 !== 'string' || body.audioBase64.length === 0) {
    return res.status(400).json({ error: 'missing_audio' });
  }

  let buffer;
  try {
    const base64 = body.audioBase64.replace(/^data:[^;]+;base64,/, '');
    buffer = Buffer.from(base64, 'base64');
  } catch (err) {
    return res.status(400).json({ error: 'invalid_audio_data' });
  }

  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return res.status(400).json({ error: 'audio_too_large' });
  }

  try {
    await uploadMusic(buffer, contentType);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: 'save_failed' });
  }
};
