// Cloudflare Pages Function — RadioFAF topic suggestion

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  try {
    const { name, email, topic, details, timestamp } = await request.json();

    if (!name || !email || !topic) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const subject = `RadioFAF 69.0 FM — Topic Suggestion from ${name}`;
    const emailBody = `From: ${name} (${email})

Topic: ${topic}

Details:
${details || 'No additional details provided.'}

---
Submitted via RadioFAF.com
Timestamp: ${timestamp}`;

    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({
        error: 'Email service not configured',
        fallback: true,
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'suggestions@radiofaf.com',
        to: 'team@faf.one',
        subject,
        text: emailBody,
        reply_to: email,
      }),
    });

    if (!response.ok) {
      throw new Error('Email service failed');
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Suggestion sent successfully',
      id: result.id,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      fallback: true,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
}
