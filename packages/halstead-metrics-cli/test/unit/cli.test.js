"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { main } = require("../../src/cli");

test("cli writes JSON for a source file and rejects other paths", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "halstead-"));
	const file = path.join(dir, "A.java");
	fs.writeFileSync(file, "int x=1;\n");
	const lines = [];
	const code = main([file], { log: (line) => lines.push(line), error: () => {} });
	assert.strictEqual(code, 0);
	const parsed = JSON.parse(lines[0]);
	assert.strictEqual(parsed.filename, file);
	assert.strictEqual(parsed.Halstead.n1, 3);

	const help = [];
	assert.strictEqual(main(["--help"], { log: (line) => help.push(line) }), 1);
	assert.match(help[0], /halstead <path name>/);

	const missing = [];
	assert.strictEqual(main(["no-such-file.java"], { log: (line) => missing.push(line) }), 2);
	assert.match(missing[0], /Cannot read file:/);

	const text = path.join(dir, "notes.txt");
	fs.writeFileSync(text, "hello");
	const bad = [];
	assert.strictEqual(main([text], { log: (line) => bad.push(line) }), 3);
	assert.match(bad[0], /Check the path you inserted:/);
});
