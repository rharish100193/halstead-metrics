"use strict";

const assert = require("assert");
const test = require("node:test");

const { highlightLines } = require("../../lib/highlight");

test("highlights Java keywords and escapes markup in the source view", () => {
	const lines = highlightLines("int x = 1; // <note>\n", "java");
	assert.match(lines[0], /<span class="kw">int<\/span>/);
	assert.match(lines[0], /<span class="nu">1<\/span>/);
	assert.match(lines[0], /<span class="cm">\/\/ &lt;note&gt;<\/span>/);
	assert.strictEqual(lines[1], "");
});

test("keeps a block comment marked across lines and colors preprocessor lines", () => {
	const block = highlightLines("/* a\nb */\nint x;", "c");
	assert.match(block[0], /<span class="cm">\/\* a<\/span>/);
	assert.match(block[1], /<span class="cm">b \*\/<\/span>/);
	assert.match(block[2], /<span class="kw">int<\/span>/);

	const directive = highlightLines("#include <stdio.h>\nint x;", "cpp");
	assert.match(directive[0], /<span class="pp">#include &lt;stdio.h&gt;<\/span>/);
	assert.match(directive[1], /<span class="kw">int<\/span>/);
});

test("colors string literals instead of the words inside them", () => {
	const lines = highlightLines("String s = \"class\";", "java");
	assert.match(lines[0], /<span class="st">"class"<\/span>/);
	assert.ok(!lines[0].includes("<span class=\"kw\">class</span>"));
});
