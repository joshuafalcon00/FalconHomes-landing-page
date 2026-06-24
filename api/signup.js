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

    // Save the name in Supabase user metadata via options.data.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      console.error('Supabase signUp error:', error);
      return res.status(400).json({ ok: false, error: error.message || 'Could not create your account.' });
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
