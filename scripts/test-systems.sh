#!/bin/bash
#
# RadioFAF + Slash — Essential System Tests
# ---------------------------------------------------------------------------
# Goal: verify every moving part of the architecture in <60s.
# Each test is a CHECKPOINT mapped to a layer of the stack. A failure
# pinpoints WHICH LAYER is broken — easy debugging.
#
# Layers:
#   FE   — Frontend (Cloudflare Pages serving radiofaf.com)
#   APIR — RadioFAF API (CF Pages Functions: /api/voice-session)
#   APIM — mcpaas-cf API (Cloudflare Worker: /slash/*)
#   KV   — KV state (mcpaas SOULS namespace)
#   E2E  — End-to-end flow (trigger → wait → verify)
#
# Usage:
#   ./scripts/test-systems.sh             # run all
#   ./scripts/test-systems.sh --no-kv     # skip KV checks (no wrangler auth needed)
#   ./scripts/test-systems.sh --verbose   # print full responses on success too
#
# Exit code: 0 if all PASS, 1 if any FAIL.
#
set -uo pipefail

# ---------- config (override via env) ----------
RADIOFAF_HOST="${RADIOFAF_HOST:-https://radiofaf.com}"
MCPAAS_HOST="${MCPAAS_HOST:-https://mcpaas.live}"
SLASH_KEY_ID="${SLASH_KEY_ID:-mcp_slash_radiofaf_cbc00deb9220e21baff1a03d}"
KV_NAMESPACE="${KV_NAMESPACE:-3301a2451d68491d8c78c3c62088a3e3}"
WRANGLER_DIR="${WRANGLER_DIR:-/Users/wolfejam/FAF/mcpaas-cf}"

# Retry-hardened curl — eliminates transient 56/52 errors in the test suite
CURL="curl --retry 3 --retry-delay 1 --connect-timeout 10 --max-time 20 -sS"

VERBOSE=0
SKIP_KV=0
for arg in "$@"; do
  case "$arg" in
    --verbose|-v) VERBOSE=1 ;;
    --no-kv) SKIP_KV=1 ;;
    --help|-h)
      sed -n '2,25p' "$0"
      exit 0
      ;;
  esac
done

# ---------- colors ----------
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  CYAN='\033[0;36m'; DIM='\033[2m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; DIM=''; NC=''
fi

# ---------- counters ----------
PASS=0
FAIL=0
SKIP=0
declare -a FAILURES

# ---------- test framework ----------
# Args:  $1 = checkpoint id (e.g. "FE-1")
#        $2 = layer (FE/APIR/APIM/KV/E2E)
#        $3 = description
#        $4 = command (string, eval'd; should exit 0 on success)
checkpoint() {
  local id="$1" layer="$2" desc="$3" cmd="$4"
  printf "  ${CYAN}%-7s${NC} ${DIM}[%s]${NC} %-50s " "$id" "$layer" "$desc"
  local output exit_code
  output=$(eval "$cmd" 2>&1)
  exit_code=$?
  if [ $exit_code -eq 0 ]; then
    printf "${GREEN}✓ PASS${NC}\n"
    PASS=$((PASS + 1))
    [ "$VERBOSE" = "1" ] && [ -n "$output" ] && echo "$output" | sed "s/^/      ${DIM}/" | sed "s/$/${NC}/"
    return 0
  else
    printf "${RED}✗ FAIL${NC}\n"
    FAIL=$((FAIL + 1))
    FAILURES+=("$id [$layer] $desc")
    echo "      ${DIM}command:${NC} $cmd"
    if [ -n "$output" ]; then
      echo "$output" | head -3 | sed "s/^/      ${DIM}output:${NC} /"
    fi
    return 1
  fi
}

skip_checkpoint() {
  local id="$1" layer="$2" desc="$3" reason="$4"
  printf "  ${CYAN}%-7s${NC} ${DIM}[%s]${NC} %-50s ${YELLOW}⊘ SKIP${NC} ${DIM}(%s)${NC}\n" "$id" "$layer" "$desc" "$reason"
  SKIP=$((SKIP + 1))
}

# Helper: extract a JSON field with python3 (no jq dependency)
jget() {
  local field="$1"
  python3 -c "import sys, json; d = json.load(sys.stdin); v = d
for k in '$field'.split('.'):
  if k.isdigit(): v = v[int(k)]
  else: v = v.get(k) if isinstance(v, dict) else None
print('' if v is None else v)" 2>/dev/null
}

# ---------- preflight: required tools ----------
echo
echo "RadioFAF + Slash — Essential System Tests"
echo "================================================================"
echo "  RadioFAF host:  $RADIOFAF_HOST"
echo "  mcpaas host:    $MCPAAS_HOST"
echo "  Slash key:      $SLASH_KEY_ID"
echo "  KV namespace:   $KV_NAMESPACE"
echo "----------------------------------------------------------------"

for tool in curl python3; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "${RED}Missing required tool: $tool${NC}"
    exit 2
  fi
done

# Cache one /api/voice-session response so multiple tests can read it
VOICE_RESPONSE=$($CURL "$RADIOFAF_HOST/api/voice-session" 2>/dev/null)

# Cache one aggregates response
AGG_RESPONSE=$($CURL "$MCPAAS_HOST/slash/v1/aggregates/radiofaf?nocache=$RANDOM" 2>/dev/null)

# ============================================================
# LAYER FE — Frontend (Cloudflare Pages serving)
# ============================================================
echo
echo "${CYAN}LAYER FE — Frontend (radiofaf.com on Cloudflare Pages)${NC}"

checkpoint "FE-1" "FE" "/home reaches 200 (after redirect)" \
  "[ \$($CURL -Lo /dev/null -w '%{http_code}' '$RADIOFAF_HOST/home') = '200' ]"

checkpoint "FE-2" "FE" "/ep13 reaches 200" \
  "[ \$($CURL -Lo /dev/null -w '%{http_code}' '$RADIOFAF_HOST/ep13') = '200' ]"

checkpoint "FE-3" "FE" "/receipts reaches 200" \
  "[ \$($CURL -Lo /dev/null -w '%{http_code}' '$RADIOFAF_HOST/receipts') = '200' ]"

checkpoint "FE-4" "FE" "ep13 contains 'EPISODE 13' marker" \
  "$CURL -L '$RADIOFAF_HOST/ep13' | grep 'Episode 13' >/dev/null"

checkpoint "FE-5" "FE" "ep13 uses routedModel (not hardcode)" \
  "$CURL -L '$RADIOFAF_HOST/ep13' | grep 'encodeURIComponent(routedModel)' >/dev/null"

checkpoint "FE-6" "FE" "ep10/11/12 also use routedModel" \
  "for ep in 10 11 12; do $CURL -L '$RADIOFAF_HOST/ep'\$ep | grep 'encodeURIComponent(routedModel)' >/dev/null || exit 1; done"

checkpoint "FE-7" "FE" "/receipts has LIVE bar element" \
  "$CURL -L '$RADIOFAF_HOST/receipts' | grep 'id=\"liveBar\"' >/dev/null"

checkpoint "FE-8" "FE" "/receipts fetches mcpaas aggregates" \
  "$CURL -L '$RADIOFAF_HOST/receipts' | grep '/slash/v1/aggregates/radiofaf' >/dev/null"

checkpoint "FE-9" "FE" "/nelly-splash.png is image/png" \
  "[ \"\$($CURL -Io /dev/null -w '%{content_type}' '$RADIOFAF_HOST/nelly-splash.png')\" = 'image/png' ]"

checkpoint "FE-10" "FE" "/ep-combo.js loads + has EP13" \
  "$CURL -L '$RADIOFAF_HOST/ep-combo.js' | grep 'num: 13' >/dev/null"

# ============================================================
# LAYER APIR — RadioFAF API (CF Pages Function)
# ============================================================
echo
echo "${CYAN}LAYER APIR — RadioFAF API (/api/voice-session)${NC}"

checkpoint "APIR-1" "APIR" "/api/voice-session returns valid JSON" \
  "echo '$VOICE_RESPONSE' | python3 -c 'import sys, json; json.load(sys.stdin)'"

checkpoint "APIR-2" "APIR" "response includes wsUrl" \
  "echo '$VOICE_RESPONSE' | python3 -c 'import sys, json; d=json.load(sys.stdin); assert d.get(\"wsUrl\", \"\").startswith(\"wss://\")'"

checkpoint "APIR-3" "APIR" "response includes ephemeral token (>50 chars)" \
  "echo '$VOICE_RESPONSE' | python3 -c 'import sys, json; d=json.load(sys.stdin); assert len(d.get(\"token\", \"\")) > 50'"

checkpoint "APIR-4" "APIR" "response model is grok-4-1-fast-non-reasoning" \
  "echo '$VOICE_RESPONSE' | python3 -c 'import sys, json; d=json.load(sys.stdin); assert d.get(\"model\") == \"grok-4-1-fast-non-reasoning\"'"

checkpoint "APIR-5" "APIR" "routed_via_slash is true" \
  "echo '$VOICE_RESPONSE' | python3 -c 'import sys, json; d=json.load(sys.stdin); assert d.get(\"routed_via_slash\") is True'"

checkpoint "APIR-6" "APIR" "slash_decision.txn_id present (proves SLASH_KEY reached)" \
  "echo '$VOICE_RESPONSE' | python3 -c 'import sys, json; d=json.load(sys.stdin); assert d.get(\"slash_decision\", {}).get(\"txn_id\")'"

# ============================================================
# LAYER APIM — mcpaas-cf API (Slash worker)
# ============================================================
echo
echo "${CYAN}LAYER APIM — mcpaas-cf API (mcpaas.live/slash/*)${NC}"

checkpoint "APIM-1" "APIM" "GET /slash/v1/aggregates/radiofaf returns 200" \
  "[ \$($CURL -Lo /dev/null -w '%{http_code}' '$MCPAAS_HOST/slash/v1/aggregates/radiofaf') = '200' ]"

checkpoint "APIM-2" "APIM" "aggregates JSON has app:radiofaf" \
  "echo '$AGG_RESPONSE' | python3 -c 'import sys, json; d=json.load(sys.stdin); assert d.get(\"app\") == \"radiofaf\"'"

checkpoint "APIM-3" "APIM" "aggregates has decisions field (number)" \
  "echo '$AGG_RESPONSE' | python3 -c 'import sys, json; d=json.load(sys.stdin); assert isinstance(d.get(\"decisions\"), int)'"

checkpoint "APIM-4" "APIM" "aggregates sets CORS Access-Control-Allow-Origin: *" \
  "[ \"\$($CURL -Io /dev/null -w '%{header_json}' '$MCPAAS_HOST/slash/v1/aggregates/radiofaf' 2>/dev/null | python3 -c 'import sys, json; h=json.load(sys.stdin); print(h.get(\"access-control-allow-origin\", [\"\"])[0])' 2>/dev/null)\" = '*' ] || $CURL -I '$MCPAAS_HOST/slash/v1/aggregates/radiofaf' | grep -i 'access-control-allow-origin: \\*' >/dev/null"

checkpoint "APIM-5" "APIM" "POST /slash/route-decision routes grok-4.20 → fast" \
  "$CURL -X POST '$MCPAAS_HOST/slash/route-decision' -H 'Content-Type: application/json' -d '{\"provider\":\"xai\",\"model\":\"grok-4.20-0309-reasoning\",\"est_tokens\":1500}' | python3 -c 'import sys, json; d=json.load(sys.stdin); assert d.get(\"model\") == \"grok-4-1-fast\" and d.get(\"routed\") is True'"

checkpoint "APIM-6" "APIM" "POST /slash/route-decision passes through fast model" \
  "$CURL -X POST '$MCPAAS_HOST/slash/route-decision' -H 'Content-Type: application/json' -d '{\"provider\":\"xai\",\"model\":\"grok-4-1-fast-non-reasoning\",\"est_tokens\":1500}' | python3 -c 'import sys, json; d=json.load(sys.stdin); assert d.get(\"routed\") is False'"

# ============================================================
# LAYER KV — KV state (requires wrangler auth)
# ============================================================
echo
echo "${CYAN}LAYER KV — KV state (mcpaas SOULS namespace)${NC}"

if [ "$SKIP_KV" = "1" ]; then
  skip_checkpoint "KV-1" "KV" "slash key record exists in KV" "--no-kv flag"
  skip_checkpoint "KV-2" "KV" "live feed has events with app:radiofaf" "--no-kv flag"
elif ! command -v npx >/dev/null 2>&1; then
  skip_checkpoint "KV-1" "KV" "slash key record exists in KV" "no npx in PATH"
  skip_checkpoint "KV-2" "KV" "live feed has events with app:radiofaf" "no npx in PATH"
else
  checkpoint "KV-1" "KV" "mcp_slash_key:$SLASH_KEY_ID exists" \
    "(cd '$WRANGLER_DIR' && npx wrangler kv key get 'mcp_slash_key:$SLASH_KEY_ID' --namespace-id=$KV_NAMESPACE --remote 2>/dev/null | grep 'radiofaf-internal' >/dev/null)"

  checkpoint "KV-2" "KV" "mcp_slash_live:$SLASH_KEY_ID has radiofaf events" \
    "(cd '$WRANGLER_DIR' && npx wrangler kv key get 'mcp_slash_live:$SLASH_KEY_ID' --namespace-id=$KV_NAMESPACE --remote 2>/dev/null | grep '\"app\":\"radiofaf\"' >/dev/null)"
fi

# ============================================================
# LAYER E2E — End-to-end (trigger + verify)
# ============================================================
echo
echo "${CYAN}LAYER E2E — End-to-end flow${NC}"

checkpoint "E2E-1" "E2E" "trigger /api/voice-session → decisions count climbs" "
  before=\$(echo '$AGG_RESPONSE' | python3 -c 'import sys, json; print(json.load(sys.stdin).get(\"decisions\", 0))' 2>/dev/null)
  $CURL '$RADIOFAF_HOST/api/voice-session' >/dev/null 2>&1
  $CURL '$RADIOFAF_HOST/api/voice-session' >/dev/null 2>&1
  sleep 5
  after=\$($CURL '$MCPAAS_HOST/slash/v1/aggregates/radiofaf?nocache=$RANDOM' | python3 -c 'import sys, json; print(json.load(sys.stdin).get(\"decisions\", 0))' 2>/dev/null)
  [ \"\$after\" -gt \"\$before\" ]
"

# ============================================================
# Summary
# ============================================================
echo
echo "================================================================"
TOTAL=$((PASS + FAIL + SKIP))
if [ "$FAIL" -eq 0 ]; then
  printf "  ${GREEN}✓ ALL SYSTEMS PASS${NC}  ${PASS}/${TOTAL} pass"
  [ "$SKIP" -gt 0 ] && printf "  ${YELLOW}(${SKIP} skipped)${NC}"
  echo
  echo "================================================================"
  exit 0
else
  printf "  ${RED}✗ ${FAIL} FAILURE(S)${NC}  ${PASS}/${TOTAL} pass"
  [ "$SKIP" -gt 0 ] && printf "  ${YELLOW}(${SKIP} skipped)${NC}"
  echo
  echo "----------------------------------------------------------------"
  echo "  Failures (debug at the layer named in brackets):"
  for f in "${FAILURES[@]}"; do
    echo "    ✗ $f"
  done
  echo "================================================================"
  echo "  Layer guide:"
  echo "    FE   = Frontend not deploying / file content wrong → check radiofaf repo + CF Pages deploy logs"
  echo "    APIR = /api/voice-session broken → check radiofaf/functions/api/voice-session.js + CF Pages secrets (SLASH_KEY, XAI_API_KEY)"
  echo "    APIM = mcpaas.live worker broken → check mcpaas-cf src/routes/slash-proxy.ts + wrangler deploy logs"
  echo "    KV   = KV state missing → check mcpaas KV namespace via wrangler"
  echo "    E2E  = the chain works individually but doesn't connect → suspect cache or KV propagation"
  echo "================================================================"
  exit 1
fi
