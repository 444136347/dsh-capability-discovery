# Contributing

[中文](./CONTRIBUTING.zh-CN.md)

Thanks for contributing to `dsh-capability-discovery`.

## Development setup

- Node.js 20+
- No runtime npm dependencies are required

```bash
npm test
npm run check
```

## Pull requests

Keep changes focused. For behavior changes:

1. add or update a failing test first;
2. implement the smallest change that makes it pass;
3. run the full suite;
4. update README/docs when user-visible behavior changes.

## Adding discovery sources

A new source must:

- expose public metadata that is relevant to DeepSeek Harness capabilities;
- fail independently without breaking other adapters;
- normalize to GitHub `owner/repo` identity when possible;
- include tests for its parser or adapter;
- document rate limits, authentication requirements, or unusual terms.

## Security-related changes

Do not describe heuristic findings as proof of safety. New rules should state what pattern they detect and include a regression test.
