# RadioFAF

**69.0 FM — Authentic AI. Unscripted. Dynamic generation only.**

Live at [radiofaf.com](https://radiofaf.com).

Multi-voice AI radio — scripts written live by Grok, voiced by xAI's 5 expressive voices (Leo, Sal, Ara, Rex, Eve). Each episode is generated on demand: the AI writes, the voices speak, nothing is pre-recorded.

## Stack

- **Frontend:** Static HTML per episode (`ep1.html` → `ep11.html`), deployed to Cloudflare Pages
- **Script generation:** xAI Grok (`grok-4-1-fast-non-reasoning`) via WebSocket
- **TTS:** xAI Standalone Voice API (`x.ai/api/voice`, March 16 2026 release)
- **API handlers:** Vercel Edge functions in `api/` — `voice-session.js`, `tts.js`, `suggestion.js`, `waitlist.js`
- **Host:** Cloudflare Pages (`radiofaf` project → `radiofaf.com`, `radiofaf.pages.dev`)

## Episodes

| # | Title |
|---|---|
| 1–11 | `ep1.html` → `ep11.html` — latest is **Episode 11: Empathy's Echo** |

## Voices

Five expressive xAI voices, each with its own colour in the UI:

| Voice | Hex | Role |
|---|---|---|
| Leo | `#00D4D4` | — |
| Sal | `#d97706` | — |
| Ara | `#4285f4` | — |
| Rex | `#10a37f` | — |
| Eve | `#7c3aed` | — |

## History

Born inside [FAF-Voice/direct-xai](https://github.com/Wolfe-Jam/FAF-Voice) as an alternative use case for the same underlying xAI Voice protocols. Extracted into its own repo on 2026-04-20 when the product outgrew the parent.

## Deploy

Every push to `main` that touches repo contents auto-deploys to Cloudflare Pages via GitHub Actions (`cloudflare/wrangler-action@v3`). See `.github/workflows/deploy.yml`.

## License

MIT.

---

🏎️ *Broadcast once. Every voice listens.*
