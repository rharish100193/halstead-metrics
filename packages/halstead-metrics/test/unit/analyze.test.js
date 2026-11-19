"use strict";

const assert = require("assert");
const test = require("node:test");

const { analyzeSource, reportSource } = require("../../src/analyze");
const { tokenizeGeneric } = require("../../src/genericLexer");
const { keywordsForExtension, languageForExtension } = require("../../src/keywords");
const { getModernLanguage } = require("../../src/languages");
const { formatRounded, roundTo2Decimals } = require("../../src/metrics");

test("rounds half-even to two decimals", () => {
	assert.strictEqual(roundTo2Decimals(1.225), 1.22);
	assert.strictEqual(roundTo2Decimals(1.235), 1.24);
	assert.strictEqual(roundTo2Decimals(2), 2);
	assert.strictEqual(roundTo2Decimals(Number.POSITIVE_INFINITY), null);
	assert.strictEqual(formatRounded(5), "5.0");
	assert.strictEqual(formatRounded(11.609), "11.61");
	assert.strictEqual(formatRounded(Number.NaN), "");
});

test("maps extensions onto a language and a keyword list", () => {
	assert.strictEqual(languageForExtension("JAVA"), "java");
	assert.strictEqual(languageForExtension("c++"), "cpp");
	assert.strictEqual(languageForExtension("cc"), "cpp");
	assert.strictEqual(languageForExtension("txt"), null);
	assert.ok(keywordsForExtension("java").has("class"));
	assert.ok(keywordsForExtension("cpp").has("class"));
	assert.ok(keywordsForExtension("cc").has("class"));
	assert.ok(keywordsForExtension("js").has("const"));
	assert.strictEqual(keywordsForExtension("txt"), null);
});

test("rejects an unsupported extension before tokenizing", () => {
	assert.throws(() => analyzeSource("int x;", "txt"), /Unsupported extension: txt/);
});

test("classifies a Java statement from keywords and operators", () => {
	const report = reportSource("int x=1;", "java", "Sample.java");
	const halstead = report.Halstead;
	assert.strictEqual(report.filename, "Sample.java");
	assert.strictEqual(halstead.n1, 3);
	assert.strictEqual(halstead.n2, 2);
	assert.strictEqual(halstead.N1, 3);
	assert.strictEqual(halstead.N2, 2);
	assert.strictEqual(halstead.Length, 5);
	assert.strictEqual(halstead.Vocabulary, 5);
	assert.strictEqual(halstead.Difficulty, 1.5);
	assert.deepStrictEqual(halstead._Operators, {
		int: "1",
		";": "1",
		"=": "1",
	});
	assert.deepStrictEqual(halstead._Operands, {
		x: "1",
		1: "1",
	});
	assert.strictEqual(halstead["Estimated program length"], 6.75);
	assert.strictEqual(halstead.Volume, 11.61);
	assert.strictEqual(halstead.Effort, 17.41);
	assert.strictEqual(halstead["Programming time"], 0.97);
	assert.strictEqual(halstead["Purity ratio"], 1.35);
});

test("counts a string once and keeps parentheses as operands", () => {
	const metrics = analyzeSource("f(\"hi\");", "java");
	assert.deepStrictEqual(Object.fromEntries(metrics.operators.entries()), {
		";": 1,
		"( )": 1,
	});
	assert.deepStrictEqual(Object.fromEntries(metrics.operands.entries()), {
		"\"hi\"": 1,
		f: 1,
		"(": 1,
		")": 1,
	});
});

test("keeps ++ as one operator and ignores comments", () => {
	const tokens = tokenizeGeneric("x++; // comment\n/* block */ y--;", getModernLanguage("java"));
	assert.deepStrictEqual(tokens, ["x", "++", ";", "y", "--", ";", "<EOF>"]);
});

test("does not split floating point literals on the dot operator", () => {
	const tokens = tokenizeGeneric("n = 1.5 + .25;", getModernLanguage("c"));
	assert.deepStrictEqual(tokens, ["n", "=", "1.5", "+", ".25", ";", "<EOF>"]);
});

test("skips C preprocessor lines and still lexes the function", () => {
	const source = "#include <stdio.h>\nint main() { return 0; }\n";
	const tokens = tokenizeGeneric(source, getModernLanguage("c"));
	assert.ok(!tokens.some((token) => token.includes("include") || token.includes("stdio")));
	const metrics = analyzeSource(source, "c");
	assert.ok(metrics.operators.has("int"));
	assert.ok(metrics.operators.has("return"));
	assert.ok(metrics.operators.has("{ }"));
	assert.ok(metrics.operators.has("( )"));
});

test("treats C++ keywords as operators for .cc and .c++", () => {
	const cpp = analyzeSource("class T {};", "cpp");
	const cc = analyzeSource("class T {};", "cc");
	assert.ok(cpp.operators.has("class"));
	assert.ok(cc.operators.has("class"));
	assert.ok(!cc.operands.has("class"));
});
