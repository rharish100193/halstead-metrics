"use strict";

const SOURCE_EXTENSIONS = new Set(["java", "c", "cc", "cpp", "c++"]);

const tree = document.getElementById("tree");
const cwd = document.getElementById("cwd");
const up = document.getElementById("up");
const status = document.getElementById("status");
const code = document.getElementById("code");
const exportHtml = document.getElementById("export-html");
const exportPdf = document.getElementById("export-pdf");

const fields = {
	name: document.getElementById("name"),
	programLength: document.getElementById("program-length"),
	programVocabulary: document.getElementById("program-vocabulary"),
	estimatedLength: document.getElementById("estimated-length"),
	purityRatio: document.getElementById("purity-ratio"),
	volume: document.getElementById("volume"),
	difficulty: document.getElementById("difficulty"),
	programEffort: document.getElementById("program-effort"),
	programmingTime: document.getElementById("programming-time"),
};

let root = "";
let currentFile = null;
let selectedRow = null;

function setStatus(message, isError) {
	status.textContent = message || "";
	status.classList.toggle("error", Boolean(isError));
}

function clearMetrics() {
	fields.programLength.value = "";
	fields.programVocabulary.value = "";
	fields.estimatedLength.value = "";
	fields.purityRatio.value = "";
	fields.volume.value = "";
	fields.difficulty.value = "";
	fields.programEffort.value = "";
	fields.programmingTime.value = "";
	exportHtml.disabled = true;
	exportPdf.disabled = true;
}

function showCode(lines) {
	if (!lines || lines.length === 0) {
		code.innerHTML = "<div class=\"empty-code\">No source to show.</div>";
		return;
	}
	const html = [];
	for (let i = 0; i < lines.length; i += 1) {
		html.push(
			"<div class=\"line\"><span class=\"ln\">" + (i + 1) + "</span><span class=\"lc\">"
			+ (lines[i] || " ") + "</span></div>"
		);
	}
	code.innerHTML = html.join("");
}

function extensionOf(name) {
	const dot = name.lastIndexOf(".");
	return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function markSelected(row) {
	if (selectedRow) {
		selectedRow.classList.remove("selected");
	}
	selectedRow = row;
	if (row) {
		row.classList.add("selected");
	}
}

async function openPath(filePath) {
	const result = await window.halstead.openFile(filePath);
	if (!result.ok) {
		currentFile = null;
		fields.name.value = "";
		clearMetrics();
		showCode([]);
		setStatus(result.error || "Cannot read file.", true);
		return;
	}
	const file = result.file;
	fields.name.value = file.name;
	if (!file.supported) {
		currentFile = null;
		clearMetrics();
		showCode([]);
		setStatus("Select a .java, .c, .cc, .cpp, or .c++ file.");
		return;
	}
	currentFile = filePath;
	showCode(file.lines);
	if (!file.fields) {
		clearMetrics();
		setStatus(file.error || "Could not calculate metrics.", true);
		return;
	}
	fields.programLength.value = file.fields.programLength;
	fields.programVocabulary.value = file.fields.programVocabulary;
	fields.estimatedLength.value = file.fields.estimatedLength;
	fields.purityRatio.value = file.fields.purityRatio;
	fields.volume.value = file.fields.volume;
	fields.difficulty.value = file.fields.difficulty;
	fields.programEffort.value = file.fields.programEffort;
	fields.programmingTime.value = file.fields.programmingTime;
	exportHtml.disabled = false;
	exportPdf.disabled = false;
	setStatus("");
}

async function toggleDirectory(item, row) {
	const child = item.querySelector(":scope > .children");
	if (item.dataset.loaded === "1") {
		child.hidden = !child.hidden;
		row.querySelector(".twist").textContent = child.hidden ? "\u25b8" : "\u25be";
		return;
	}
	item.dataset.loaded = "1";
	const listed = await window.halstead.listDir(row.dataset.path);
	if (!listed.ok) {
		const note = document.createElement("div");
		note.className = "note";
		note.textContent = listed.error;
		child.appendChild(note);
	} else if (listed.entries.length === 0) {
		const note = document.createElement("div");
		note.className = "note";
		note.textContent = "Empty";
		child.appendChild(note);
	} else {
		child.appendChild(buildList(listed.entries));
	}
	child.hidden = false;
	row.querySelector(".twist").textContent = "\u25be";
}

function buildList(entries) {
	const list = document.createElement("ul");
	for (let i = 0; i < entries.length; i += 1) {
		const entry = entries[i];
		const item = document.createElement("li");
		const row = document.createElement("div");
		row.className = "row";
		row.dataset.path = entry.path;
		const twist = document.createElement("span");
		twist.className = "twist";
		twist.textContent = entry.isDirectory ? "\u25b8" : "";
		const label = document.createElement("span");
		label.className = "label";
		label.textContent = entry.name;
		if (!entry.isDirectory && SOURCE_EXTENSIONS.has(extensionOf(entry.name))) {
			row.classList.add("kind-source");
		}
		row.appendChild(twist);
		row.appendChild(label);
		row.addEventListener("click", () => {
			markSelected(row);
			if (entry.isDirectory) {
				toggleDirectory(item, row);
				return;
			}
			openPath(entry.path);
		});
		item.appendChild(row);
		if (entry.isDirectory) {
			const child = document.createElement("div");
			child.className = "children";
			child.hidden = true;
			item.appendChild(child);
		}
		list.appendChild(item);
	}
	return list;
}

async function showDirectory(dirPath, selectPath) {
	root = dirPath;
	cwd.textContent = root;
	cwd.title = root;
	const parent = await window.halstead.parent(root);
	up.disabled = parent === root;
	const listed = await window.halstead.listDir(root);
	tree.innerHTML = "";
	selectedRow = null;
	if (!listed.ok) {
		const note = document.createElement("div");
		note.className = "note";
		note.textContent = listed.error;
		tree.appendChild(note);
		return;
	}
	tree.appendChild(buildList(listed.entries));
	if (!selectPath) {
		return;
	}
	const rows = tree.querySelectorAll(".row");
	for (let i = 0; i < rows.length; i += 1) {
		if (rows[i].dataset.path === selectPath) {
			markSelected(rows[i]);
			rows[i].scrollIntoView({ block: "nearest" });
			break;
		}
	}
	await openPath(selectPath);
}

async function exportCurrent(kind) {
	if (!currentFile) {
		return;
	}
	exportHtml.disabled = true;
	exportPdf.disabled = true;
	setStatus(kind === "pdf" ? "Writing PDF report..." : "Writing HTML report...");
	const result = await window.halstead.exportReport(currentFile, kind);
	exportHtml.disabled = false;
	exportPdf.disabled = false;
	if (!result.ok) {
		setStatus(result.error || "Could not write the report.", true);
		return;
	}
	setStatus("Wrote " + result.path + (result.warning ? " (" + result.warning + ")" : ""));
}

up.addEventListener("click", async () => {
	const parent = await window.halstead.parent(root);
	if (parent !== root) {
		await showDirectory(parent);
	}
});

exportHtml.addEventListener("click", () => exportCurrent("html"));
exportPdf.addEventListener("click", () => exportCurrent("pdf"));

window.halstead.onOpenFile(async () => {
	const picked = await window.halstead.pickFile();
	if (!picked) {
		return;
	}
	const directory = picked.slice(0, picked.length - picked.split(/[/\\]/).pop().length);
	const parent = directory.replace(/[/\\]$/, "") || directory;
	await showDirectory(parent, picked);
});

window.halstead.home().then((home) => showDirectory(home));
