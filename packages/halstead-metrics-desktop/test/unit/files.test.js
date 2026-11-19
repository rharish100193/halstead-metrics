"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { exportReport, listDirectory, readSource } = require("../../lib/files");

test("lists directories first and hides dotfiles", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "halstead-ui-"));
	fs.mkdirSync(path.join(dir, "nested"));
	fs.writeFileSync(path.join(dir, "Sample.java"), "int x=1;\n");
	fs.writeFileSync(path.join(dir, ".hidden.java"), "int y=2;\n");

	const listed = listDirectory(dir);
	assert.deepStrictEqual(listed.map((entry) => entry.name), ["nested", "Sample.java"]);
	assert.strictEqual(listed[0].isDirectory, true);
	assert.strictEqual(listed[1].isDirectory, false);
});

test("reads supported source into fields and refuses other paths", async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "halstead-ui-"));
	const file = path.join(dir, "Sample.java");
	fs.writeFileSync(file, "int x=1;\n");
	fs.writeFileSync(path.join(dir, "notes.txt"), "hello");

	const opened = readSource(file);
	assert.strictEqual(opened.supported, true);
	assert.strictEqual(opened.fields.programLength, "5.0");
	assert.strictEqual(opened.fields.volume, "11.61");
	assert.match(opened.lines[0], /<span class="kw">int<\/span>/);

	const notes = readSource(path.join(dir, "notes.txt"));
	assert.strictEqual(notes.supported, false);
	assert.strictEqual(notes.fields, null);
	assert.deepStrictEqual(notes.lines, ["hello"]);

	const script = path.join(dir, "cli.js");
	fs.writeFileSync(script, "const n = 1;\n");
	const javascript = readSource(script);
	assert.strictEqual(javascript.supported, true);
	assert.strictEqual(javascript.fields.programLength, "5.0");
	assert.match(javascript.lines[0], /<span class="kw">const<\/span>/);

	const missing = readSource(path.join(dir, "Missing.java"));
	assert.strictEqual(missing.supported, true);
	assert.strictEqual(missing.fields, null);
	assert.strictEqual(missing.error, "Cannot read file.");

	await assert.rejects(
		() => exportReport(path.join(dir, "notes.txt"), "html"),
		/Select a supported source file/
	);
});
