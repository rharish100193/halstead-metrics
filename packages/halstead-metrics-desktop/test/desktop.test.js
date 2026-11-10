"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { highlightLines } = require("../lib/highlight");
const { exportReport, listDirectory, readSource } = require("../lib/files");

test("highlights Java keywords and escapes markup in the source view", () => {
	const lines = highlightLines("int x = 1; // <note>\n", "java");
	assert.match(lines[0], /<span class="kw">int<\/span>/);
	assert.match(lines[0], /<span class="cm">\/\/ &lt;note&gt;<\/span>/);
	assert.match(lines[1], /^$/);
});

test("reads a source file into metric fields and exports both reports", async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "halstead-ui-"));
	fs.mkdirSync(path.join(dir, "nested"));
	const file = path.join(dir, "Sample.java");
	fs.writeFileSync(file, "int x=1;\n");

	const listed = listDirectory(dir);
	assert.deepStrictEqual(listed.map((entry) => entry.name), ["nested", "Sample.java"]);
	assert.strictEqual(listed[0].isDirectory, true);

	const opened = readSource(file);
	assert.strictEqual(opened.supported, true);
	assert.strictEqual(opened.fields.programLength, "5.0");
	assert.strictEqual(opened.fields.volume, "11.61");
	assert.match(opened.lines[0], /<span class="kw">int<\/span>/);

	const htmlPath = await exportReport(file, "html");
	const pdfPath = await exportReport(file, "pdf");
	assert.strictEqual(htmlPath, path.join(dir, "Sample.html"));
	assert.strictEqual(pdfPath, path.join(dir, "Sample.pdf"));
	assert.match(fs.readFileSync(htmlPath, "utf8"), /Halstead Metrics Detailed Report/);
	assert.strictEqual(fs.readFileSync(pdfPath).subarray(0, 5).toString(), "%PDF-");

	const other = readSource(path.join(dir, "nested"));
	assert.strictEqual(other.supported, false);
});
