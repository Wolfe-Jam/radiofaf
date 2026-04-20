// Vercel Edge Function — RadioFAF frequency waitlist
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const data = await req.json();
    const { name, email, picks, timestamp } = data;

    if (!name || !email || !picks || picks.length < 2) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log to Vercel function logs (visible in dashboard)
    const entry = `[${timestamp}] ${name} <${email}> — picks: ${picks.join(', ')}`;
    console.log('WAITLIST SIGNUP:', entry);

    // Send notification email via Resend (non-blocking)
    try {
      if (process.env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'RadioFAF <team@faf.one>',
            to: 'team@faf.one',
            subject: `Waitlist signup: ${name} — ${picks[0]}`,
            html: `<div style="font-family:monospace;background:#111;color:#fff;padding:20px;border-radius:8px;">
<h2 style="color:#E91E9E;margin:0 0 10px;">RadioFAF Waitlist Signup</h2>
<p><strong style="color:#84FF00;">Name:</strong> ${name}</p>
<p><strong style="color:#84FF00;">Email:</strong> ${email}</p>
<p><strong style="color:#84FF00;">Picks:</strong> ${picks.join(', ')}</p>
<p style="color:#666;font-size:12px;margin-top:20px;">${timestamp}</p>
</div>`
          })
        });
      }
    } catch (e) {
      console.warn('Resend email failed (non-blocking):', e.message);
    }

    // Persist to MCPaaS (non-blocking)
    try {
      await fetch('https://mcpaas.live/radiofaf-waitlist/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry, type: 'waitlist', token: 'wolfe-68-orange' })
      });
    } catch (e) {
      console.warn('MCPaaS write failed (non-blocking):', e.message);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
