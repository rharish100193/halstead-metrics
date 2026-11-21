"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const {
	activate,
	createSession,
	exportCurrent,
	goUp,
	move,
	openAt,
	rows,
	startPrompt,
	submitPrompt,
	typePrompt,
} = require("../../lib/session");

function fixture() {
	const base = fs.mkdtempSync(path.join(os.tmpdir(), "halstead-tui-app-"));
	const project = path.join(base, "project");
	fs.mkdirSync(path.join(project, "nested"), { recursive: true });
	fs.writeFileSync(path.join(project, "Sample.java"), "int x=1;\n");
	fs.writeFileSync(path.join(project, "notes.txt"), "hello");
	fs.writeFileSync(path.join(project, "nested", "Inner.java"), "int y=2;\n");
	return { base: base, project: project };
}

function rowNamed(session, name) {
	return rows(session).find((row) => !row.note && row.node.entry.name === name);
}

test("opening a source file fills the metrics and writes both reports", async () => {
	const dirs = fixture();
	const session = createSession(dirs.project);
	assert.strictEqual(session.directory, dirs.project);
	assert.ok(rowNamed(session, "Sample.java"));
	assert.ok(rowNamed(session, "nested").node.entry.isDirectory);
	assert.strictEqual(session.filePath, null);

	const sample = rows(session).findIndex((row) => row.node.entry.name === "Sample.java");
	move(session, sample - session.cursor);
	activate(session);
	assert.strictEqual(session.file.name, "Sample.java");
	assert.strictEqual(session.file.fields.programLength, "5.0");
	assert.strictEqual(session.file.fields.programVocabulary, "5.0");
	assert.strictEqual(session.file.fields.volume, "11.61");
	assert.strictEqual(session.file.fields.difficulty, "1.5");
	assert.ok(session.file.lines[0].some((token) => token.text === "int"));

	await exportCurrent(session, "html");
	assert.match(session.status, /Sample\.html$/);
	const htmlReport = fs.readFileSync(path.join(dirs.project, "Sample.html"), "utf8");
	assert.match(htmlReport, /Halstead Metrics Detailed Report/);
	assert.match(htmlReport, /Volume<\/th><td>11\.61<\/td>/);

	await exportCurrent(session, "pdf");
	assert.match(session.status, /Sample\.pdf$/);
	assert.strictEqual(
		fs.readFileSync(path.join(dirs.project, "Sample.pdf")).subarray(0, 5).toString(),
		"%PDF-"
	);

	const notes = rows(session).findIndex((row) => row.node.entry.name === "notes.txt");
	move(session, notes - session.cursor);
	activate(session);
	assert.strictEqual(session.file.name, "notes.txt");
	assert.strictEqual(session.file.fields, null);
	assert.strictEqual(session.filePath, null);
	assert.match(session.status, /not available/);
	assert.strictEqual(session.file.lines[0][0].text, "hello");
});

test("the file tree expands folders and Up moves to the parent directory", () => {
	const dirs = fixture();
	const session = createSession(dirs.project);
	const nested = rows(session).findIndex((row) => row.node.entry.name === "nested");
	move(session, nested - session.cursor);
	activate(session);
	assert.strictEqual(rowNamed(session, "nested").node.expanded, true);
	assert.ok(rowNamed(session, "Inner.java"));

	const inner = rows(session).findIndex((row) => row.node.entry.name === "Inner.java");
	move(session, inner - session.cursor);
	activate(session);
	assert.strictEqual(session.file.name, "Inner.java");
	assert.strictEqual(session.file.fields.programLength, "5.0");

	goUp(session);
	assert.strictEqual(session.directory, dirs.base);
	assert.ok(rowNamed(session, "project"));
	assert.strictEqual(rowNamed(session, "Sample.java"), undefined);
});

test("Open path selects the picked source and shows its metrics", () => {
	const dirs = fixture();
	const session = createSession(dirs.base);
	assert.ok(rowNamed(session, "project"));
	const picked = path.join(dirs.project, "Sample.java");
	openAt(session, picked);
	assert.strictEqual(session.directory, dirs.project);
	assert.strictEqual(session.file.name, "Sample.java");
	assert.strictEqual(session.file.fields.volume, "11.61");
	assert.strictEqual(rows(session)[session.cursor].node.entry.name, "Sample.java");

	const cwd = session.directory;
	startPrompt(session);
	submitPrompt(session);
	assert.strictEqual(session.directory, cwd);

	startPrompt(session);
	typePrompt(session, path.join(dirs.project, "missing.java"));
	submitPrompt(session);
	assert.strictEqual(session.status, "Cannot read file.");
	assert.strictEqual(session.directory, cwd);
});
