/* ============================================================
   GET  /api/letter          -> { content: string }
   POST /api/letter          body: { code, content } -> { ok: true }

   Reads/writes the love letter in Supabase (table "letter", single
   row with id = 1). All calls to Supabase use the service_role key,
   which is kept in a server-only env var and never reaches the
   browser. Writes additionally require the real admin passcode
   (also server-only) so the endpoint can't be used to overwrite the
   letter even by someone who found the URL by guessing.
   ============================================================ */

// No hardcoded admin passcode default on purpose — see verify-passcode.js.
const DEFAULT_LETTER =
  '[Write your personal letter here. Talk about how you met, what she ' +
  "means to you, your favorite memory together, and what you're looking " +
  'forward to. This is the heart of the whole website — take your time ' +
  'with it.]';

const MAX_CONTENT_LENGTH = 20000;

function normalize(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json'
  };
}

async function readLetter() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('missing_supabase_config');
  }

  const resp = await fetch(
    url + '/rest/v1/letter?select=content&id=eq.1',
    { headers: supabaseHeaders() }
  );
  if (!resp.ok) {
    throw new Error('supabase_read_failed');
  }
  const rows = await resp.json();
  if (Array.isArray(rows) && rows.length > 0 && typeof rows[0].content === 'string') {
    return rows[0].content;
  }
  return null;
}

async function writeLetter(content) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('missing_supabase_config');
  }

  const resp = await fetch(
    url + '/rest/v1/letter?on_conflict=id',
    {
      method: 'POST',
      headers: Object.assign({}, supabaseHeaders(), {
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify({ id: 1, content: content, updated_at: new Date().toISOString() })
    }
  );
  if (!resp.ok) {
    throw new Error('supabase_write_failed');
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const content = await readLetter();
      return res.status(200).json({ content: content === null ? DEFAULT_LETTER : content });
    } catch (err) {
      // Supabase not configured yet or briefly unreachable — degrade
      // gracefully instead of breaking the reveal for a visitor.
      return res.status(200).json({ content: DEFAULT_LETTER, offline: true });
    }
  }

  if (req.method === 'POST') {
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

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (content.length === 0) {
      return res.status(400).json({ error: 'empty_content' });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({ error: 'content_too_long' });
    }

    try {
      await writeLetter(content);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(502).json({ error: 'save_failed' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method_not_allowed' });
};
