# Publishing to GitHub

[中文](./publishing.zh-CN.md)

## 1. Create the repository locally

After extracting the release zip:

```bash
cd dsh-capability-discovery
git init
git add .
git commit -m "feat: initial open-source release"
git branch -M main
```

## 2. Create the GitHub repository

With GitHub CLI:

```bash
gh repo create dsh-capability-discovery --public --source=. --remote=origin --push
```

Or create an empty public repository in GitHub and add its remote manually.

## 3. Recommended repository metadata

Description:

```text
Multi-source capability discovery, ranking and heuristic risk inspection for DeepSeek Harness.
```

Suggested topics:

```text
deepseek deepseek-harness dsh ai-agent agent-skills mcp plugin-discovery capability-discovery
```

## 4. Tag a release

Run tests first:

```bash
npm test
npm run check
```

Then:

```bash
git tag -a v0.1.2 -m "v0.1.2"
git push origin v0.1.2
```

Use the tag in DSH install examples so users do not install a moving `main` branch.

## 5. Before npm publishing

The GitHub repository can be public without publishing to npm. If you later want npm distribution, first confirm the package name is available and add `repository`, `bugs`, and `homepage` fields to `package.json`.
