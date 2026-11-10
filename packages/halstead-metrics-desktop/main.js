"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");

const { listDirectory, readSource, exportReport } = require("./lib/files");

let mainWindow = null;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 720,
		minWidth: 800,
		minHeight: 560,
		title: "Halstead Metrics",
		backgroundColor: "#ececec",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});
	mainWindow.loadFile(path.join(__dirname, "index.html"));
}

function buildMenu() {
	const template = [];
	if (process.platform === "darwin") {
		template.push({ role: "appMenu" });
	}
	template.push({
		label: "File",
		submenu: [
			{
				label: "Open File...",
				accelerator: "CmdOrCtrl+O",
				click: () => {
					if (mainWindow) {
						mainWindow.webContents.send("menu-open-file");
					}
				},
			},
			{ type: "separator" },
			{
				label: "Exit",
				accelerator: "CmdOrCtrl+Q",
				click: () => app.quit(),
			},
		],
	});
	template.push({ role: "editMenu" });
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle("home", () => os.homedir());

ipcMain.handle("parent", (event, dirPath) => {
	const parent = path.dirname(dirPath);
	return parent === dirPath ? dirPath : parent;
});

ipcMain.handle("list-dir", (event, dirPath) => {
	try {
		return { ok: true, entries: listDirectory(dirPath) };
	} catch (err) {
		return { ok: false, error: err.message, entries: [] };
	}
});

ipcMain.handle("open-file", (event, filePath) => {
	try {
		const stat = fs.statSync(filePath);
		if (!stat.isFile()) {
			return { ok: true, file: readSource(filePath), directory: path.dirname(filePath) };
		}
		return { ok: true, file: readSource(filePath) };
	} catch (err) {
		return { ok: false, error: "Cannot read file." };
	}
});

ipcMain.handle("export-report", async (event, payload) => {
	try {
		const outputPath = await exportReport(payload.filePath, payload.kind);
		const openError = await shell.openPath(outputPath);
		if (openError) {
			return { ok: true, path: outputPath, warning: openError };
		}
		return { ok: true, path: outputPath };
	} catch (err) {
		return { ok: false, error: err.message };
	}
});

ipcMain.handle("pick-file", async () => {
	const result = await dialog.showOpenDialog(mainWindow, {
		title: "Open source file",
		properties: ["openFile"],
		filters: [
			{ name: "Java, C, C++", extensions: ["java", "c", "cc", "cpp", "c++"] },
		],
	});
	if (result.canceled || result.filePaths.length === 0) {
		return null;
	}
	return result.filePaths[0];
});

app.whenReady().then(() => {
	buildMenu();
	createWindow();
});

app.on("window-all-closed", () => {
	app.quit();
});
