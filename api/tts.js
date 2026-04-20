// Vercel Edge Function — xAI Standalone TTS for RadioFAF v2.1
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
    const { voice, text } = await req.json();

    if (!voice || !text) {
      return new Response(JSON.stringify({ error: 'Missing voice or text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // xAI Standalone TTS endpoint (March 16, 2026)
    const ttsRes = await fetch('https://x.ai/api/voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        voice: voice,
        text: text,
        format: 'mp3',
        quality: 'high'
      })
    });

    if (!ttsRes.ok) {
      const error = await ttsRes.text();
      return new Response(JSON.stringify({ error: 'TTS failed', details: error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Return MP3 blob
    const audioBlob = await ttsRes.blob();
    return new Response(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}