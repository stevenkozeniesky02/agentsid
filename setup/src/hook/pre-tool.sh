#!/usr/bin/env bash
# AgentsID PreToolUse hook for Claude Code.
# Runs BEFORE every tool call. Calls /api/v1/validate to check permission.
# If denied, blocks the tool with a reason Claude can see.
# If the API is unreachable or slow, allows the tool (fail-open on network errors).
#
# Subagent handling:
#   1. When tool_name == Agent/Task (the spawner itself), we derive eagerly so
#      the user can see the new child agent appear in the dashboard. If derive
#      denies, the spawn is blocked.
#   2. When a subagent makes a tool call, Claude Code sets top-level agent_id
#      + agent_type in the hook stdin. We look up a cached child token keyed on
#      (session_id, cc_agent_id); on cache miss we derive just-in-time. Either
#      way we /validate with the CHILD's token, enforcing the narrowed profile
#      in real time.

set -euo pipefail

# ── Read stdin ────────────────────────────────────────────────────────────────
INPUT=$(cat)

# ── Diagnostic capture (opt-in) ──────────────────────────────────────────────
# Set AGENTSID_DEBUG=1 to dump full hook stdin for investigating what Claude
# Code exposes about subagent context. Logs to ~/.agentsid/hook-stdin.log.
if [[ "${AGENTSID_DEBUG:-}" == "1" ]]; then
  DEBUG_LOG="${HOME}/.agentsid/hook-stdin.log"
  mkdir -p "$(dirname "$DEBUG_LOG")"
  {
    printf '=== %s ===\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '%s\n' "$INPUT"
    printf '\n'
  } >> "$DEBUG_LOG"
fi

# ── Extract top-level fields (all user-controlled, treat as untrusted data) ──
FIELDS=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tn = data.get('tool_name', '') or ''
    sid = data.get('session_id', '') or ''
    # Subagent context appears at top level ONLY when the tool call is being
    # made from inside a spawned subagent (verified empirically 2026-04-13).
    ccaid = data.get('agent_id', '') or ''
    atype = data.get('agent_type', '') or ''
    ti = json.dumps(data.get('tool_input', {}))
    print(tn)
    print(sid)
    print(ccaid)
    print(atype)
    print(ti)
except Exception:
    print('\n\n\n\n{}')
" 2>/dev/null || printf '\n\n\n\n{}')

TOOL_NAME=$(printf '%s' "$FIELDS" | sed -n '1p')
SESSION_ID=$(printf '%s' "$FIELDS" | sed -n '2p')
CC_SUBAGENT_ID=$(printf '%s' "$FIELDS" | sed -n '3p')
CC_SUBAGENT_TYPE=$(printf '%s' "$FIELDS" | sed -n '4p')
TOOL_INPUT=$(printf '%s' "$FIELDS" | sed -n '5p')

if [[ -z "$TOOL_NAME" ]]; then
  exit 0
fi

# ── Resolve config ───────────────────────────────────────────────────────────
API_BASE="${AGENTSID_API_URL:-https://api.agentsid.dev}"
PROJECT_KEY="${AGENTSID_PROJECT_KEY:-}"
AGENT_TOKEN="${AGENTSID_AGENT_TOKEN:-}"
AGENT_ID="${AGENTSID_AGENT_ID:-}"
CACHE_FILE="${HOME}/.agentsid/cc_subagent_cache.json"

# If no token configured, allow everything (not yet set up)
if [[ -z "$AGENT_TOKEN" ]] || [[ -z "$PROJECT_KEY" ]]; then
  exit 0
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RESET='\033[0m'

# ── Helpers ──────────────────────────────────────────────────────────────────

# cache_lookup SESSION_ID CC_SUBAGENT_ID  -> prints child_token on hit, empty on miss
cache_lookup() {
  local sid="$1" ccaid="$2"
  [[ -f "$CACHE_FILE" ]] || return 0
  SID="$sid" CCAID="$ccaid" CF="$CACHE_FILE" python3 -c "
import json, os, sys, time
try:
    with open(os.environ['CF']) as f:
        cache = json.load(f)
    key = os.environ['SID'] + ':' + os.environ['CCAID']
    entry = cache.get(key)
    if not entry:
        sys.exit(0)
    exp = entry.get('expires_at_epoch', 0)
    if exp and exp < time.time():
        sys.exit(0)
    print(entry.get('token', ''))
except Exception:
    sys.exit(0)
" 2>/dev/null || true
}

# cache_store SESSION_ID CC_SUBAGENT_ID CC_TYPE AID_AGENT_ID AID_TOKEN EXPIRES_AT_ISO
cache_store() {
  local sid="$1" ccaid="$2" cctype="$3" aidid="$4" token="$5" exp="$6"
  mkdir -p "$(dirname "$CACHE_FILE")"
  SID="$sid" CCAID="$ccaid" CCTYPE="$cctype" AIDID="$aidid" TOKEN="$token" EXP="$exp" CF="$CACHE_FILE" python3 -c "
import json, os, time
from datetime import datetime, timezone
cf = os.environ['CF']
try:
    with open(cf) as f:
        cache = json.load(f)
except Exception:
    cache = {}

exp_iso = os.environ['EXP']
exp_epoch = 0
try:
    # Strip trailing Z/timezone and parse flexibly
    s = exp_iso.replace('Z', '+00:00').replace(' ', 'T', 1)
    # Accept '2026-04-14 21:56:18.796082+00:00' style
    dt = datetime.fromisoformat(os.environ['EXP'].replace(' ', 'T', 1))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    exp_epoch = dt.timestamp()
except Exception:
    exp_epoch = time.time() + 3600

# Prune expired entries so cache doesn't grow unbounded
now = time.time()
cache = {k: v for k, v in cache.items() if v.get('expires_at_epoch', 0) > now}

cache[os.environ['SID'] + ':' + os.environ['CCAID']] = {
    'cc_agent_type': os.environ['CCTYPE'],
    'aid_agent_id': os.environ['AIDID'],
    'token': os.environ['TOKEN'],
    'expires_at': exp_iso,
    'expires_at_epoch': exp_epoch,
    'created_at_epoch': now,
}
# Atomic write
tmp = cf + '.tmp'
with open(tmp, 'w') as f:
    json.dump(cache, f)
os.replace(tmp, cf)
" 2>/dev/null || true
  chmod 600 "$CACHE_FILE" 2>/dev/null || true
}

# derive_subagent CC_TYPE TASK_HASH  -> prints "token|aid_id|expires_iso" on success, empty on failure/deny
derive_subagent() {
  local cctype="$1" task_hash="$2"
  local body
  body=$(
    SUBAGENT_TYPE="$cctype" \
    TASK_HASH="$task_hash" \
    python3 -c "
import json, os
print(json.dumps({
    'parent_agent_id': os.environ.get('AGENTSID_AGENT_ID', ''),
    'parent_token': os.environ.get('AGENTSID_AGENT_TOKEN', ''),
    'agent_type': os.environ.get('SUBAGENT_TYPE', '').strip() or 'general-purpose',
    'task_hash': (os.environ.get('TASK_HASH', '').strip() or None),
}))
" 2>/dev/null || printf '{}')

  local resp
  resp=$(curl -s --max-time 3 \
    -X POST "${API_BASE}/api/v1/agents/derive" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${PROJECT_KEY}" \
    -d "$body" \
    2>/dev/null || true)

  [[ -z "$resp" ]] && return 0

  printf '%s' "$resp" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'agent' in data and 'token' in data:
        print('|'.join([
            data['token'],
            data['agent']['id'],
            data.get('expires_at', ''),
        ]))
    elif 'detail' in data:
        # Deny — emit deny marker so caller can distinguish from network failure.
        print('DENY|' + str(data['detail']))
except Exception:
    pass
" 2>/dev/null || true
}

# ── Branch 1: subagent tool call (has agent_id) ──────────────────────────────
# When Claude Code is executing a tool *inside* a spawned subagent, the hook
# stdin has agent_id + agent_type at top level. Use the child's scoped token.
if [[ -n "$CC_SUBAGENT_ID" ]]; then
  CHILD_TOKEN=$(cache_lookup "$SESSION_ID" "$CC_SUBAGENT_ID")

  if [[ -z "$CHILD_TOKEN" ]]; then
    # Cache miss — just-in-time derive. First tool call for this subagent.
    DERIVE_RESULT=$(derive_subagent "$CC_SUBAGENT_TYPE" "")

    if [[ -z "$DERIVE_RESULT" ]]; then
      # Network failure — fail open with a warning log (don't break the session
      # just because the derive API hiccuped).
      printf "${YELLOW}⚠ WARN${RESET}  %s (subagent=%s, derive unreachable — parent token)\n" \
        "$TOOL_NAME" "$CC_SUBAGENT_TYPE" >&2
      # Fall through to default /validate branch below with parent token.
    elif [[ "$DERIVE_RESULT" == DENY\|* ]]; then
      # Server refused to issue a child — surface it as a deny.
      REASON="${DERIVE_RESULT#DENY|}"
      printf "${RED}⛔ DENIED${RESET} %s (subagent=%s) — %s\n" \
        "$TOOL_NAME" "$CC_SUBAGENT_TYPE" "$REASON" >&2
      REASON="$REASON" python3 -c "
import json, os
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'deny',
        'permissionDecisionReason': 'AgentsID: ' + os.environ.get('REASON', '')
    }
}))
" 2>/dev/null
      exit 0
    else
      CHILD_TOKEN="${DERIVE_RESULT%%|*}"
      REST="${DERIVE_RESULT#*|}"
      AID_ID="${REST%%|*}"
      EXPIRES_AT="${REST#*|}"
      cache_store "$SESSION_ID" "$CC_SUBAGENT_ID" "$CC_SUBAGENT_TYPE" "$AID_ID" "$CHILD_TOKEN" "$EXPIRES_AT"
      printf "${CYAN}ⓘ JIT${RESET}   derived %s for subagent=%s\n" \
        "$AID_ID" "$CC_SUBAGENT_TYPE" >&2
    fi
  fi

  # Use the child's token for this /validate call (falls through to default
  # branch below). If we got here without a child token (network failure), we
  # degrade to parent token.
  if [[ -n "$CHILD_TOKEN" ]]; then
    AGENT_TOKEN="$CHILD_TOKEN"
  fi
fi

# ── Branch 2: Agent/Task spawner call (parent is spawning a subagent) ───────
# We derive eagerly so the dashboard tree reflects the new child immediately.
# Note: CC does NOT expose the child's cc_agent_id here — we only learn that
# on the child's first tool call (Branch 1), so we can't pre-cache. Eager
# derive produces a "ghost" child that won't be reused; Branch 1 derives again.
# Acceptable: both agents show in the dashboard, wasted derive is ~200ms.
if [[ -z "$CC_SUBAGENT_ID" ]] && { [[ "$TOOL_NAME" == "Agent" ]] || [[ "$TOOL_NAME" == "Task" ]]; }; then
  # Pull subagent_type from tool_input (where CC puts it for the spawn).
  SPAWN_TYPE=$(printf '%s' "$TOOL_INPUT" | python3 -c "
import sys, json
try:
    print(json.load(sys.stdin).get('subagent_type', 'general-purpose'))
except Exception:
    print('general-purpose')
" 2>/dev/null || printf 'general-purpose')

  TASK_HASH=$(printf '%s' "$TOOL_INPUT" | python3 -c "
import sys, json, hashlib
try:
    data = json.load(sys.stdin)
    p = (data.get('prompt', '') or data.get('description', ''))
    print(hashlib.sha256(p.encode('utf-8')).hexdigest()[:16])
except Exception:
    print('')
" 2>/dev/null || true)

  if [[ -z "$AGENT_ID" ]]; then
    printf "${CYAN}ⓘ SPAWN${RESET} %s/%s (no AGENTSID_AGENT_ID — skipping derive)\n" \
      "$TOOL_NAME" "$SPAWN_TYPE" >&2
    exit 0
  fi

  DERIVE_RESULT=$(derive_subagent "$SPAWN_TYPE" "$TASK_HASH")

  if [[ -z "$DERIVE_RESULT" ]]; then
    printf "${CYAN}ⓘ SPAWN${RESET} %s/%s (derive unreachable — allowing)\n" \
      "$TOOL_NAME" "$SPAWN_TYPE" >&2
    exit 0
  elif [[ "$DERIVE_RESULT" == DENY\|* ]]; then
    REASON="${DERIVE_RESULT#DENY|}"
    printf "${RED}⛔ DENIED${RESET} %s/%s — %s\n" "$TOOL_NAME" "$SPAWN_TYPE" "$REASON" >&2
    REASON="$REASON" python3 -c "
import json, os
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'deny',
        'permissionDecisionReason': 'AgentsID: ' + os.environ.get('REASON', '')
    }
}))
" 2>/dev/null
    exit 0
  else
    AID_ID=$(printf '%s' "$DERIVE_RESULT" | awk -F'|' '{print $2}')
    printf "${CYAN}ⓘ SPAWN${RESET} %s/%s — spawned %s\n" "$TOOL_NAME" "$SPAWN_TYPE" "$AID_ID" >&2
    exit 0
  fi
fi

# ── Default branch: any other tool → /validate ───────────────────────────────
RESPONSE=$(curl -s --max-time 2 \
  -X POST "${API_BASE}/api/v1/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PROJECT_KEY}" \
  -d "{\"token\":\"${AGENT_TOKEN}\",\"tool\":\"${TOOL_NAME}\",\"params\":${TOOL_INPUT}}" \
  2>/dev/null || true)

# Fail-open: if API is unreachable, allow the tool
if [[ -z "$RESPONSE" ]]; then
  exit 0
fi

# ── Parse response ───────────────────────────────────────────────────────────
DECISION=$(printf '%s' "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if not data.get('valid', False):
        print('deny|Token validation failed')
        sys.exit(0)
    perm = data.get('permission', {})
    if perm and not perm.get('allowed', True):
        reason = perm.get('reason', 'Denied by policy')
        matched = perm.get('matched_rule', {})
        rule = matched.get('tool_pattern', '') if matched else ''
        msg = reason
        if rule:
            msg += ' (rule: ' + rule + ')'
        print('deny|' + msg)
    else:
        print('allow|')
except Exception:
    print('allow|')
" 2>/dev/null || true)

ACTION="${DECISION%%|*}"
REASON="${DECISION#*|}"

# ── Output decision ──────────────────────────────────────────────────────────
# Prefix visual feedback with subagent context when present so the user can
# see which subagent made the call.
LABEL="$TOOL_NAME"
if [[ -n "$CC_SUBAGENT_TYPE" ]]; then
  LABEL="$TOOL_NAME [$CC_SUBAGENT_TYPE]"
fi

if [[ "$ACTION" == "deny" ]]; then
  printf "${RED}⛔ DENIED${RESET}  %s — %s\n" "$LABEL" "$REASON" >&2

  # Pass REASON via env (not shell interpolation) so a crafted deny message
  # can't escape into bash.
  REASON="$REASON" python3 -c "
import json, os
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'deny',
        'permissionDecisionReason': 'AgentsID: ' + os.environ.get('REASON', '')
    }
}))
" 2>/dev/null
else
  printf "${GREEN}✓ ALLOWED${RESET} %s\n" "$LABEL" >&2
  exit 0
fi
