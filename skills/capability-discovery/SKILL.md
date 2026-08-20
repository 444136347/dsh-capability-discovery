---
name: capability-discovery
description: >
  Use when a user asks to find, compare, or evaluate an existing DeepSeek Harness
  plugin, Skill, MCP server, agent extension, profile, or similar ecosystem
  capability.
---

# Capability discovery for DeepSeek Harness

Use this skill when the user is looking for an existing capability rather than asking you to build one from scratch.

## 1. Search before recommending

Extract one to three concrete English keywords from the request. Run one combined search:

```sh
node ../../cli/dsh-capability.mjs search <keywords...> --limit 8 --json
```

If the user explicitly asks for a Skill, add `--type skill`. MCP Server searches use the strict `--type mcp` filter, which returns only candidates with explicit server evidence. If the user asks for a management console, client, bridge, or other MCP-related integration, do not use `--type mcp`; search the broader capability set and explain the returned `type` and `mcpRole`.

Do not repeat the same search command. Retry once only if the first search returns no relevant candidates, using a different or broader query. Do not rerun a successful search merely to reformat or summarize its JSON.

Read `sourceErrors`: a partial multi-source result is usable, but disclose failed sources instead of presenting it as complete coverage. Do not retry only to make every source succeed.

## 2. Prefer evidence over popularity

Use the returned `score` as a starting point, then check the top candidates for purpose fit. `sources` shows how many independent indexes surfaced the same repository. Explain that `GitHub ★` means GitHub Stars, not a rating. Stars are a weak signal, not proof of quality or safety.

Return at most three candidates unless the user asks for a longer list. Explain the practical difference between them.

## 3. Keep the answer compact

Use this exact compact order unless the user requests another format:

1. One sentence stating how many candidates were found and which one is recommended.
2. One Markdown table using the user's language. For Chinese, use `候选 | 证据 | 适用场景` and format evidence like `插件 · 相关度 66.9 · GitHub ★1`. Otherwise use `Candidate | Evidence | Best for` and format evidence like `plugin · relevance 66.9 · GitHub ★1`. Display only the repository name without its owner as a link to the full URL.
3. One short recommendation paragraph explaining the main tradeoff.
4. One source-status line: report `successful/total`. Do not list successful source names; name failed sources and short reasons only when failures exist.
5. Always end with the operation status. Use the user's language for labels and operation status, such as `未安装任何内容。` for a Chinese request.

Keep each `Best for` cell to one short phrase and keep the recommendation to at most two sentences. Show a full per-source table only when the user explicitly asks for source-by-source details. Do not show search commands unless the user explicitly asks or they are needed for troubleshooting; then show only the command actually used in one short code block.

Do not include absolute local paths, CLI existence checks, or raw JSON unless needed for troubleshooting. Do not generate HTML by default; use Markdown in DSH chat and produce an HTML artifact only when the user explicitly requests one.

## 4. Inspect before installation

For a candidate the user wants to install, run:

```sh
node ../../cli/dsh-capability.mjs inspect <owner/repo> --json
```

Explain any lifecycle scripts, subprocess execution, network access, credential-related access, filesystem mutation, or instruction-layer findings. Always state that the scan is heuristic and does not prove safety.

## 5. Installation is a separate decision

Do not install on the strength of search results alone. First identify whether the candidate is a DSH bundle, a plain Skill, an MCP server, or another artifact by reading its current repository documentation and package metadata. Then follow that project's own installation instructions and the user's target DSH profile.

Do not claim that any candidate is directly installable, requires no external runtime, or is compatible with the user's profile unless those facts were verified from current repository documentation, package metadata, or an explicit pre-installation inspection. Search metadata alone is insufficient.

Never invent an install command for an artifact whose format is unclear.
