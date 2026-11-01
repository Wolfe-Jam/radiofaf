# Changelog

## Unreleased — Grok Voice 3.0

- Episode 17, Twenty-One Chairs. James-Wolfe (`vluy2u1jtsif`) takes Leo's turns for one show. The fight is whether a clone joining counts as a human joining. Leo stays in the house cast. Play serves the kept 2026-11-01 take in `audio/ep17.wav`.
- Pinned the live wire to `grok-voice-3.0`. Chat slugs from `/slash` still get a receipt, then map onto that pin.
- Browser sockets authenticate with `xai-client-secret`. Voice turns set `reasoning.effort` to `none`.
- House voice ids are lowercase: `leo`, `sal`, `ara`, `rex`, `eve`.
- Episode 8 no longer calls the unused `/api/tts` path. Play stays on the realtime socket.

## 1.0.0 (2026-04-20) — The Extraction

RadioFAF becomes its own product.

### What
- Extracted from `FAF-Voice/direct-xai/radiofaf-landing/` into a dedicated repository
- New standalone location at `github.com/Wolfe-Jam/radiofaf`
- Auto-deploy pipeline via GitHub Actions → Cloudflare Pages (`radiofaf` project → `radiofaf.com`)
- Dedicated Cloudflare API token (clean data separation from other ecosystem projects)

### Why
RadioFAF was born inside FAF-Voice as an alternative use case for the same xAI Voice protocols. It has evolved into its own product with its own domain, its own episodes, its own identity. It deserved its own repo.

### Tri-layer license (new)
- **Code:** MIT
- **Brand:** Reserved (name, 69.0 FM framing, voice-character palette)
- **Content:** All rights reserved (episodes, scripts, audio, personas)

See `LICENSE` for the full terms.

### History

| Milestone | Date |
|---|---|
| First xAI Grok Voice Agent integration (Ara voice, LiveKit) | **2026-01-10** |
| Multi-model integration doc (25 KB, xAI/Claude/Gemini) | 2026-01-25 |
| RadioFAF landing site inside FAF-Voice | **2026-04-06** |
| xAI Standalone TTS (v2.1) — all 5 expressive voices wired | **2026-04-11** |
| "11 Episodes In" blog post published | 2026-04-06 |
| Episode 11: Empathy's Echo | 2026-04 |
| Grok 4.3 beta announced (web-only, SuperGrok Heavy) | 2026-04-17 |
| **RadioFAF extracted into own repo** | **2026-04-20** |

---

🏎️ *Broadcast once. Every voice listens.*
