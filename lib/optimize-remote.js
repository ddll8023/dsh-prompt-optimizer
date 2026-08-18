/**
 * Host-side Remote service for dsh-prompt-optimizer.
 *
 * The browser receives only the rewritten text plus the source tag
 * ("llm" | "rules" | "none"). The rewrite itself runs inside the Host so the
 * session's default LLM provider/model can be used; deterministic local rules
 * are the fallback when no model is available or the call fails.
 *
 * @module dsh-prompt-optimizer/optimize-remote
 */

import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

/**
 * The source package is JavaScript-only, while Typert normally marks methods
 * during TypeScript compilation. Apply the same public Remote marker once to
 * the service prototype without requiring a build-time decorator transform.
 */
const remoteInitializers = [];
Remote("optimize")(undefined, {
  private: false,
  static: false,
  name: "optimize",
  addInitializer(initializer) {
    remoteInitializers.push(initializer);
  },
});

/** Host Remote namespace: `ctx.remote.promptOptimize.optimize()`. */
export class PromptOptimizeRemoteService extends TypertRemoteService {
  constructor(ctx, options = {}) {
    super(ctx, "promptOptimize");
    this.optimizeText = options.optimizeText;
    if (typeof this.optimizeText !== "function") {
      throw new TypeError("dsh-prompt-optimizer: PromptOptimizeRemoteService requires an optimizeText function");
    }
    for (const initializer of remoteInitializers) initializer.call(this);
  }

  /** Rewrite `args.text` and return `{ text, source }`. */
  async optimize(args) {
    return this.optimizeText(args);
  }
}