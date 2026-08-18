# dsh-prompt-optimizer

> 在 DeepSeek Harness（DSH）Web 输入区提交按钮左侧增加「优化」按钮：点击后把输入框内的内容改写为更清晰、更完整、更结构化的 prompt，并写回输入框。

- 兼容版本：DSH `>= 0.1.0-rc.6`
- License：MIT

## 功能特性

- 在 composer 工具行右侧（提交按钮左侧）提供「优化」按钮，输入为空或优化中自动禁用。
- **LLM 重写（首选）**：复用宿主 `llm` 服务与当前会话默认模型（`agentDefaultModel`），按「保留原意、补全上下文占位、结构化编号/列表、指定输出格式、同语言输出、只输出文本」的规则改写输入。
- **本地规则兜底（降级）**：无模型可用或 LLM 调用失败时，退化为确定性文本清理（去行尾空白、压缩空行、消除不换行空格等），保证按钮始终可用。
- 写入输入框使用会话输入 Action（`inputActions.setDraft`），与普通编辑一致，不绕过输入机。

## 优化算法说明

| 层级 | 方案 | 触发条件 | 参考 |
| --- | --- | --- | --- |
| 首选 | LLM 重写（prompt rewriting） | 会话默认模型可用 | [Chrome Rewriter API](https://developer.chrome.com/docs/ai/rewriter-api)、[deer-flow composer input polishing](https://github.com/bytedance/deer-flow/pull/3986)、[humanize-text LLM rewriter](https://github.com/the-coding-freak/humanize-text/blob/bd9b2461/src/methodologies/llm_rewriter.py) |
| 兜底 | 本地确定性文本清理 | 模型缺失 / 调用失败 | 常见输入规范化规则 |

## 安装与启用

### 方式 A（推荐）：`dsh plugin`

```bash
# 直接从 GitHub 安装（发布后）
dsh plugin --profile web add github:ddll8023/dsh-prompt-optimizer

# 或先 clone 到本地，再安装本地路径
git clone https://github.com/ddll8023/dsh-prompt-optimizer.git
dsh plugin --profile web add /绝对路径/dsh-prompt-optimizer
```

安装后重启 `dsh web` 并刷新页面，composer 提交按钮左侧会出现「优化」按钮。

### 方式 B：手动安装

1. 将插件源码放入或链接到 `$DSH_HOME/profiles/web/node_modules/dsh-prompt-optimizer`。
2. 在 `$DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles` 中追加 `dsh-prompt-optimizer`。
3. 重启 `dsh web`。

## 使用

1. 在输入框输入一段想发送给 AI 的内容（可以是模糊的需求或口语化描述）。
2. 点击提交按钮左侧的「优化」。
3. 输入框内容被替换为优化后的版本，检查无误后直接发送。

## 架构

- `lib/index.js`：Host 端插件入口，注册 `promptOptimize` Remote 服务，实现 LLM 重写与本地规则降级。
- `lib/optimize-remote.js`：Host 端 Typert Remote 服务定义（`ctx.remote.promptOptimize.optimize()`）。
- `lib/client.js`：Web Client 端，挂载 Remote 并在 `conversation.input.right` 槽位注册按钮。
- `cordis.patch.yml`：bundle 层插件行注册。

Client→Host 调用走 Typert Remote（`remote.$mount` + `scope.get("remote.promptOptimize")`），不在会话流中产生命令卡片噪音。

## 验证

```bash
npm test          # 运行 Node 内置测试（test/*.test.js）
```

## License

MIT（Copyright (c) 2026 ddll8023）