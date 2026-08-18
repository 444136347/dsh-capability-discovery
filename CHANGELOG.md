# Changelog

[中文](./CHANGELOG.zh-CN.md)

## 0.1.0 - 2026-08-19

- Added multi-source capability discovery, normalization, deduplication, and deterministic ranking.
- Added capability classification for DSH plugins, Skills, MCP servers, profiles, agents, runtimes, and UIs when source metadata supports it.
- Added heuristic GitHub repository risk inspection.
- Added the `capability-discovery` Skill, DSH Bundle integration, CLI, and legacy profile repair command.
- Added strict CLI validation, safe profile-name validation, and package-version centralization.
- Added bounded retries, `Retry-After` support, detailed network/proxy diagnostics, and a five-minute static-source cache.
- Added Bundle verification, restart guidance, `/capability-discovery` invocation, profile isolation, and missing-Skill troubleshooting.
- Made Skill searches use one combined query with at most one conditional retry.
- Added a compact Markdown response contract with a three-column candidate table, concise source health, and localized operation status.
- Localized candidate-table headers and labeled `GitHub ★` as GitHub Stars rather than a rating.
- Updated the `awesome-dsh-plugins` adapter for the upstream `web/data.js` catalog format.
- Prevented unverified installability, runtime-dependency, and profile-compatibility claims based only on search metadata.
- Kept raw commands, local paths, diagnostics, and HTML out of default chat responses.
- Added Chinese architecture, data-source, publishing, contributing, security, and changelog documentation.
- Added Node.js tests and GitHub Actions checks.
