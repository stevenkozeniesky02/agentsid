# Changelog

All notable changes to `@agentsid/setup` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.1] — 2026-04-15

### Fixed
- Hook shell scripts (`pre-tool.sh`, `post-tool.sh`) were not bundled into `dist/` during build, causing `installHook()` to fail with "Hook source file not found" when installed from the published tarball. Build now copies `src/hook/*.sh` into `dist/hook/`.

## [0.1.0] — 2026-04-15

### Added
- Initial release. Interactive Ink-based CLI wizard.
- 5-step flow: platform → auth → persona → policies → hook install.
- Three built-in presets: Developer, Security Team, Lockdown.
- Claude Code integration (stable). Cursor/Codex/Gemini/local model (in testing).
- Installs `pre-tool.sh` with:
  - `/api/v1/validate` gating for every tool call
  - `/api/v1/agents/derive` on subagent (Agent/Task) spawn
  - Just-in-time child token derivation with local cache for real-time per-subagent enforcement
  - Shell-injection-safe stdin handling
- npm provenance attestations on every published version.

[Unreleased]: https://github.com/AgentsID-dev/agentsid/compare/setup-v0.1.0...HEAD
[0.1.0]: https://github.com/AgentsID-dev/agentsid/releases/tag/setup-v0.1.0
