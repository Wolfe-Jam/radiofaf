#!/usr/bin/env python3
"""
Slash A/B — same prompt, two models.
Grok-4.20 (frontier) vs Grok-4.1-Fast (what Slash routes to when the task fits).

This measures what Slash actually does: intelligent SAME-PROVIDER routing.
The prompt does NOT change. The model changes. Cost drops ~90%.

Requires XAI_API_KEY in environment.
Run:  python /tmp/slash-ab.py
"""

import os, json, time
from datetime import datetime
from openai import OpenAI

API_KEY = os.environ.get("XAI_API_KEY")
if not API_KEY:
    raise SystemExit("XAI_API_KEY not set. Run: export XAI_API_KEY=xai-...")

client = OpenAI(api_key=API_KEY, base_url="https://api.x.ai/v1")

FRONTIER = "grok-4.20-0309-reasoning"
FAST     = "grok-4-1-fast-non-reasoning"

PRICING = {
    FRONTIER: {"input": 3.00, "output": 15.00},   # $/M tokens
    FAST:     {"input": 0.20, "output":  0.50},
}

SYSTEM = "You are an expert radio script writer for RadioFAF."

USER = """
Write a 3-paragraph opening monologue for RadioFAF Episode 12 —
"The Token Tax: How /slash Makes Grok's Massive Context Actually Affordable".
Voice: Leo (measured, principled). Include:

- /slash intercepted the call when I asked Grok-4.20 about reducing token costs.
  Routed to Grok-4.1-Fast. 90% cheaper. Same answer.
- Grok's reply named the technique (caching, compression, routing) while
  being routed itself. Meta-moment on X, April 2026.
- The Gate: PREVENT / ROUTE / PASS. Same-provider only.
- 4.8 KB Zig WASM. 96-98% accurate Grok tokenizer. 1.5k npm/month.
- Industry token waste 40-80%. 5-10% gate = $110-360M/yr industry-wide.

End with: "Don't go to the corner shop in a Ferrari."
"""

def run(model):
    t0 = time.perf_counter()
    r = client.chat.completions.create(
        model=model,
        messages=[{"role":"system","content":SYSTEM},{"role":"user","content":USER}],
        temperature=0.7, max_tokens=2000,
    )
    dt = time.perf_counter() - t0
    i, o = r.usage.prompt_tokens, r.usage.completion_tokens
    p = PRICING[model]
    cost = (i * p["input"] + o * p["output"]) / 1_000_000
    return {"model":model, "in":i, "out":o, "latency":round(dt,2),
            "cost":round(cost,6), "text":r.choices[0].message.content or ""}

print(f"\n▶ {datetime.now().isoformat(timespec='seconds')}  SAME prompt · TWO models\n")

print(f"[A] {FRONTIER} ...")
a = run(FRONTIER)
print(f"    {a['in']} in · {a['out']} out · {a['latency']}s · ${a['cost']:.4f}")

print(f"[B] {FAST} ...")
b = run(FAST)
print(f"    {b['in']} in · {b['out']} out · {b['latency']}s · ${b['cost']:.4f}")

saved = a["cost"] - b["cost"]
pct   = (saved / a["cost"]) * 100 if a["cost"] else 0
speed = a["latency"] / b["latency"] if b["latency"] else 0

print(f"\n{'─'*64}")
print(f"{'METRIC':<18}{'FRONTIER':>15}{'FAST':>15}{'DELTA':>14}")
print(f"{'─'*64}")
print(f"{'Input tokens':<18}{a['in']:>15,}{b['in']:>15,}")
print(f"{'Output tokens':<18}{a['out']:>15,}{b['out']:>15,}")
print(f"{'Latency (s)':<18}{a['latency']:>15}{b['latency']:>15}{speed:>13.1f}x")
print(f"{'Cost (USD)':<18}{a['cost']:>15.4f}{b['cost']:>15.4f}")
print(f"{'Saved':<18}{'':>15}{'':>15}{'$'+format(saved,'.4f'):>14}")
print(f"{'Saved %':<18}{'':>15}{'':>15}{pct:>13.1f}%")
print(f"{'─'*64}\n")

with open("/tmp/slash-ab-receipts.json","w") as f:
    json.dump({"ts":datetime.now().isoformat(timespec='seconds'),
               "frontier":a,"fast":b,"saved_usd":round(saved,6),
               "saved_pct":round(pct,2),"latency_speedup":round(speed,2)}, f, indent=2)

print("Full JSON → /tmp/slash-ab-receipts.json")
print("Frontier script preview:\n" + (a["text"][:400] + "...\n") if a["text"] else "")
print("Fast script preview:\n"     + (b["text"][:400] + "...\n") if b["text"] else "")
