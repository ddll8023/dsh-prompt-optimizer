window.__ModuleLoader__.load({
	id: "dsh-prompt-optimizer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var React = require("react");

		//#region remote descriptors
		function strictSchema(typeSymbol, parse) {
			return {
				mode: "strict",
				typeSymbol: typeSymbol,
				schema: { parse: parse },
			};
		}

		function assertText(value) {
			if (typeof value !== "string") throw new TypeError("optimize text must be a string");
			return value;
		}

		function assertOptimizeResult(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) {
				throw new TypeError("optimize result must be an object");
			}
			if (typeof value.text !== "string") throw new TypeError("optimize result has no text");
			if (value.source !== "llm" && value.source !== "rules" && value.source !== "none") {
				throw new TypeError("optimize result has an invalid source");
			}
			return value;
		}

		var OPTIMIZE_REMOTE = {
			package: "dsh-prompt-optimizer",
			descriptors: [
				{
					id: "dsh-prompt-optimizer#promptOptimize/optimize",
					service: "promptOptimize",
					namespace: "promptOptimize",
					method: "optimize",
					invocation: { kind: "direct" },
					parameters: [
						{
							name: "text",
							wire: "text",
							source: "json",
							codec: strictSchema("dsh-prompt-optimizer#OptimizeArgsText", assertText),
						},
					],
					result: strictSchema("dsh-prompt-optimizer#OptimizeResult", assertOptimizeResult),
				},
			],
		};
		//#endregion

		//#region styles
		var OPTIMIZE_CSS = [
			".dsh-optimize-btn{",
			"  min-width:0;height:28px;padding:0 12px;",
			"  color:var(--dsw-alias-label-secondary);",
			"  background:transparent;border:1px solid var(--dsw-alias-border-l1);",
			"  border-radius:24px;cursor:pointer;outline:none;",
			"  font-size:13px;font-weight:500;line-height:20px;",
			"  display:inline-flex;align-items:center;justify-content:center;gap:4px;",
			"}",
			".dsh-optimize-btn:hover:not(:disabled){",
			"  color:var(--dsw-alias-label-primary);",
			"  border-color:var(--dsw-alias-border-l2);",
			"  background:var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.08));",
			"}",
			".dsh-optimize-btn:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l2);}",
			".dsh-optimize-btn:disabled{opacity:.45;cursor:default;}",
			".dsh-optimize-btn.is-busy{cursor:progress;}",
		].join("\n");

		function installStyles() {
			if (typeof document === "undefined") return;
			if (document.querySelector('style[data-plugin-css="dsh-prompt-optimizer"]') !== null) return;
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-prompt-optimizer";
			tag.dataset.pluginCss = "dsh-prompt-optimizer";
			tag.textContent = OPTIMIZE_CSS;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region component
		function OptimizeButton(props) {
			var input = props && props.input;
			var actions = props && props.inputActions;
			var remote = props && props.optimizeRemote;
			var busy = React.useState(false);
			var setBusy = busy[1];
			var draft = input && typeof input.draft === "string" ? input.draft : "";

			var onClick = function () {
				if (!actions || !remote || busy[0] || !draft.trim()) return;
				setBusy(true);
				Promise.resolve()
					.then(function () { return remote.optimize(draft); })
					.then(function (res) {
						if (res && typeof res.text === "string" && res.text !== draft) {
							actions.setDraft(res.text);
						}
					})
					.catch(function (error) {
						console.error("[dsh-prompt-optimizer] 优化失败", error);
					})
					.finally(function () { setBusy(false); });
			};

			return React.createElement(
				"button",
				{
					type: "button",
					className: "dsh-optimize-btn" + (busy[0] ? " is-busy" : ""),
					disabled: !actions || !remote || !draft.trim() || busy[0],
					onClick: onClick,
					title: "优化输入框中的内容",
				},
				busy[0] ? "优化中…" : "优化",
			);
		}
		//#endregion

		//#region apply
		var inject = ["slots", "remote"];

		function apply(ctx) {
			installStyles();
			ctx.inject(inject, function (scope) {
				return scope.remote
					.$mount(OPTIMIZE_REMOTE)
					.then(function (disposeRemote) {
						var optimizeRemote = scope.get("remote.promptOptimize");
						if (optimizeRemote === undefined) {
							return disposeRemote().then(function () {
								throw new Error("dsh-prompt-optimizer: promptOptimize Remote did not mount");
							});
						}
						scope.effect(function () {
							return function () { disposeRemote(); };
						}, "dsh-prompt-optimizer: remote cleanup");
						scope.slots.inject("conversation.input.right", function () {
							return scope.slots.register(
								{
									name: "conversation.input.right",
									id: "dsh-prompt-optimizer",
									order: 10,
									label: "优化",
								},
								function (props) {
									return React.createElement(OptimizeButton, Object.assign({}, props, {
										optimizeRemote: optimizeRemote,
									}));
								},
							);
						});
					});
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});