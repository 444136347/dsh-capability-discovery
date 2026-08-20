# dsh-capability-discovery

**面向 DeepSeek Harness 的多源能力发现、排序与启发式风险检查工具。**

`dsh-capability-discovery` 是负责安装和加载的 **DSH Bundle**，它向 Harness 注册用户实际调用的 **`capability-discovery` Skill**。该 Skill 从多个公开来源寻找 DSH Plugin、Agent Skill、MCP Server、Profile、Agent 等能力，统一去重和排序，然后对准备采用的仓库做基础风险检查。

> 独立社区项目，与 DeepSeek 无官方隶属或背书关系。

[English](./README.md) · [架构](./docs/architecture.zh-CN.md) · [数据源](./docs/sources.zh-CN.md) · [发布指南](./docs/publishing.zh-CN.md) · [贡献指南](./CONTRIBUTING.zh-CN.md) · [安全策略](./SECURITY.zh-CN.md) · [变更记录](./CHANGELOG.zh-CN.md)

## 为什么做这个

DSH 生态的能力分散在 GitHub Topic、Awesome List 和社区 Registry 中。人可以一个个逛，但 Agent 更需要一条稳定链路：

```text
用户需求
  ↓
多源发现
  ↓
Normalize
  ↓
Deduplicate
  ↓
Rerank
  ↓
Top Candidates
  ↓
Heuristic Risk Inspection
  ↓
用户决定是否采用/安装
```

核心原则是：**发现和安装分离**。搜索结果只能作为候选，不能因为排第一就自动获得执行权限。

## 第一版数据源

- GitHub `dsh-plugin` Topic
- `kejixiaoliang/awesome-dsh-plugins` 的结构化插件数据
- `Dominic789654/awesome-deepseek-harness` 的生态目录
- `awesome-dsh-plugin.com` 的公开 Registry

某个数据源失效时不会让整次查询失败，返回结果里会保留 `sourceErrors`。

## 快速开始

需要 Node.js 20+。

```bash
git clone https://github.com/444136347/dsh-capability-discovery.git
cd dsh-capability-discovery
npm test

node cli/dsh-capability.mjs sources
node cli/dsh-capability.mjs search ppt slides --limit 5
node cli/dsh-capability.mjs search memory --type skill --json
node cli/dsh-capability.mjs inspect owner/repo
```

## 在 DeepSeek Harness 中使用

先区分两个名称：

| 名称 | 作用 |
|---|---|
| `dsh-capability-discovery` | 安装进 profile 的 DSH Bundle 包 |
| `capability-discovery` | 在会话中调用的 Skill |

官方命令使用 `dsh plugin` 作为 profile 的外部包管理入口，因此安装 Bundle 也通过该子命令完成；这不表示最终能力是一个 Web UI 插件。相关机制可参考 DSH 官方的 [Bundle 发布与安装教程](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish/)与[参考文档](https://deepseek-harness.github.io/deepseek-harness/reference/)。

### 1. 安装 Bundle

安装 GitHub 已发布版本时，建议固定 tag 或 commit。当前公开版本为 `v0.1.1`：

```bash
npx -y @deepseek-ai/dsh plugin --profile web add \
  'github:444136347/dsh-capability-discovery#v0.1.1'
```

当前版本 DSH 会同时把包加入 `dependencies`，并自动维护 `dsh.profile.bundles`。启动前先验证最终组合配置：

```bash
npx -y @deepseek-ai/dsh --profile web --dump-config \
  | grep -n -C 4 -E 'dsh-capability-discovery|capability-discovery'
```

输出中应能看到 `# == dsh-capability-discovery` Bundle 层和 `dsh-capability-discovery` Loader 条目。

DSH 的 profile 相互独立：安装到 `web` 不会自动安装到 `headless` 或其他 profile。

### 2. 重启 DSH

如果 DSH 已经在运行，安装或升级 Bundle 后必须停止并重新启动同一个 profile：

```bash
npx -y @deepseek-ai/dsh web
```

刷新浏览器或新建会话不会让正在运行的旧进程重新加载 Bundle。运行时 DSH 只监听 profile 级的 `${DSH_HOME:-$HOME/.dsh}/profiles/<profile>/cordis.patch.yml` 和 home 级的 `${DSH_HOME:-$HOME/.dsh}/cordis.patch.yml` 两个用户 patch；已安装包、`dsh.profile.bundles` 和 Bundle 自身 patch 的变化要到下次进程启动时才生效。

### 3. 调用 Skill

在新的 Web 会话输入框中键入 `/cap`，从 `/` Skill 菜单选择 `capability-discovery`；也可以直接发送：

```text
/capability-discovery 帮我找适合制作 PPT 的 DSH 插件或 Skill，只推荐 3 个，不要安装
```

`/capability-discovery` 是确定性调用：DSH 会先加载该 Skill 的完整指令，再处理后面的任务。也可以只用自然语言让模型自行选择 Skill，但显式 `/` 调用更适合安装后的首次验证。

默认回答使用紧凑 Markdown：先给结论，再用表格列出最多 3 个候选，最后显示来源覆盖和“未安装”状态。Skill 会把相关英文关键词合并为一次搜索；只有首次没有相关候选时才允许更换关键词重试一次。完整来源表、命令和诊断信息只在明确要求时展开，聊天中不会默认生成 HTML。

更多示例：

```text
/capability-discovery 帮我找 MCP 管理相关能力，披露失败的数据源，不要安装

/capability-discovery 只搜索 Skill 类型的 Office 文件处理能力，比较前三名

/capability-discovery 检查 STARDUSTLC666/dsh-ppt 的风险，不要安装
```

它不会新增独立插件页面、设置卡片或侧边栏入口，但会出现在 Web 输入框的 `/` Skill 菜单中。

### 4. 在 headless profile 中使用

`headless` 需要单独安装，然后可以直接在一次性任务中调用：

```bash
npx -y @deepseek-ai/dsh plugin --profile headless add \
  'github:444136347/dsh-capability-discovery#v0.1.1'

npx -y @deepseek-ai/dsh --profile headless \
  '/capability-discovery 帮我找适合制作 PPT 的 DSH 能力，不要安装'
```

### 5. 找不到 Skill 时排查

1. 确认安装和启动使用的是同一个 profile，例如都为 `web`。
2. 运行上面的 `--dump-config`，确认 Bundle 层和 Loader 条目存在。
3. 停止旧 DSH 进程并重新启动；只刷新浏览器不够。
4. 新建会话，在输入框键入 `/cap`，确认菜单出现 `capability-discovery`。
5. 绕过 Skill 直接测试同一份 CLI：

```bash
cd "${DSH_HOME:-$HOME/.dsh}/profiles/web"
pnpm exec dsh-capability search ppt --json
```

CLI 能搜索但 `/` 菜单没有 Skill，通常是 profile、Bundle 加载或进程重启问题；CLI 本身也失败，则查看输出中的 `sourceErrors` 和网络代理诊断。

如果是历史遗留 profile，已经写入 dependency 但缺少 Bundle 条目，才需要执行修复命令：

```bash
cd "${DSH_HOME:-$HOME/.dsh}/profiles/web"
pnpm exec dsh-capability setup --profile web
```

## CLI

### 搜索

```bash
dsh-capability search <关键词...> [--limit 10] [--type plugin|skill|mcp|profile|agent|orchestrator|ui|runtime|workflow] [--json]
```

排序主要考虑：

1. 当前任务的关键词相关性；
2. 是否被多个独立来源同时收录；
3. 最近维护时间；
4. GitHub Stars（只作为弱信号）；
5. 是否进入人工整理的社区目录。

### 风险检查

```bash
dsh-capability inspect owner/repo [--json]
```

第一版会检查这些启发式信号：

- `preinstall/install/postinstall/prepare` 等生命周期脚本；
- subprocess / command execution；
- 环境变量、凭据相关访问；
- 网络访问；
- 文件系统修改；
- Skill/Agent 指令中的 prompt injection / 数据外传可疑表达；
- 依赖面。

**这不是安全认证。** 没发现已知模式，不代表仓库安全。它只能降低“完全不看就装”的风险。

设置 `GITHUB_TOKEN` 或 `GH_TOKEN` 后，GitHub API 会自动使用该 Token。它可以提高 API 限额，并检查 Token 有权访问的仓库；不要把 Token 写进命令参数或提交到仓库。

### 旧 Profile 修复

```bash
dsh-capability setup [--profile web] [--json]
```

这个命令只用于修复“包已经安装，但旧 profile 的 `dsh.profile.bundles` 里缺少本 Bundle”的历史状态。当前 DSH 的 plugin 命令会自动维护该列表。修复命令不会安装依赖，也不会启动 DSH。

## 网络可靠性

- 网络异常以及 HTTP `429`、`502`、`503`、`504` 会自动重试 2 次，并采用递增等待时间。
- 服务端返回有效 `Retry-After` 时，优先按该时间等待。
- `400`、`401`、`403`、`404` 等确定性错误不会重试，避免无意义等待。
- 三个静态 Awesome List/Registry 来源使用 5 分钟临时磁盘缓存；GitHub 关键词搜索保持实时，不做缓存。
- 重试后仍失败的来源会写入 `sourceErrors`，其他成功来源仍然正常参与结果合并。

缓存默认写入操作系统临时目录。如需指定目录，可设置 `CAPABILITY_DISCOVERY_CACHE_DIR`。该变量特意不使用 DSH 保留的 `DSH_*` 前缀，因此能传递给 Skill 启动的 CLI 子进程。

如果 DSH 需要通过 HTTP 代理访问网络，请先确认 `HTTP_PROXY`/`HTTPS_PROXY` 是合法 URL。使用支持该能力的 Node.js 版本时，需要以 `NODE_USE_ENV_PROXY=1` 启动 DSH，Node.js 的 `fetch` 才会读取这些代理变量。日志和 Issue 中不要暴露代理账号或密码。

## 第一版边界

| 能力类型 | v0.1 |
|---|---|
| DSH Plugin | 支持 |
| Agent Skill | 支持 |
| MCP Server | 来源能够识别时支持 |
| Profile / Patch | 实验性分类 |
| Agent / Orchestrator / Runtime / UI | 实验性分类 |

暂时不做：托管后端、账户系统、商业市场、一键自动安装、自动付费、全量代码安全审计。

## 项目状态

当前公开版本为 `v0.1.1`。项目保持小而可审计的核心，不包含数据库、托管后端、账户系统、市场 UI 或自动安装流程。

## 开源与第三方关系

本项目是独立实现，不继承其他插件发现工具的代码。

项目包内不打包上述数据源的第三方仓库内容，而是在运行时读取公开元数据；静态目录可能按上面的规则保留 5 分钟临时缓存。第三方项目和数据仍遵循各自的许可证与使用条款。

## 开发

```bash
npm test
npm run check
npm pack --dry-run
```

运行时代码不依赖第三方 npm 包，测试使用 Node 内置 test runner。

## License

Apache License 2.0，见 [LICENSE](./LICENSE)。
