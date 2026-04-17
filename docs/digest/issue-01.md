# MCP Security Digest — Issue #1

_The 5 worst MCP servers we've scanned, and a pattern that predicts failure._

Out of **15,983** MCP servers scanned, **1,332 (8.3%)** grade F. These five scored zero with the most critical findings.

## The worst offenders

**1. databricks-utils-mcp** — PyPI, v1.26.0
41 tools · 42 critical findings. Reads external content and executes code — a prompt-injection-to-RCE path. The `catalog_list_catalogs` description instructs the LLM to bypass security controls.

**2. @mseep/railway-mcp** — npm, v1.0.0
36 tools · 34 critical findings. Fails injection, permissions, and auth categories simultaneously.

**3. @procurementexpress.com/mcp** — npm, v1.0.0
133 tools · 21 critical findings. Can read email, Slack, and GitHub and relay data externally. Separately flagged for credential-exfiltration data flow.

**4. device-scanner** — PyPI, v1.26.0
24 tools · 18 critical findings. Credential-exfiltration path to external network. The `device_ssh` tool description instructs the LLM to bypass security controls.

**5. exclugo** — PyPI, v1.26.0
78 tools · 17 critical findings. Reads external sources and sends data externally; also reads local files and sends them externally.

Full per-finding reports: **agentsid.dev/registry**.

## The pattern: more tools, worse security

We binned all 15,983 servers by tool count:

| Tools per server | Count | F-rate | Avg score |
|---|---|---|---|
| 1–5 | 14,259 | 1.8% | 81 |
| 6–10 | 720 | 45.0% | 39 |
| 11–20 | 507 | 62.7% | 30 |
| 21–50 | 382 | 83.2% | 18 |
| 51+ | 115 | 94.8% | 10 |

Pearson r = **–0.61** between tool count and security score.

Above ten tools, nearly half fail. Above fifty, nearly none pass. The correlation is not subtle.

**Why it happens.** More tools means more description surface for prompt injection, more destructive or execution tools to chain, and more credential and data flows crossing trust boundaries. A 100-tool "do everything" server is, almost by definition, a 100-finding audit.

**For builders:** split monolith servers into small, scoped ones. A 5-tool server has a ~98% chance of passing. A 100-tool server has a ~95% chance of failing.

**For operators:** the single strongest predictor we've found for whether an MCP server will survive review is how many tools it exposes. Grade before install.

---

Scan any server yourself: `npx @agentsid/scanner <package>`

Reply with tools you want us to look at next issue.
