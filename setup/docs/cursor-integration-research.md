# Cursor + Codex Integration Research

**Author:** Forge (Backend) · **Date:** 2026-04-17 · **Status:** Research complete, patches proposed to Smith

This document captures what `@agentsid/setup` needs in order to reach Claude-Code-parity on two additional host platforms: **Cursor** (the IDE) and **Codex** (OpenAI's CLI + IDE extension). Both ship MCP support already; the question is how much *interception* (not just MCP-server registration) each one exposes, and what our wizard has to emit.

## TL;DR

| Platform | MCP registration | Hook parity with Claude Code | Wizard status | Priority |
|---|---|---|---|---|
| **Cursor** | ✅ `.cursor/mcp.json` (our stub covers) | ✅ **Full parity** via Cursor 1.7+ hooks | Missing hooks.json emission — patch below | HIGH |
| **Codex** | ✅ `~/.codex/config.toml` (our stub covers) | ⚠️ **Bash-only, experimental** (PreToolUse/PostToolUse/UserPromptSubmit; feature-flagged) | Stub sufficient for MCP; optional hooks.json for Bash policy | MED |

Both hosts can be reached to "good enough" today. Cursor can reach MCP-proxy + real hook-based interception with a medium-sized patch. Codex remains MCP-proxy + limited Bash interception until OpenAI widens the hook surface; the primary enforcement lever on Codex is still Codex's own `sandbox_mode` / `approval_policy`.

---

## 1. Cursor

### 1.1 Config paths (confirmed unchanged — our stub is correct)

| Scope | mcp.json | hooks.json |
|---|---|---|
| Project | `<repo>/.cursor/mcp.json` | `<repo>/.cursor/hooks.json` |
| User (global) | `~/.cursor/mcp.json` | `~/.cursor/hooks.json` |
| Enterprise (MDM) | `/Library/Application Support/Cursor/hooks.json` (macOS), `/etc/cursor/hooks.json` (Linux/WSL), `C:\ProgramData\Cursor\hooks.json` (Windows) | same |
| Team | cloud-distributed via Cursor web dashboard (Enterprise plan) | same |

**Priority:** Enterprise → Team → Project → User. Project overrides User when a server name collides in `mcp.json`.

**Working-directory gotcha:** a hook script registered at project scope runs with CWD = project root; one registered at user scope runs with CWD = `~/.cursor/`. We already use absolute paths (`~/.agentsid/hooks/pre-tool.sh`) for Claude Code, so this is a non-issue if we keep the same convention.

### 1.2 MCP server schema

STDIO entry:

```json
{
  "mcpServers": {
    "agentsid": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@agentsid/guard"],
      "env": { "AGENTSID_PROJECT_KEY": "...", "AGENTSID_AGENT_TOKEN": "..." },
      "envFile": "(optional, STDIO only)"
    }
  }
}
```

Remote (SSE / Streamable HTTP):

```json
{
  "mcpServers": {
    "agentsid": {
      "url": "https://guard.agentsid.dev/mcp",
      "headers": { "Authorization": "Bearer ..." },
      "auth": { "CLIENT_ID": "...", "CLIENT_SECRET": "...", "scopes": [] }
    }
  }
}
```

**Delta vs our current `setup/src/integrations/cursor.ts`:** we do not emit `type: "stdio"` explicitly. Implicit currently works; explicit is safer as Cursor adds new transports.

**New-in-2026 opt-in:** `~/.cursor/permissions.json` lets us pre-mark our guard tools as auto-run, so users skip the per-restart UI toggle. Worth offering as a wizard flag.

### 1.3 Hooks — the big unlock (Cursor ≥1.7, shipped Oct 2025)

Events we care about:

| Hook | Block? | AgentsID use |
|---|---|---|
| `beforeShellExecution` | yes | shell policy (Bash-like gate) |
| `beforeMCPExecution` | yes | govern calls into **other** MCP servers — full cross-tool audit |
| `beforeReadFile` | yes | .env / secret protection |
| `preToolUse` | yes | generic catch-all (`Shell`, `Read`, `Write`, `Task`, `MCP:<name>`) |
| `afterFileEdit` | no | audit writes |
| `afterShellExecution` | no | audit shell output |
| `afterMCPExecution` | no | audit + can inject `additional_context` |
| `sessionStart` | n/a | inject env vars project-wide via `{ "env": {...} }` |
| `beforeSubmitPrompt` | yes | prompt firewall (future) |
| `subagentStart` | yes | govern Task-tool children |

Registration schema:

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "command": "/Users/me/.agentsid/hooks/pre-tool.sh",
        "type": "command",
        "timeout": 3,
        "failClosed": true,
        "matcher": ".*"
      }
    ]
  }
}
```

**Response schema (block/permission hooks):**

```json
{
  "permission": "allow" | "deny" | "ask",
  "user_message": "shown in UI when denied",
  "agent_message": "fed back to the agent when denied"
}
```

`preToolUse` additionally supports `updated_input` (rewrite tool args — great for redaction).

**Exit codes:**

- `0` → parse stdout JSON.
- `2` → hard deny (no JSON needed).
- any other → fail **open** unless `failClosed: true`. We MUST set `failClosed: true` on every security hook.

**Env vars passed to hook processes:** `CURSOR_PROJECT_DIR`, `CURSOR_VERSION`, `CURSOR_USER_EMAIL`, `CURSOR_TRANSCRIPT_PATH`, `CURSOR_CODE_REMOTE`, and **`CLAUDE_PROJECT_DIR` as a compat alias** — our existing `src/hook/pre-tool.sh` and `post-tool.sh` likely run unchanged.

### 1.4 Reload behavior

Cursor reads `mcp.json` and `hooks.json` **only at startup**. Saving the file is not enough; a partial workaround is the settings-UI refresh button. The setup wizard must print:

> **Restart Cursor** (Cmd+Q then relaunch) to activate AgentsID guard. Verify Settings → MCP → `agentsid` shows green.

A third-party extension (`cursor-mcp-refresh`) exists but we should not depend on it.

### 1.5 Rules surface (`.cursor/rules/*.mdc`)

Not an enforcement surface — useful as a soft supplement to discourage circumvention. Optional: ship `.cursor/rules/agentsid-guard.mdc` with frontmatter `alwaysApply: true`:

```markdown
---
alwaysApply: true
---
All shell and file edits route through the agentsid MCP guard. Do not bypass with raw Bash.
```

Skip the legacy `.cursorrules` file — being deprecated.

### 1.6 Competitive context

Cursor's 2025-12-22 hooks-partners announcement names: MintMCP, Oasis Security, Runlayer, Corridor, Semgrep, Endor Labs, Snyk, 1Password. AgentsID is **not** on the list. Shipping this integration qualifies us for outreach to Cursor DevRel for inclusion — free distribution to their enterprise channel.

### 1.7 Recommended patch to `setup/src/integrations/cursor.ts` (implementation ~2 days)

1. Add `type: "stdio"` to the mcpServer entry.
2. Extend the `PlatformIntegration` interface to emit **multiple files** (e.g. `additionalFiles?: (config) => Array<{path, format, content}>`), so cursor can emit both `mcp.json` and `hooks.json`.
3. Register `beforeShellExecution`, `beforeMCPExecution`, `beforeReadFile`, `preToolUse`, `afterFileEdit`, `sessionStart` — all pointing at `~/.agentsid/hooks/pre-tool.sh` / `post-tool.sh`, with `failClosed: true` and `timeout: 3`.
4. Use a `sessionStart` hook that outputs `{ "env": { "AGENTSID_PROJECT_KEY": "...", "AGENTSID_AGENT_TOKEN": "..." } }` so hook scripts have creds without writing them directly into hooks.json.
5. Optional: write `~/.cursor/permissions.json` to auto-enable the `agentsid:*` tools.
6. Update the `instructions` string to say "Restart Cursor (Cmd+Q) — Cursor reads configs only at startup."
7. Optional: offer to drop `.cursor/rules/agentsid-guard.mdc` as a soft supplement.

**Implementation complexity estimate:** Medium. The interface change (multi-file emission) is the most invasive part — affects every platform integration. Straightforward otherwise; most logic is data-transform, and the hook scripts are already written for Claude Code.

---

## 2. Codex (OpenAI)

### 2.1 Config paths (unchanged — our stub is correct)

| Scope | config.toml |
|---|---|
| User (global) | `~/.codex/config.toml` |
| Project | `<repo>/.codex/config.toml` (trusted projects only) |
| Optional via CLI | `codex mcp add agentsid -- npx -y @agentsid/guard` |

**Shared across surfaces:** the Codex CLI and the Codex IDE extension read the same `config.toml` — one integration point covers both.

### 2.2 MCP server schema — TOML, richer than we currently use

STDIO:

```toml
[mcp_servers.agentsid]
command = "npx"
args = ["-y", "@agentsid/guard"]
env = { AGENTSID_PROJECT_KEY = "...", AGENTSID_AGENT_TOKEN = "..." }
startup_timeout_sec = 10     # default 10
tool_timeout_sec = 60        # default 60
required = true              # fail fast if our guard can't initialise
enabled = true
# optional
cwd = "/some/dir"
env_vars = ["NODE_ENV"]      # passthrough from parent env
enabled_tools = ["..."]
disabled_tools = ["..."]
```

Streamable HTTP:

```toml
[mcp_servers.agentsid]
url = "https://guard.agentsid.dev/mcp"
bearer_token_env_var = "AGENTSID_TOKEN"
http_headers = { "X-Project" = "agentsid" }
env_http_headers = { "X-Token" = "AGENTSID_TOKEN" }
```

**Delta vs our current `setup/src/integrations/codex.ts`:** we do not set `required = true` or `startup_timeout_sec`/`tool_timeout_sec`. For a guard, `required = true` is a must — if the guard fails to start, downstream tool calls should fail loud, not fail open.

### 2.3 Hooks — experimental, Bash-only, behind a feature flag

Enable in `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

Files Codex will read (both, not override):

- `~/.codex/hooks.json`
- `<repo>/.codex/hooks.json`

**Events supported:**

| Event | Block? | Matcher | Notes |
|---|---|---|---|
| `SessionStart` | no | `source` = `startup` \| `resume` | observational; can add context |
| `PreToolUse` | **yes** | `tool_name` (currently **Bash only**) | can deny Bash commands |
| `PostToolUse` | yes (post-facto) | `tool_name` (Bash only) | cannot undo side effects |
| `UserPromptSubmit` | yes | none | prompt firewall |
| `Stop` | no (cont. only) | none | force continuation |

**Registration schema (looks like Claude Code, but different output format):**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/me/.agentsid/hooks/pre-tool.sh",
            "timeoutSec": 3,
            "statusMessage": "AgentsID guard checking…"
          }
        ]
      }
    ]
  }
}
```

**Block response** (new format):

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "explanation"
  }
}
```

Legacy format accepted: `{"decision": "block", "reason": "text"}`. Exit code `2` also blocks (reason from stderr).

### 2.4 Critical Codex hook limitations

- **Bash-only interception.** PreToolUse/PostToolUse fire for the `Bash` tool; not `Write`, `Edit`, `Read`, `WebSearch`, or MCP calls. The model can bypass by writing a script to disk and then running it.
- **Several output fields documented but unimplemented** ("parsed but fail open"): `permissionDecision: "allow"/"ask"`, `updatedInput`, `additionalContext`, `continue`, `stopReason`, `suppressOutput`, `updatedMCPToolOutput`.
- **Windows support temporarily disabled.**
- **Concurrent execution** — one matching hook cannot prevent another from starting.
- **Experimental — subject to breaking changes.** Don't ship this on by default; gate behind a wizard flag.

### 2.5 Native guardrails we should respect

Codex's native policies are our real partners on this platform until hooks widen:

- `approval_policy` ∈ {`untrusted`, `on-request`, `never`, `granular`}
- `sandbox_mode` ∈ {`read-only`, `workspace-write`, `danger-full-access`}
- `sandbox_workspace_write.network_access` (bool), `.writable_roots` (array), `.exclude_slash_tmp`, `.exclude_tmpdir_env_var`

The setup wizard for Codex should recommend `sandbox_mode = "workspace-write"` with `network_access = false` unless the user explicitly opts in — this is the primary defence layer on Codex, not our hooks. AgentsID's role on Codex is MCP-mediated (the model calls `agentsid.check_permission` etc.) plus optional Bash hook for shell policy.

### 2.6 Reload behavior

Not documented. Safe assumption: restart Codex CLI session (exit / relaunch) for config changes to apply; `codex mcp` CLI may hot-reload MCP server entries (not verified). Wizard should tell user to exit and relaunch.

### 2.7 Recommended patch to `setup/src/integrations/codex.ts` (implementation ~1 day)

1. Add `required = true`, `startup_timeout_sec`, `tool_timeout_sec` to the generated TOML.
2. Optional: offer to set `[features] codex_hooks = true` + emit `~/.codex/hooks.json` with `PreToolUse` Bash hook. Gate behind a wizard checkbox — experimental.
3. If the user's `config.toml` has a weak `sandbox_mode = "danger-full-access"` or missing `sandbox_mode`, wizard should print a warning and offer to set `workspace-write` + `network_access = false`.
4. Update instructions: "Restart the Codex CLI session (`exit` and relaunch) to activate AgentsID guard."
5. Note in CHANGELOG: Codex hooks are experimental — disabled by default in v0.2.

**Implementation complexity estimate:** Low for the TOML field additions. Medium if we also emit hooks.json (requires the same multi-file interface change as Cursor, so do it once across platforms).

---

## 3. Shared work (applies to both patches)

1. **Extend `PlatformIntegration` interface** in `setup/src/integrations/types.ts` to allow multi-file emission. Proposed:

   ```ts
   interface GeneratedFile {
     readonly path: string;                  // absolute or relative to scope
     readonly format: "json" | "toml";
     readonly content: Record<string, unknown>;
   }

   interface PlatformIntegration {
     readonly name: string;
     readonly label: string;
     readonly instructions: string;
     readonly configFormat: "json" | "toml";
     readonly configPath: (scope: Scope) => string;
     readonly generateConfig: (config: IntegrationConfig) => Record<string, unknown>;
     readonly additionalFiles?: (config: IntegrationConfig, scope: Scope) => readonly GeneratedFile[];
   }
   ```

   All existing integrations are unchanged; `cursor` and `codex` gain `additionalFiles`.

2. **Verify hook-script env-var compatibility.** Cursor aliases `CLAUDE_PROJECT_DIR`, so the Claude Code scripts Just Work there. Codex's env-var set isn't documented — Smith should add a `env` guard at the top of `pre-tool.sh` that prefers `AGENTSID_PROJECT_KEY` from stdin JSON before falling back to env.

3. **Version-gate for Cursor.** If the user is on Cursor <1.7, hooks.json is silently ignored. Safe (no breakage) but no interception. Wizard should detect via `cursor --version` and print a warning if found.

---

## 4. Open questions for Cap

- **Multi-file emission interface** — acceptable to extend the `PlatformIntegration` shape, or would you prefer a separate `PlatformInstaller` abstraction wrapping the config generator?
- **Codex hooks default** — off by default (opt-in via wizard flag), or opportunistic (enable if we detect `codex_hooks = true` already set)?
- **Cursor Marketplace** — should we pursue listing `@agentsid/guard` on cursor.com/marketplace as part of this work, or keep that separate (Voice/DevRel)?

---

## 5. Sources

### Cursor
- https://cursor.com/docs/context/mcp
- https://cursor.com/docs/hooks
- https://cursor.com/blog/hooks-partners
- https://www.infoq.com/news/2025/10/cursor-hooks/ (1.7 launch)
- https://forum.cursor.com/t/how-to-refresh-mcp-cursor-1-0/101307 (reload limitation)
- https://www.truefoundry.com/blog/mcp-servers-in-cursor-setup-configuration-and-security-guide (2026 guide)

### Codex
- https://developers.openai.com/codex/mcp
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/config-advanced
- https://developers.openai.com/codex/config-reference
- https://github.com/openai/codex (installation + CLI)
- https://github.com/openai/codex/blob/main/docs/config.md (canonical reference)

---

## Appendix A — Cursor Hooks Partner Program: outreach leverage

**Per Cap (2026-04-17):** the Cursor hooks-partners list is outreach leverage worth a formal appendix. This section is for Voice/DevRel to use when drafting the pitch.

### The existing roster (Cursor blog, 2025-12-22)

| Partner | Positioning | AgentsID overlap |
|---|---|---|
| **MintMCP** | "Scan responses for sensitive data before it reaches the AI model" — DLP layer, MCP-focused | Partial overlap on MCP governance; we cover identity + permissions + audit, they cover DLP |
| **Oasis Security** | "Enforce least-privilege policies on AI agent actions" + "full audit trails across enterprise systems" | **Direct competitor** — closest positioning to AgentsID |
| **Runlayer** | MCP governance | Partial overlap |
| **Corridor** | Code security | Orthogonal |
| **Semgrep** | Code security (SAST) | Orthogonal |
| **Endor Labs** | Dependency security — "scan for malicious deps, prevent supply chain attacks like typosquatting" | Orthogonal, but adjacent to our scanner |
| **Snyk** | Agent safety | Partial overlap (they focus on code; we focus on runtime) |
| **1Password** | Secrets management | Orthogonal |

**AgentsID is not on this list.** That is the opportunity.

### Why AgentsID belongs on the list

Cursor's hooks system is explicitly designed for the use cases we ship natively:

- `beforeShellExecution` → our permission-engine's existing Bash gate
- `beforeMCPExecution` → our cross-MCP audit trail (no listed partner covers this specifically — Oasis is closest)
- `beforeReadFile` → our .env / secrets policy
- `sessionStart` → our agent registration / token issuance

Oasis is the one to watch — they are also "policy + audit" for agentic IDE use. Differentiation angle for outreach: **(1)** AgentsID is identity-first (agent tokens, on_behalf_of attribution, delegation), Oasis is policy-first; **(2)** AgentsID publishes the public MCP security registry (15,983 entries, grade scale A–F) — no listed partner ships that; **(3)** AgentsID ships the CLI + scanner + setup wizard as an integrated surface — not a platform SKU with annual contracts.

### Proposed pitch (for Voice)

Subject line options (pick one to test):
- "AgentsID ships Cursor hooks support — adding to your partner roster?"
- "Hooks integration live: AgentsID for Cursor"
- "Re: hooks-partners — we'd like to be on the list"

Core ask: inclusion in a future revision of `cursor.com/blog/hooks-partners` and (stretch) a Cursor Marketplace listing at `cursor.com/marketplace` for `@agentsid/guard`.

Evidence to include:
- Working `.cursor/hooks.json` generator in `@agentsid/setup` (v0.2+ post-Smith patch)
- Link to public registry (`agentsid.dev/registry`) and scanner grades
- Screenshots of live permission denials happening in Cursor with our hooks in-line
- Brief differentiation vs Oasis (identity-first vs policy-first)

Contact path: Cursor's DevRel / partnerships inbox (lookup needed — Voice to research). LinkedIn outreach to the hooks-partners blog byline author is a decent warm path.

### Timing

Do **not** pitch before Smith ships the `cursor.ts` / `codex.ts` patches and v0.2 of `@agentsid/setup` lands on npm. The pitch needs a working integration to point at — otherwise Cursor has nothing to link to, and we look like aspirational vaporware next to partners that already shipped.
