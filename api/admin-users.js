// Serverless function (Vercel) for the admin "Accounts" section.
// Lists and deletes Supabase Auth users via the Auth Admin API.
//
// SECURITY:
//  - Uses the SERVICE_ROLE key, which is privileged. It lives ONLY here, server-side,
//    read from process.env. It is never sent to the browser.
//  - Every request must carry the correct `x-admin-secret` header (ADMIN_SECRET env var),
//    otherwise it is rejected. This keeps the destructive endpoint from being open to anyone.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.ADMIN_PASSWORD;

function adminHeaders() {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

export default async function handler(req, res) {
  // CORS (admin page may be opened from the deployed origin).
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' });
  }
  if (!ADMIN_SECRET) {
    return res.status(503).json({ ok: false, error: 'Admin endpoint disabled: ADMIN_PASSWORD is not set on the server.' });
  }

  // Gate: require the shared admin secret on every request.
  const provided = req.headers['x-admin-secret'];
  if (!provided || provided !== ADMIN_SECRET) {
    return res.status(401).json({ ok: false, error: 'Unauthorized. Wrong or missing admin password.' });
  }

  try {
    if (req.method === 'GET') {
      // List Auth users (paginate to be safe; cap pages so this can't run away).
      const all = [];
      for (let page = 1; page <= 20; page++) {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200&page=${page}`, { headers: adminHeaders() });
        if (!r.ok) {
          const t = await r.text();
          console.error('list users failed:', r.status, t);
          return res.status(502).json({ ok: false, error: 'Could not list accounts.' });
        }
        const data = await r.json();
        const users = data.users || [];
        all.push(...users);
        if (users.length < 200) break;
      }
      const slim = all.map((u) => ({
        id: u.id,
        email: u.email,
        name: (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || '',
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
      }));
      // Newest first.
      slim.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.status(200).json({ ok: true, users: slim });
    }

    if (req.method === 'DELETE') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch { body = {}; } }
      body = body || {};
      const id = String(body.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'Missing user id.' });

      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (!r.ok) {
        const t = await r.text();
        console.error('delete user failed:', r.status, t);
        return res.status(502).json({ ok: false, error: 'Could not delete the account.' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, DELETE, OPTIONS');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  } catch (err) {
    console.error('Unexpected error in /api/admin-users:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong.' });
  }
}
