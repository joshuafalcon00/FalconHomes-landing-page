// Serverless function (Vercel) for the "Send us a message" form on index.html.
// It inserts one row into the Supabase `messages` table using the Supabase JS client.
// Credentials come from environment variables only — never hard-code them, and the
// service role key is NOT used here (the anon key is enough for an insert).

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

export default async function handler(req, res) {
  // CORS: allow cross-origin calls (local dev, custom domains) and preflight.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { return res.status(204).end(); }

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

    // Best-effort confirmation email via Resend. The submission is already saved,
    // so a failed/missing email must NOT fail the request.
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Falcon Homes <onboarding@resend.dev>',
          to: email,
          subject: `Thanks for reaching out, ${name}`,
          text:
            `Hi ${name},\n\n` +
            `Thanks for reaching out to Falcon Homes. Your message landed safely, and a Falcon Ridge advisor will get back to you at Falcon Speed.\n\n` +
            `While you wait, feel free to explore the homes ready now at Falcon Ridge.\n\n` +
            `Warmly,\nThe Falcon Homes team`,
          html:
            `<p>Hi ${escapeHtml(name)},</p>` +
            `<p>Thanks for reaching out to <strong>Falcon Homes</strong>. Your message landed safely, and a Falcon Ridge advisor will get back to you at <em>Falcon Speed</em>.</p>` +
            `<p>While you wait, feel free to explore the homes ready now at Falcon Ridge.</p>` +
            `<p>Warmly,<br>The Falcon Homes team</p>`,
        });
      } catch (emailErr) {
        console.error('Resend email error (submission still saved):', emailErr);
      }
    }

    return res.status(200).json({ ok: true, message: 'Thanks, your message was received.' });
  } catch (err) {
    console.error('Unexpected error in /api/contact:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again later.' });
  }
}
