# Data sources

[中文](./sources.zh-CN.md)

The tool fetches public metadata at runtime. No source snapshot is bundled in the npm package or Git repository. The `awesome-dsh-plugins` adapter reads the upstream generated `web/data.js` catalog and parses only its `window.__DSH_DATA__` JSON assignment. Static catalogs use a best-effort five-minute disk cache in the operating system's temporary directory; `CAPABILITY_DISCOVERY_CACHE_DIR` can override that location. Its name avoids DSH's reserved `DSH_*` namespace so the setting reaches Skill CLI subprocesses.

| Source | Adapter | Purpose |
|---|---|---|
| GitHub `dsh-plugin` topic | `github-topic.js` | Fresh, uncached discovery of public repositories carrying the DSH plugin topic |
| `kejixiaoliang/awesome-dsh-plugins` | `awesome-dsh-plugins.js` | Structured plugin catalog, cached for five minutes |
| `Dominic789654/awesome-deepseek-harness` | `awesome-deepseek-harness.js` | Broader ecosystem classification, cached for five minutes |
| `awesome-dsh-plugin.com/plugins.json` | `awesome-registry.js` | Curated registry cross-signal, cached for five minutes |

## Failure behavior

Adapters are independent. Network failures and HTTP `429`, `502`, `503`, and `504` responses are retried twice. A valid `Retry-After` header is honored; permanent responses such as `400`, `401`, `403`, and `404` are not retried. Timeout, HTTP error, or format failure that remains after this policy is reported in `sourceErrors`; successful sources still contribute results.

Static cache writes are optional: a cache filesystem failure does not fail a successful source request. Cached payloads are parsed again before use, and malformed or expired entries fall back to the network.

When proxy variables are configured, Node.js fetch may require `NODE_USE_ENV_PROXY=1` in supported Node.js releases. Error messages identify invalid proxy variable names without printing their values.

## Source agreement

If the same GitHub repository is found by several adapters, it becomes one result whose `sources` array records all matches. Multi-source agreement contributes to ranking but is not treated as proof of safety or quality.

## Adding a source

Create a focused module in `src/discovery/sources/`:

```js
export const name = 'my-source'

export async function search({ query, fetchImpl }) {
  return [
    {
      fullName: 'owner/repo',
      url: 'https://github.com/owner/repo',
      description: '...',
      type: 'plugin'
    }
  ]
}
```

Then add it to `defaultSources` in `src/discovery/index.js` and add parser/adapter tests.
