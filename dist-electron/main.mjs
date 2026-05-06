import { BrowserWindow, Menu, Tray, app, ipcMain, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var preloadPath = path.join(__dirname, "preload.mjs");
process.env.APP_ROOT = path.join(__dirname, "..");
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
var VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
process.env.VITE_PUBLIC = VITE_PUBLIC;
if (!app.requestSingleInstanceLock()) app.quit();
else {
	app.on("second-instance", () => {
		if (win) {
			if (win.isMinimized()) win.restore();
			win.show();
			win.focus();
		}
	});
	let win = null;
	let settingsWin = null;
	let tray = null;
	const STORE_PATH = path.join(app.getPath("userData"), "window-state.json");
	function loadWindowState() {
		try {
			if (fs.existsSync(STORE_PATH)) return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
		} catch (e) {
			console.error("Failed to load window state:", e);
		}
		return {
			width: 600,
			height: 400
		};
	}
	function saveWindowState() {
		if (!win) return;
		const bounds = win.getBounds();
		try {
			fs.writeFileSync(STORE_PATH, JSON.stringify(bounds));
		} catch (e) {
			console.error("Failed to save window state:", e);
		}
	}
	function keepWindowInBounds() {
		if (!win) return;
		const bounds = win.getBounds();
		const workArea = screen.getDisplayMatching(bounds).workArea;
		let { x, y, width, height } = bounds;
		let modified = false;
		if (width > workArea.width) {
			width = workArea.width;
			modified = true;
		}
		if (height > workArea.height) {
			height = workArea.height;
			modified = true;
		}
		if (x < workArea.x) {
			x = workArea.x;
			modified = true;
		} else if (x + width > workArea.x + workArea.width) {
			x = workArea.x + workArea.width - width;
			modified = true;
		}
		if (y < workArea.y) {
			y = workArea.y;
			modified = true;
		} else if (y + height > workArea.y + workArea.height) {
			y = workArea.y + workArea.height - height;
			modified = true;
		}
		if (modified) win.setBounds({
			x,
			y,
			width,
			height
		});
	}
	function createTray() {
		try {
			const iconPath = path.join(VITE_PUBLIC, "tray-icon.png");
			if (!fs.existsSync(iconPath)) {
				console.error("Tray icon not found at:", iconPath);
				return;
			}
			tray = new Tray(iconPath);
			const contextMenu = Menu.buildFromTemplate([
				{
					label: "Show Widget",
					click: () => win?.show()
				},
				{
					label: "Settings",
					click: () => ipcMain.emit("open-settings")
				},
				{ type: "separator" },
				{
					label: "Quit",
					click: () => app.quit()
				}
			]);
			tray.setToolTip("Lux Countdown");
			tray.setContextMenu(contextMenu);
			tray.on("click", () => {
				if (win?.isVisible()) win.hide();
				else win?.show();
			});
		} catch (e) {
			console.error("Failed to create tray:", e);
		}
	}
	function createWindow() {
		const state = loadWindowState();
		const iconPath = path.join(VITE_PUBLIC, "favicon.png");
		win = new BrowserWindow({
			x: state.x,
			y: state.y,
			width: state.width,
			height: state.height,
			transparent: true,
			frame: false,
			resizable: true,
			alwaysOnTop: false,
			skipTaskbar: true,
			icon: iconPath,
			title: "Lux Countdown",
			webPreferences: {
				preload: preloadPath,
				nodeIntegration: false,
				contextIsolation: true
			}
		});
		win.once("ready-to-show", () => {
			keepWindowInBounds();
			win?.show();
		});
		win.on("move", () => {
			keepWindowInBounds();
			saveWindowState();
		});
		win.on("resize", () => {
			keepWindowInBounds();
			saveWindowState();
		});
		win.webContents.on("did-finish-load", () => {
			win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
		});
		if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
		else win.loadFile(path.join(RENDERER_DIST, "index.html"));
		win.on("closed", () => {
			win = null;
			if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
		});
	}
	ipcMain.on("open-settings", () => {
		if (settingsWin && !settingsWin.isDestroyed()) {
			settingsWin.focus();
			return;
		}
		settingsWin = new BrowserWindow({
			width: 450,
			height: 600,
			title: "Settings",
			icon: path.join(VITE_PUBLIC, "favicon.png"),
			autoHideMenuBar: true,
			backgroundColor: "#1a1a20",
			show: false,
			frame: false,
			resizable: false,
			webPreferences: {
				preload: preloadPath,
				nodeIntegration: false,
				contextIsolation: true
			}
		});
		const settingsPath = VITE_DEV_SERVER_URL ? `${VITE_DEV_SERVER_URL}?mode=settings` : `file://${path.join(RENDERER_DIST, "index.html")}?mode=settings`;
		if (VITE_DEV_SERVER_URL) settingsWin.loadURL(settingsPath);
		else settingsWin.loadFile(path.join(RENDERER_DIST, "index.html"), { query: { mode: "settings" } });
		settingsWin.on("closed", () => {
			settingsWin = null;
		});
		settingsWin.once("ready-to-show", () => {
			settingsWin?.show();
		});
	});
	ipcMain.on("settings-updated", () => {
		if (win && !win.isDestroyed()) win.webContents.send("refresh-settings");
	});
	ipcMain.on("set-run-on-startup", (_event, value) => {
		app.setLoginItemSettings({
			openAtLogin: value,
			path: app.getPath("exe")
		});
	});
	app.on("window-all-closed", () => {
		if (process.platform !== "darwin") app.quit();
	});
	app.whenReady().then(() => {
		createTray();
		createWindow();
	});
}
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };

//# sourceMappingURL=main.mjs.map