// Cloudflare Pages Function — xAI Standalone TTS for RadioFAF v2.1

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
    const { voice, text } = await request.json();

    if (!voice || !text) {
      return new Response(JSON.stringify({ error: 'Missing voice or text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const ttsRes = await fetch('https://x.ai/api/voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        voice,
        text,
        format: 'mp3',
        quality: 'high',
      }),
    });

    if (!ttsRes.ok) {
      const error = await ttsRes.text();
      return new Response(JSON.stringify({ error: 'TTS failed', details: error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const audioBlob = await ttsRes.blob();
    return new Response(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        ...CORS,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
}
