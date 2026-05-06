//#endregion
//#region electron/preload.ts
var { contextBridge, ipcRenderer } = (/* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, { get: (a, b) => (typeof require !== "undefined" ? require : a)[b] }) : x)(function(x) {
	if (typeof require !== "undefined") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + x + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
}))("electron");
console.log("Preload Script: Starting execution (CJS version)...");
try {
	contextBridge.exposeInMainWorld("ipcRenderer", {
		on(channel, listener) {
			return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
		},
		off(channel, listener) {
			return ipcRenderer.off(channel, listener);
		},
		send(channel, ...args) {
			return ipcRenderer.send(channel, ...args);
		},
		invoke(channel, ...args) {
			return ipcRenderer.invoke(channel, ...args);
		}
	});
	console.log("Preload Script: ipcRenderer exposed successfully");
} catch (error) {
	console.error("Preload Script: Failed to expose ipcRenderer:", error);
}
//#endregion

//# sourceMappingURL=preload.cjs.map