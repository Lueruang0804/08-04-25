/* ============================================================
   GET  /api/timeline         -> { entries: [{ icon, title, text }, ...] }
   POST /api/timeline         body: { code, entries } -> { ok: true }

   Reads/writes the "Our Story So Far" timeline in Supabase (table
   "timeline", single row with id = 1, entries stored as jsonb). Same
   pattern as api/letter.js: Supabase is only ever touched with the
   service_role key (server-only), and writes require the real admin
   passcode (also server-only).
   ============================================================ */

const DEFAULT_ENTRIES = [
  { icon: '❤️', title: 'The Day We Met', text: '[Describe the day your story began.]' },
  { icon: '🌷', title: 'Our First Date', text: '[Describe your first date together.]' },
  { icon: '📸', title: 'Our Favorite Memory', text: '[Describe a memory that means the world to you.]' },
  { icon: '🎂', title: 'Birthdays Together', text: '[Describe celebrating birthdays as a couple.]' },
  { icon: '💕', title: 'Today — Our Anniversary', text: 'And here we are, still writing our story together.' }
];

const MAX_ENTRIES = 12;
const MAX_FIELD_LENGTH = 2000;

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
    var e = entries[i];
    if (!e || typeof e.title !== 'string' || typeof e.text !== 'string') return null;
    var icon = typeof e.icon === 'string' ? e.icon.slice(0, 8) : '';
    var title = e.title.trim().slice(0, MAX_FIELD_LENGTH);
    var text = e.text.trim().slice(0, MAX_FIELD_LENGTH);
    if (title.length === 0 || text.length === 0) return null;
    clean.push({ icon: icon, title: title, text: text });
  }
  return clean;
}

async function readTimeline() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing_supabase_config');

  const resp = await fetch(
    url + '/rest/v1/timeline?select=entries&id=eq.1',
    { headers: supabaseHeaders() }
  );
  if (!resp.ok) throw new Error('supabase_read_failed');
  const rows = await resp.json();
  if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0].entries)) {
    return rows[0].entries;
  }
  return null;
}

async function writeTimeline(entries) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing_supabase_config');

  const resp = await fetch(
    url + '/rest/v1/timeline?on_conflict=id',
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
      const entries = await readTimeline();
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
      await writeTimeline(entries);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(502).json({ error: 'save_failed' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method_not_allowed' });
};
