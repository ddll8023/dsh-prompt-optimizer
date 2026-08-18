/**
 * dsh-prompt-optimizer — host side.
 *
 * Mounts the `promptOptimize` Typert Remote service. The rewrite strategy is
 * hybrid:
 *
 * 1. LLM rewrite (preferred): stream the session's currently selected default
 *    model (`agentDefaultModel.currentSelection()`) through `ctx.llm` with a
 *    prompt-optimization system instruction, keeping the user's intent and
 *    language while adding structure, context placeholders, and output
 *    guidance.
 * 2. Local rules (fallback): deterministic, meaning-preserving text cleanup
 *    when no model is available or the call fails, so the button always works.
 *
 * @module dsh-prompt-optimizer
 */

import { PromptOptimizeRemoteService } from "./optimize-remote.js";

export const name = "dsh-prompt-optimizer";

/** Deterministic local cleanup: never changes meaning, only normalizes text. */
export function localClean(text) {
  let t = String(text);
  t = t.replace(/[\t\r\f\v ]+$/gm, ""); // trailing whitespace per line
  t = t.replace(/\n{3,}/g, "\n\n"); // collapse three+ newlines to one blank line
  t = t.replace(/[ \t]+\n/g, "\n"); // spaces before a newline
  t = t.replace(/\u00a0/g, " "); // non-breaking space
  t = t.replace(/^\s+|\s+$/g, ""); // leading/trailing whitespace
  return t;
}

const SYSTEM_PROMPT = [
  "你是一名专业的提示词（prompt）优化助手。",
  "请把用户输入改写为一条更清晰、更完整、更结构化的问题或指令，要求：",
  "1. 保留用户的原始意图、语气与内容，不臆造用户没说的信息；",
  "2. 补全缺失的关键上下文占位（用方括号标注需用户填写的信息）与明确的任务目标；",
  "3. 拆分多重要求，必要时使用编号或列表，让结构清晰；",
  "4. 指定合适的输出格式或交付形式；",
  "5. 使用与用户输入相同的语言；",
  "6. 只输出优化后的文本本身，不要任何解释、引号或前后缀。",
].join("\n");

/** Rewrite `text` via the session's default LLM; returns undefined on any failure. */
async function rewriteWithLlm(ctx, text) {
  const llm = ctx.get("llm");
  const agentDefaultModel = ctx.get("agentDefaultModel");
  if (llm === undefined || agentDefaultModel === undefined) return undefined;
  const selection =
    typeof agentDefaultModel.currentSelection === "function"
      ? agentDefaultModel.currentSelection()
      : undefined;
  if (!selection || !selection.provider || !selection.model) return undefined;

  const stream = llm.stream({
    provider: selection.provider,
    model: selection.model,
    system: SYSTEM_PROMPT,
    temperature: 0.3,
    messages: [
      {
        id: "dsh-prompt-optimizer-user-message",
        role: "user",
        content: [{ type: "text", text }],
        source: { kind: "user" },
      },
    ],
  });

  let out = "";
  for await (const chunk of stream) {
    if (chunk && chunk.type === "text-delta") out += chunk.text;
    if (
      chunk &&
      chunk.type === "finish" &&
      (chunk.reason.kind === "error" || chunk.reason.kind === "aborted")
    ) {
      const failure = chunk.reason.failure;
      throw new Error(failure ? failure.message : "LLM 调用中断");
    }
  }
  const trimmed = out.trim();
  return trimmed || undefined;
}

/**
 * Register the plugin.
 * @param ctx - the plugin's scoped Cordis context.
 */
export function apply(ctx) {
  ctx.plugin(PromptOptimizeRemoteService, {
    optimizeText: async (args) => {
      const text = args && typeof args.text === "string" ? args.text : "";
      if (!text.trim()) return { text, source: "none" };
      try {
        const rewritten = await rewriteWithLlm(ctx, text);
        if (rewritten) return { text: rewritten, source: "llm" };
      } catch (error) {
        ctx.logger?.error?.("[dsh-prompt-optimizer] LLM 重写失败，降级为本地规则", error);
      }
      const cleaned = localClean(text);
      return { text: cleaned, source: cleaned === text ? "none" : "rules" };
    },
  });
}