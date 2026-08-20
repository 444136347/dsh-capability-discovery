# 发布到 GitHub

[English](./publishing.md)

## 1. 在本地创建仓库

解压发布包后执行：

```bash
cd dsh-capability-discovery
git init
git add .
git commit -m "feat: initial open-source release"
git branch -M main
```

## 2. 创建 GitHub 仓库

使用 GitHub CLI：

```bash
gh repo create dsh-capability-discovery --public --source=. --remote=origin --push
```

也可以先在 GitHub 创建一个空的公开仓库，再手动添加远程地址。

## 3. 推荐的仓库元数据

仓库描述：

```text
Multi-source capability discovery, ranking and heuristic risk inspection for DeepSeek Harness.
```

建议 Topics：

```text
deepseek deepseek-harness dsh ai-agent agent-skills mcp plugin-discovery capability-discovery
```

## 4. 创建版本标签

先运行测试：

```bash
npm test
npm run check
```

然后创建并推送标签：

```bash
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
```

DSH 安装示例应固定使用标签，避免用户安装持续变化的 `main` 分支。

## 5. 发布到 npm 之前

GitHub 仓库可以公开，而不必同时发布到 npm。如果以后需要 npm 分发，应先确认包名可用，并确保 `package.json` 已包含 `repository`、`bugs` 和 `homepage` 字段。
