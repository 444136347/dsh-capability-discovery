# 变更记录

[English](./CHANGELOG.md)

## 0.1.0 - 2026-08-19

- 新增多源能力发现、标准化、去重和确定性排序。
- 当数据源元数据支持时，可识别 DSH Plugin、Skill、MCP Server、Profile、Agent、Runtime 和 UI。
- 新增 GitHub 仓库启发式风险检查。
- 新增 `capability-discovery` Skill、DSH Bundle 集成、CLI 和旧 Profile 修复命令。
- 新增严格 CLI 参数校验、安全 Profile 名称校验和集中式包版本读取。
- 新增有界重试、`Retry-After` 支持、详细网络/代理诊断和 5 分钟静态来源缓存。
- 新增 Bundle 验证、重启说明、`/capability-discovery` 调用方式、Profile 隔离和 Skill 缺失排查。
- Skill 使用一次组合查询，首次没有相关候选时最多更换查询重试一次。
- 新增紧凑 Markdown 回答约束：三列表格、简洁来源状态和本地化操作状态。
- 候选表格表头会跟随回答语言，并明确 `GitHub ★` 表示 GitHub Stars 而不是评级。
- 更新 `awesome-dsh-plugins` 适配器，以支持上游新的 `web/data.js` 目录格式。
- 禁止仅凭搜索元数据断言候选可直接安装、无需外部运行时或兼容当前 Profile。
- 默认聊天回答不再显示原始命令、本地路径、诊断信息或 HTML。
- 补充架构、数据源、发布、贡献、安全策略和变更记录的中文文档。
- 新增 Node.js 测试和 GitHub Actions 检查。
