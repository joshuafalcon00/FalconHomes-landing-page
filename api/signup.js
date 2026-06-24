// Serverless function (Vercel) for Sign Up using Supabase Auth.
// Registers the user with email + password and stores their name in user metadata.
// Credentials come from environment variables only — never hard-coded, anon key only.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const redirectTo = String(body.redirectTo || '').trim();

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: 'Name, email, and password are all required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters.' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Save the name in user metadata; point the confirmation email link back to the site.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: redirectTo || undefined,
      },
    });

    if (error) {
      console.error('Supabase signUp error:', error);
      const m = (error.message || '').toLowerCase();
      if (m.includes('already registered') || m.includes('already exists') || m.includes('already been registered')) {
        return res.status(409).json({ ok: false, code: 'exists', error: 'You already have an account. Please sign in instead.' });
      }
      return res.status(400).json({ ok: false, error: error.message || 'Could not create your account.' });
    }

    // With email confirmation on, Supabase returns an obfuscated user with an empty
    // identities array when the email is already registered.
    const u = data && data.user;
    if (u && Array.isArray(u.identities) && u.identities.length === 0) {
      return res.status(409).json({ ok: false, code: 'exists', error: 'You already have an account. Please sign in instead.' });
    }

    // Record the sign-up in the signups table (best-effort; don't fail signup on a logging error).
    try {
      const { error: recErr } = await supabase.from('signups').insert({ name, email });
      if (recErr) console.error('signups record error:', recErr);
    } catch (recEx) {
      console.error('signups record exception:', recEx);
    }

    return res.status(200).json({
      ok: true,
      message: 'Account created. Please check your email to confirm your account.',
    });
  } catch (err) {
    console.error('Unexpected error in /api/signup:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again later.' });
  }
}
