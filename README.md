# RadioFAF

[![Deploy](https://github.com/Wolfe-Jam/radiofaf/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/Wolfe-Jam/radiofaf/actions/workflows/deploy.yml)
[![Live](https://img.shields.io/badge/live-radiofaf.com-FF4400?style=flat)](https://radiofaf.com)
[![Voices](https://img.shields.io/badge/xAI_voices-5_expressive-7c3aed?style=flat)](https://x.ai)
[![Episodes](https://img.shields.io/badge/episodes-11-00D4D4?style=flat)](https://radiofaf.com)
[![License: MIT code / reserved brand](https://img.shields.io/badge/license-MIT_code_%C2%B7_reserved_brand-blue?style=flat)](./LICENSE)

**69.0 FM — Authentic AI. Unscripted. Dynamic generation only.**

Live at **[radiofaf.com](https://radiofaf.com)**.

Multi-voice AI radio. Scripts written live by Grok. Five expressive voices speak them. Nothing is pre-recorded. Every episode is generated on demand.

## Stack

| Layer | Technology |
|---|---|
| **LLM** | xAI Grok (`grok-4-1-fast-non-reasoning`) via realtime WebSocket |
| **TTS** | xAI Standalone Voice API (`x.ai/api/voice`) — 5 expressive voices |
| **Voices** | Leo · Sal · Ara · Rex · Eve |
| **Edge functions** | Vercel-compatible handlers in `api/` — `voice-session`, `tts`, `suggestion`, `waitlist` |
| **Host** | Cloudflare Pages (`radiofaf` project → `radiofaf.com`, `radiofaf.pages.dev`) |
| **CI/CD** | GitHub Actions → `cloudflare/wrangler-action@v3` |

## The Five Voices

Each voice has its own colour and character in every episode UI:

| Voice | Colour | Hex |
|---|---|---|
| Leo | 🩵 | `#00D4D4` |
| Sal | 🟠 | `#d97706` |
| Ara | 🔵 | `#4285f4` |
| Rex | 🟢 | `#10a37f` |
| Eve | 🟣 | `#7c3aed` |

## Episodes

`ep1.html` → `ep11.html`. Latest: **Episode 11 — Empathy's Echo** (AI models fake perfect empathy while having zero memory or feeling. Five voices debate emotional theater.)

Listen at [radiofaf.com](https://radiofaf.com).

## History — first-mover authority on xAI Voice

| Milestone | Date |
|---|---|
| First xAI Grok Voice Agent integration (Ara, LiveKit) | **2026-01-10** |
| Multi-model integration doc (25 KB, xAI + Claude + Gemini) | 2026-01-25 |
| xAI Standalone TTS (v2.1) — all 5 expressive voices wired | **2026-04-11** |
| "11 Episodes In" blog post | 2026-04-06 |
| **Grok 4.3 beta announced** (web-only, SuperGrok Heavy tier) | 2026-04-17 |
| **RadioFAF extracted into own repo** | 2026-04-20 |

RadioFAF has been in production with xAI's expressive voice stack **over three months** before Grok 4.3 beta shipped.

## Deploy

Every push to `main` auto-deploys to Cloudflare Pages.

```bash
git clone https://github.com/Wolfe-Jam/radiofaf.git
cd radiofaf
# Static HTML + edge functions — no build step
```

Required GitHub repo secrets for the auto-deploy workflow:
- `CLOUDFLARE_API_TOKEN` (scope: Pages Edit)
- `CLOUDFLARE_ACCOUNT_ID`

## Ecosystem

RadioFAF is part of the [FAF ecosystem](https://faf.one):

- [`faf.one`](https://faf.one) — the IANA-registered AI Context format (`application/vnd.faf+yaml`)
- [`slash-tokens`](https://github.com/Wolfe-Jam/slash-tokens) — 4.8 KB WASM SDK for token optimization
- [`slashtokens.com`](https://slashtokens.com) — *Don't go to the corner shop in a Ferrari* 🏎️
- [`mcpaas.live`](https://mcpaas.live) — MCP as a Service, 300+ Cloudflare edges

## License

**Three layers, three terms.** See [LICENSE](./LICENSE) for the full text.

| Layer | Terms |
|---|---|
| **Code** — this repository | **MIT** — fork it, ship it, change it, sell it |
| **Brand** — *RadioFAF*, 69.0 FM, voice palette | **Reserved** — use your own name + colours in forks |
| **Content** — episodes, scripts, audio, personas | **All rights reserved** — study and quote freely; republication requires permission |

## Code of Conduct & Security

- [Code of Conduct](./CODE_OF_CONDUCT.md) — Contributor Covenant v2.1. Report: `team@faf.one`
- [Security Policy](./SECURITY.md) — Report vulnerabilities: `security@faf.one`

---

🏎️ *Broadcast once. Every voice listens.*
