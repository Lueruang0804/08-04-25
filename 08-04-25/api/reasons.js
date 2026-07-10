/* ============================================================
   GET  /api/reasons          -> { entries: string[] }
   POST /api/reasons          body: { code, entries } -> { ok: true }

   Reads/writes the "Reasons I Love You" list in Supabase (table
   "reasons", single row with id = 1, entries stored as jsonb array
   of strings). Same pattern as api/timeline.js: Supabase is only
   ever touched with the service_role key (server-only), and writes
   require the real admin passcode (also server-only).
   ============================================================ */

const DEFAULT_ENTRIES = [
  'I love the way you always make me smile.',
  'I love how you always support me.',
  'I love how you make every day feel special.',
  'I love your kindness.',
  'I love every little thing about you.'
];

const MAX_ENTRIES = 30;
const MAX_ENTRY_LENGTH = 500;

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

function sanitizeEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_ENTRIES) return null;
  var clean = [];
  for (var i = 0; i < entries.length; i++) {
    if (typeof entries[i] !== 'string') return null;
    var text = entries[i].trim().slice(0, MAX_ENTRY_LENGTH);
    if (text.length === 0) return null;
    clean.push(text);
  }
  return clean;
}

async function readReasons() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing_supabase_config');

  const resp = await fetch(
    url + '/rest/v1/reasons?select=entries&id=eq.1',
    { headers: supabaseHeaders() }
  );
  if (!resp.ok) throw new Error('supabase_read_failed');
  const rows = await resp.json();
  if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0].entries)) {
    return rows[0].entries;
  }
  return null;
}

async function writeReasons(entries) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing_supabase_config');

  const resp = await fetch(
    url + '/rest/v1/reasons?on_conflict=id',
    {
      method: 'POST',
      headers: Object.assign({}, supabaseHeaders(), {
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify({ id: 1, entries: entries, updated_at: new Date().toISOString() })
    }
  );
  if (!resp.ok) throw new Error('supabase_write_failed');
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const entries = await readReasons();
      return res.status(200).json({ entries: entries === null ? DEFAULT_ENTRIES : entries });
    } catch (err) {
      return res.status(200).json({ entries: DEFAULT_ENTRIES, offline: true });
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

    const entries = sanitizeEntries(body.entries);
    if (!entries) {
      return res.status(400).json({ error: 'invalid_entries' });
    }

    try {
      await writeReasons(entries);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(502).json({ error: 'save_failed' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method_not_allowed' });
};
