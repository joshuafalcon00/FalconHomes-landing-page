// Serverless function (Vercel) for the "Send us a message" form on index.html.
// It inserts one row into the Supabase `messages` table using the Supabase JS client.
// Credentials come from environment variables only — never hard-code them, and the
// service role key is NOT used here (the anon key is enough for an insert).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  // Only accept POST.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  // Fail clearly if the environment is not configured yet.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Server is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
    });
  }

  // Vercel usually parses JSON bodies; guard for the string case too.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }
  body = body || {};

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();

  // Validate on the server (never trust the client alone).
  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Name and email are required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { error } = await supabase
      .from('messages')
      .insert({ name, email, message: message || null });

    if (error) {
      // Log server-side for debugging; keep the client message generic.
      console.error('Supabase insert error:', error);
      return res.status(500).json({ ok: false, error: 'Could not save your message. Please try again.' });
    }

    return res.status(200).json({ ok: true, message: 'Thanks, your message was received.' });
  } catch (err) {
    console.error('Unexpected error in /api/contact:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again later.' });
  }
}
