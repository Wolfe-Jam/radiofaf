# /slash Benchmarks

Reproducible A/B receipts for the `/slash-tokens` routing thesis — same prompt, two models, real numbers on real APIs.

## Latest run — 2026-04-20

**Same prompt, Grok-4.20 reasoning vs Grok-4.1-Fast** (the route `/slash` would make on this kind of task):

| Metric | grok-4.20-0309-reasoning | grok-4-1-fast-non-reasoning | Delta |
|---|---|---|---|
| Input tokens | 337 | 378 | — |
| Output tokens | 298 | 335 | — |
| **Latency** | 14.38s | **2.63s** | **5.5× faster** |
| **Cost (USD)** | $0.0055 | **$0.0002** | **95.6% cheaper** |
| Quality | Valid opening monologue | Valid opening monologue | Same |

Raw JSON: [`slash-ab-receipts-2026-04-20.json`](./slash-ab-receipts-2026-04-20.json)

## Reproduce it yourself

```bash
export XAI_API_KEY=xai-...
python3 -m venv /tmp/slash-venv
/tmp/slash-venv/bin/pip install openai
/tmp/slash-venv/bin/python benchmarks/slash-ab.py
```

~20s. Prints the receipts table and writes fresh JSON.

## What this proves

Slash is **intelligent same-provider routing**. The prompt doesn't change — the *model* changes. When the task fits a cheaper same-family model (Grok-4.20 → Grok-4.1-Fast · Claude Opus → Haiku), routing cuts cost by 90%+ and latency by multiples, with no quality loss on task-appropriate work.

This is *not* prompt compression. The prompt stays byte-for-byte identical.

## Files

| File | What |
|---|---|
| `slash-ab.py` | The benchmark harness. Runs the same prompt through both models via xAI's API, measures tokens / latency / cost, saves JSON. |
| `slash-ab-receipts-2026-04-20.json` | The full raw output from the 2026-04-20 run — all fields, both responses, timings. |
| `README.md` | This file — summary + reproduction steps. |

## Notes

- **Token counts differ slightly** (337 vs 378 input) because Grok-4.20 and Grok-4.1-Fast use different tokenizers internally. This is expected and does not affect the routing thesis — it's the cost per call that matters.
- **Latency is wall-clock** from API request to response. Measured with `time.perf_counter()` in the harness.
- **Cost is computed from public pricing** — see `PRICING` dict in `slash-ab.py`. Updated as xAI changes rates.
- **Quality was qualitatively inspected** — both models produced coherent RadioFAF opening monologues hitting all brand beats from the prompt. Future runs should include automated quality comparison (e.g. LLM-as-judge).

---

🏎️ *Don't go to the corner shop in a Ferrari.*
