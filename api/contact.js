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
  const email = String(body.email || '').trim().toLowerCase();
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

    // Spam guard: cap messages per email within a rolling 24-hour window.
    const MAX_PER_DAY = 5;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', since);
    if (countError) {
      console.error('Supabase count error:', countError);
      return res.status(500).json({ ok: false, error: 'Could not send your message. Please try again.' });
    }
    if (typeof count === 'number' && count >= MAX_PER_DAY) {
      return res.status(429).json({
        ok: false,
        error: `You've reached the limit of ${MAX_PER_DAY} messages per day for this email. Please try again in 24 hours or email us directly.`,
      });
    }

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
