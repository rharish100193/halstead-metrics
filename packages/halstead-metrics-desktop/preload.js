"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("halstead", {
	home: () => ipcRenderer.invoke("home"),
	parent: (dirPath) => ipcRenderer.invoke("parent", dirPath),
	listDir: (dirPath) => ipcRenderer.invoke("list-dir", dirPath),
	openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),
	exportReport: (filePath, kind) => ipcRenderer.invoke("export-report", { filePath: filePath, kind: kind }),
	pickFile: () => ipcRenderer.invoke("pick-file"),
	onOpenFile: (callback) => {
		ipcRenderer.on("menu-open-file", () => callback());
	},
});
