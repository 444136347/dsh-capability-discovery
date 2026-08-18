# 贡献指南

[English](./CONTRIBUTING.md)

感谢你为 `dsh-capability-discovery` 做出贡献。

## 开发环境

- Node.js 20+
- 不需要安装运行时 npm 依赖

```bash
npm test
npm run check
```

## Pull Request

请保持变更范围集中。修改行为时：

1. 先新增或更新一个会失败的测试；
2. 实现能够让测试通过的最小改动；
3. 运行完整测试；
4. 用户可见行为发生变化时，同步更新 README 或相关文档。

## 新增发现数据源

新数据源必须：

- 提供与 DeepSeek Harness 能力相关的公开元数据；
- 独立失败，不影响其他适配器；
- 尽可能标准化成 GitHub `owner/repo` 标识；
- 为解析器或适配器提供测试；
- 记录速率限制、认证要求或特殊使用条款。

## 安全相关变更

不要把启发式检测结果描述成安全证明。新增规则应说明它识别的模式，并提供回归测试。
