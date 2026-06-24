// Serverless function (Vercel) for Sign In using Supabase Auth.
// Logs in with email + password via signInWithPassword and returns the user's
// name (from user metadata) and last sign-in time for the welcome message.
// Credentials come from environment variables only — never hard-coded, anon key only.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // CORS: allow cross-origin calls (local dev, custom domains) and preflight.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { return res.status(204).end(); }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ ok: false, error: 'Server is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }
  body = body || {};

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password are required.' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Supabase signIn error:', error);
      return res.status(401).json({ ok: false, error: error.message || 'Invalid email or password.' });
    }

    const user = data.user || {};
    const meta = user.user_metadata || {};
    const name = meta.name || meta.full_name || '';

    // Record the sign-in in the signin table (best-effort).
    try {
      const { error: recErr } = await supabase.from('signin').insert({ email });
      if (recErr) console.error('signin record error:', recErr);
    } catch (recEx) {
      console.error('signin record exception:', recEx);
    }

    return res.status(200).json({
      ok: true,
      name,
      lastSignInAt: user.last_sign_in_at || null,
    });
  } catch (err) {
    console.error('Unexpected error in /api/signin:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again later.' });
  }
}
