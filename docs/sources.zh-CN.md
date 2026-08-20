# 数据源

[English](./sources.md)

工具会在运行时获取公开元数据。npm 包和 Git 仓库中都不打包数据源快照。`awesome-dsh-plugins` 适配器读取上游生成的 `web/data.js` 目录，并且只解析其中的 `window.__DSH_DATA__` JSON 赋值。GitHub 静态目录优先使用官方 Contents API，并保留 `raw.githubusercontent.com` 作为回退；只要 `api.github.com` 可访问，用户就不需要因为 Raw 域名受阻而配置代理。静态目录会尽力使用操作系统临时目录中的 5 分钟磁盘缓存；可以通过 `CAPABILITY_DISCOVERY_CACHE_DIR` 修改缓存位置。该变量不使用 DSH 保留的 `DSH_*` 命名空间，因此可以传递给 Skill 启动的 CLI 子进程。

| 数据源 | 适配器 | 用途 |
|---|---|---|
| GitHub `dsh-plugin` Topic | `github-topic.js` | 实时搜索带有 DSH Plugin Topic 的公开仓库，不使用缓存 |
| `kejixiaoliang/awesome-dsh-plugins` | `awesome-dsh-plugins.js` | 结构化插件目录，缓存 5 分钟 |
| `Dominic789654/awesome-deepseek-harness` | `awesome-deepseek-harness.js` | 更广泛的生态分类目录，缓存 5 分钟 |
| `awesome-dsh-plugin.com/plugins.json` | `awesome-registry.js` | 人工整理 Registry 的交叉信号，缓存 5 分钟 |

## 失败处理

各适配器彼此独立。网络故障以及 HTTP `429`、`502`、`503`、`504` 响应会重试两次；有效的 `Retry-After` 响应头会得到遵守。`400`、`401`、`403`、`404` 等确定性错误不会重试。执行上述策略后仍然存在的超时、HTTP 错误或格式错误会写入 `sourceErrors`，其他成功来源仍会参与结果合并。

对于 GitHub 静态目录，只有 Contents API 和 Raw 端点都失败后，才会把这个逻辑数据源标记为失败。API 请求可以使用可选的 `GITHUB_TOKEN` 或 `GH_TOKEN` 提高 GitHub 限额；读取普通公开数据时不要求配置 Token。

静态缓存写入是可选行为：即使缓存文件系统发生故障，也不会让一次成功的数据源请求失败。缓存内容在使用前会重新解析；格式错误或已经过期的缓存会回退到网络请求。

配置代理变量后，在支持该能力的 Node.js 版本中，`fetch` 可能还需要设置 `NODE_USE_ENV_PROXY=1`。错误信息只会指出无效代理变量的名称，不会打印变量值。

## 多源一致性

如果多个适配器发现同一个 GitHub 仓库，它们会合并成一个结果，并在 `sources` 数组中记录全部命中来源。多源一致性会提高排序分数，但不能作为安全性或质量证明。

## 新增数据源

在 `src/discovery/sources/` 中创建职责单一的模块：

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

然后把该模块加入 `src/discovery/index.js` 的 `defaultSources`，并为解析器或适配器补充测试。
