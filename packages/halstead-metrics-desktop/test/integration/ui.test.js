"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const vm = require("vm");
const { JSDOM } = require("jsdom");

const { exportReport, listDirectory, readSource } = require("../../lib/files");

const desktopRoot = path.resolve(__dirname, "../..");
const rendererSource = fs.readFileSync(path.join(desktopRoot, "renderer.js"), "utf8");
const pageHtml = fs.readFileSync(path.join(desktopRoot, "index.html"), "utf8")
	.replace("<script src=\"renderer.js\"></script>", "");

function fixture() {
	const base = fs.mkdtempSync(path.join(os.tmpdir(), "halstead-app-"));
	const project = path.join(base, "project");
	fs.mkdirSync(path.join(project, "nested"), { recursive: true });
	fs.writeFileSync(path.join(project, "Sample.java"), "int x=1;\n");
	fs.writeFileSync(path.join(project, "notes.txt"), "hello");
	fs.writeFileSync(path.join(project, "nested", "Inner.java"), "int y=2;\n");
	return { base: base, project: project };
}

async function until(fn) {
	for (let i = 0; i < 50; i += 1) {
		if (fn()) {
			return;
		}
		await new Promise((resolve) => setImmediate(resolve));
	}
	throw new Error("timed out waiting for the desktop page");
}

function rowNamed(document, name) {
	const labels = document.querySelectorAll(".label");
	for (let i = 0; i < labels.length; i += 1) {
		if (labels[i].textContent === name) {
			return labels[i].closest(".row");
		}
	}
	return null;
}

function click(element) {
	const view = element.ownerDocument.defaultView;
	element.dispatchEvent(new view.MouseEvent("click", { bubbles: true }));
}

async function boot(homeDir) {
	const dom = new JSDOM(pageHtml, {
		url: "http://localhost/",
		pretendToBeVisual: true,
		runScripts: "outside-only",
	});
	const { window } = dom;
	window.HTMLElement.prototype.scrollIntoView = () => {};
	const openHandlers = [];
	let picked = null;
	window.halstead = {
		home: async () => homeDir,
		parent: async (dirPath) => {
			const parent = path.dirname(dirPath);
			return parent === dirPath ? dirPath : parent;
		},
		listDir: async (dirPath) => {
			try {
				return { ok: true, entries: listDirectory(dirPath) };
			} catch (err) {
				return { ok: false, error: err.message, entries: [] };
			}
		},
		openFile: async (filePath) => {
			try {
				fs.statSync(filePath);
			} catch (err) {
				return { ok: false, error: "Cannot read file." };
			}
			return { ok: true, file: readSource(filePath) };
		},
		exportReport: async (filePath, kind) => {
			try {
				const outputPath = await exportReport(filePath, kind);
				return { ok: true, path: outputPath };
			} catch (err) {
				return { ok: false, error: err.message };
			}
		},
		pickFile: async () => picked,
		onOpenFile: (callback) => {
			openHandlers.push(callback);
		},
	};
	vm.runInContext(rendererSource, dom.getInternalVMContext());
	await until(() => window.document.querySelector(".row"));
	return {
		window: window,
		document: window.document,
		setPicked: (filePath) => {
			picked = filePath;
		},
		chooseFromMenu: async () => {
			await openHandlers[0]();
		},
		close: () => window.close(),
	};
}

test("opening a source file fills the metrics panel and writes both reports", async () => {
	const dirs = fixture();
	const app = await boot(dirs.project);
	const document = app.document;
	try {
		assert.strictEqual(document.getElementById("cwd").textContent, dirs.project);
		assert.strictEqual(document.getElementById("export-html").disabled, true);
		assert.ok(rowNamed(document, "Sample.java").classList.contains("kind-source"));
		assert.ok(!rowNamed(document, "notes.txt").classList.contains("kind-source"));

		click(rowNamed(document, "Sample.java"));
		await until(() => document.getElementById("program-length").value === "5.0");

		assert.strictEqual(document.getElementById("name").value, "Sample.java");
		assert.strictEqual(document.getElementById("program-vocabulary").value, "5.0");
		assert.strictEqual(document.getElementById("volume").value, "11.61");
		assert.strictEqual(document.getElementById("difficulty").value, "1.5");
		assert.strictEqual(document.getElementById("export-html").disabled, false);
		assert.strictEqual(document.getElementById("export-pdf").disabled, false);
		assert.match(document.getElementById("code").textContent, /int x=1;/);
		assert.ok(rowNamed(document, "Sample.java").classList.contains("selected"));

		click(document.getElementById("export-html"));
		await until(() => document.getElementById("status").textContent.startsWith("Wrote "));
		const htmlStatus = document.getElementById("status").textContent;
		assert.match(htmlStatus, /Sample\.html$/);
		assert.match(fs.readFileSync(path.join(dirs.project, "Sample.html"), "utf8"), /Halstead Metrics Detailed Report/);
		assert.match(fs.readFileSync(path.join(dirs.project, "Sample.html"), "utf8"), /Volume<\/th><td>11\.61<\/td>/);

		click(document.getElementById("export-pdf"));
		await until(() => document.getElementById("status").textContent.includes("Sample.pdf"));
		assert.strictEqual(
			fs.readFileSync(path.join(dirs.project, "Sample.pdf")).subarray(0, 5).toString(),
			"%PDF-"
		);
		assert.strictEqual(document.getElementById("export-html").disabled, false);

		click(rowNamed(document, "notes.txt"));
		await until(() => document.getElementById("status").textContent.includes("Select a .java"));
		assert.strictEqual(document.getElementById("name").value, "notes.txt");
		assert.strictEqual(document.getElementById("program-length").value, "");
		assert.strictEqual(document.getElementById("export-pdf").disabled, true);
		assert.match(document.getElementById("code").textContent, /No source to show/);
	} finally {
		app.close();
	}
});

test("the file tree expands folders and Up moves to the parent directory", async () => {
	const dirs = fixture();
	const app = await boot(dirs.project);
	const document = app.document;
	try {
		click(rowNamed(document, "nested"));
		await until(() => rowNamed(document, "Inner.java"));
		assert.strictEqual(rowNamed(document, "nested").querySelector(".twist").textContent, "\u25be");

		click(rowNamed(document, "Inner.java"));
		await until(() => document.getElementById("name").value === "Inner.java");
		assert.strictEqual(document.getElementById("program-length").value, "5.0");
		assert.match(document.getElementById("code").textContent, /int y=2;/);

		click(document.getElementById("up"));
		await until(() => document.getElementById("cwd").textContent === dirs.base);
		assert.ok(rowNamed(document, "project"));
		assert.strictEqual(rowNamed(document, "Sample.java"), null);
	} finally {
		app.close();
	}
});

test("File Open selects the picked source and shows its metrics", async () => {
	const dirs = fixture();
	const app = await boot(dirs.base);
	const document = app.document;
	try {
		await until(() => rowNamed(document, "project"));
		const picked = path.join(dirs.project, "Sample.java");
		app.setPicked(picked);
		await app.chooseFromMenu();
		await until(() => document.getElementById("name").value === "Sample.java");
		assert.strictEqual(document.getElementById("cwd").textContent, dirs.project);
		assert.strictEqual(document.getElementById("volume").value, "11.61");
		assert.ok(rowNamed(document, "Sample.java").classList.contains("selected"));

		app.setPicked(null);
		const cwd = document.getElementById("cwd").textContent;
		await app.chooseFromMenu();
		assert.strictEqual(document.getElementById("cwd").textContent, cwd);
	} finally {
		app.close();
	}
});
