"use strict";

const assert = require("assert");
const test = require("node:test");

const { highlightLines } = require("../../lib/highlight");

/**
 * @param {Array<{kind: string, text: string}>} tokens
 * @param {string} kind
 * @returns {string}
 */
function textOf(tokens, kind) {
	return tokens.filter((token) => token.kind === kind).map((token) => token.text).join("");
}

test("highlights Java keywords, numbers, and comments", () => {
	const lines = highlightLines("int x = 1; // <note>\n", "java");
	assert.strictEqual(textOf(lines[0], "kw"), "int");
	assert.strictEqual(textOf(lines[0], "nu"), "1");
	assert.strictEqual(textOf(lines[0], "cm"), "// <note>");
	assert.deepStrictEqual(lines[1], []);
});

test("keeps a block comment marked across lines and colors preprocessor lines", () => {
	const block = highlightLines("/* a\nb */\nint x;", "c");
	assert.strictEqual(textOf(block[0], "cm"), "/* a");
	assert.strictEqual(textOf(block[1], "cm"), "b */");
	assert.strictEqual(textOf(block[2], "kw"), "int");

	const directive = highlightLines("#include <stdio.h>\nint x;", "cpp");
	assert.strictEqual(textOf(directive[0], "pp"), "#include <stdio.h>");
	assert.strictEqual(textOf(directive[1], "kw"), "int");
});

test("highlights a Python keyword and its hash comment", () => {
	const lines = highlightLines("def f():  # note\n", "py");
	assert.strictEqual(textOf(lines[0], "kw"), "def");
	assert.strictEqual(textOf(lines[0], "cm"), "# note");
});

test("colors string literals instead of the words inside them", () => {
	const lines = highlightLines("String s = \"class\";", "java");
	assert.strictEqual(textOf(lines[0], "st"), "\"class\"");
	assert.ok(!lines[0].some((token) => token.kind === "kw" && token.text === "class"));
});
