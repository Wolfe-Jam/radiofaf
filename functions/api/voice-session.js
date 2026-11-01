// Cloudflare Pages Function — xAI ephemeral token + /slash routing decision
//
// 2026-04-22: routing decision moved from hardcoded ?model=grok-4-1-fast-non-reasoning
// to a live call to mcpaas.live/slash/route-decision. RadioFAF is now the lived-experience
// proof of /slash — every episode generation is a recorded routing decision.
//
// 2026-11-01: the websocket pin is grok-voice-3.0 (realtime S2S).
// grok-voice-latest now aliases 3.0; we pin the version so the next alias
// move cannot change the station. /slash still routes chat slugs. We keep
// that call for the receipt, then map any chat slug onto the voice pin.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SLASH_DECISION_URL = 'https://mcpaas.live/slash/route-decision';

// Fallback / live pin: realtime speech-to-speech. Not a chat slug.
// grok-4-1-fast-non-reasoning retired 2026-05-15 (redirects to grok-4.3).
// grok-voice-2.0 deprecated 2026-10-14. Pin the version, not the alias.
const FALLBACK_REALTIME_MODEL = 'grok-voice-3.0';

// Translate /slash canonical name → xAI Realtime API model name.
// Chat slugs are the wrong class for S2S. Voice aliases pass through.
function toRealtimeModel(canonical) {
  if (!canonical) return FALLBACK_REALTIME_MODEL;
  if (typeof canonical === 'string' && canonical.startsWith('grok-voice')) {
    return canonical;
  }
  return FALLBACK_REALTIME_MODEL;
}

async function getRoutedModel(env) {
  // Default-naive request — what most builders would do without /slash.
  // /slash routes this to grok-4-1-fast for non-reasoning workloads.
  const body = {
    provider: 'xai',
    model: 'grok-4.20-0309-reasoning',
    est_tokens: 1500,
    app: 'radiofaf',
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-slash-app': 'radiofaf', // belt-and-braces: header AND body field
    };
    if (env.SLASH_KEY) headers['x-slash-key'] = env.SLASH_KEY; // enables KV tracking
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
    // Fail open — RadioFAF must keep generating episodes even if mcpaas.live is down
    console.error('slash route-decision failed, using fallback:', err.message);
    return {
      model: FALLBACK_REALTIME_MODEL,
      routed_via_slash: false,
      decision: { model: FALLBACK_REALTIME_MODEL, routed: true, reason: 'fallback (slash unavailable)' },
    };
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequest({ request, env }) {
  try {
    // Route first so the token is bound to the same model the page will open.
    const routing = await getRoutedModel(env);
    const tokenRes = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.XAI_API_KEY}`,
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
