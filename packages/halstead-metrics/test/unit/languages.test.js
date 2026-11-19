"use strict";

const assert = require("assert");
const test = require("node:test");

const { analyzeSource } = require("../../src/analyze");
const { SUPPORTED_EXTENSIONS } = require("../../src/keywords");

test("scores JavaScript, Python, Go, Rust, and SQL with their keywords", () => {
	const javascript = analyzeSource("const n = 1; // hidden\n", "js");
	assert.ok(javascript.operators.has("const"));
	assert.ok(javascript.operators.has("="));
	assert.ok(javascript.operands.has("n"));
	assert.ok(!javascript.operands.has("hidden"));

	const python = analyzeSource("def f():\n    return x + 1  # note\n", "py");
	assert.ok(python.operators.has("def"));
	assert.ok(python.operators.has("return"));
	assert.ok(python.operands.has("x"));
	assert.ok(!python.operands.has("note"));

	const go = analyzeSource("func main() int {\n\treturn\n}\n", "go");
	assert.ok(go.operators.has("func"));
	assert.ok(go.operators.has("return"));

	const rust = analyzeSource("fn main() {\n    let x = 1;\n}\n", "rs");
	assert.ok(rust.operators.has("fn"));
	assert.ok(rust.operators.has("let"));
	assert.ok(rust.operands.has("x"));

	const sql = analyzeSource("SELECT a FROM t\n", "sql");
	assert.ok(sql.operators.has("select"));
	assert.ok(sql.operators.has("from"));
	assert.ok(sql.operands.has("a"));
	assert.ok(sql.operands.has("t"));
});

test("keeps a Python string together and skips a shell comment", () => {
	const python = analyzeSource("s = 'a+b'\n", "py");
	assert.deepStrictEqual(Object.fromEntries(python.operands.entries())["'a+b'"], 1);
	assert.ok(!python.operators.has("+"));

	const shell = analyzeSource("if true; then\n  echo $1 # nope\nfi\n", "sh");
	assert.ok(shell.operators.has("if"));
	assert.ok(shell.operators.has("then"));
	assert.ok(shell.operators.has("fi"));
	assert.ok(!shell.operands.has("nope"));
});

test("rejects extensions that are not programming languages", () => {
	assert.ok(SUPPORTED_EXTENSIONS.has("py"));
	assert.ok(SUPPORTED_EXTENSIONS.has("ts"));
	assert.ok(SUPPORTED_EXTENSIONS.has("cs"));
	assert.ok(!SUPPORTED_EXTENSIONS.has("txt"));
	assert.throws(() => analyzeSource("hello", "md"), /Unsupported extension: md/);
});
