// Twin of functions/api/voice-session.js for the Vercel-style handler.
// Cloudflare Pages serves functions/api/. Keep the two in lockstep.
//
// 2026-11-01: pin grok-voice-3.0. Chat slugs from /slash are recorded, then
// mapped onto the voice pin. Reasoning is off — a radio turn is not a proof.

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SLASH_DECISION_URL = 'https://mcpaas.live/slash/route-decision';
const FALLBACK_REALTIME_MODEL = 'grok-voice-3.0';

function toRealtimeModel(canonical) {
  if (!canonical) return FALLBACK_REALTIME_MODEL;
  if (typeof canonical === 'string' && canonical.startsWith('grok-voice')) {
    return canonical;
  }
  return FALLBACK_REALTIME_MODEL;
}

async function getRoutedModel() {
  const body = {
    provider: 'xai',
    model: 'grok-4.20-0309-reasoning',
    est_tokens: 1500,
    app: 'radiofaf',
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-slash-app': 'radiofaf',
    };
    if (process.env.SLASH_KEY) headers['x-slash-key'] = process.env.SLASH_KEY;
    const res = await fetch(SLASH_DECISION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`slash route-decision returned ${res.status}`);
    const decision = await res.json();
    return {
      model: toRealtimeModel(decision.model),
      routed_via_slash: true,
      decision,
    };
  } catch (err) {
    console.error('slash route-decision failed, using fallback:', err.message);
    return {
      model: FALLBACK_REALTIME_MODEL,
      routed_via_slash: false,
      decision: { model: FALLBACK_REALTIME_MODEL, routed: true, reason: 'fallback (slash unavailable)' },
    };
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const routing = await getRoutedModel();
    const tokenRes = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        expires_after: { seconds: 90 },
        session: {
          model: routing.model,
          reasoning: { effort: 'none' },
        },
      }),
    });

    if (!tokenRes.ok) {
      const error = await tokenRes.text();
      return new Response(JSON.stringify({ error: 'Token failed', details: error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.value || tokenData.client_secret?.value || tokenData.token;

    return new Response(JSON.stringify({
      wsUrl: 'wss://api.x.ai/v1/realtime',
      token,
      model: routing.model,
      routed_via_slash: routing.routed_via_slash,
      slash_decision: routing.decision,
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
}
