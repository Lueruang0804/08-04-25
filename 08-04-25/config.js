/* ============================================================
   GET /api/config -> { supabaseUrl: string | null }

   Exposes the Supabase project URL to the client so the gallery can
   build public Storage URLs directly (no server round-trip per
   image). This is safe to expose — it's just a project URL, not a
   secret. The service_role key that can WRITE to Supabase never
   leaves the server; see api/letter.js, api/timeline.js, api/photo.js.
   ============================================================ */

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  return res.status(200).json({ supabaseUrl: process.env.SUPABASE_URL || null });
};
