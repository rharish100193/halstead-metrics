"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const { analyzeFile } = require("../../src/analyze");
const { roundTo2Decimals } = require("../../src/metrics");
const { renderHtmlReport, renderPdfReport } = require("../../src/report");

const examples = path.resolve(__dirname, "../../../../examples");

/**
 * @param {Buffer} pdf
 * @returns {string}
 */
function pdfText(pdf) {
	const raw = pdf.toString("latin1");
	let decoded = "";
	const hex = /<([0-9A-Fa-f]+)>/g;
	let match = hex.exec(raw);
	while (match) {
		for (let i = 0; i < match[1].length; i += 2) {
			decoded += String.fromCharCode(parseInt(match[1].slice(i, i + 2), 16));
		}
		match = hex.exec(raw);
	}
	return decoded;
}

const EXPECTED = {
	"Sample.java": {
		extension: "java",
		n1: 12,
		n2: 17,
		length: 34,
		vocabulary: 29,
		volume: 165.17,
		effort: 991.03,
		time: 55.06,
		operator: "public",
	},
	"hello.c": {
		extension: "c",
		n1: 9,
		n2: 11,
		length: 24,
		vocabulary: 20,
		volume: 103.73,
		effort: 466.77,
		time: 25.93,
		operator: "return",
	},
	"hello.cpp": {
		extension: "cpp",
		n1: 9,
		n2: 12,
		length: 26,
		vocabulary: 21,
		volume: 114.2,
		effort: 513.9,
		time: 28.55,
		operator: "return",
	},
};

test("example sources produce the same metrics in JSON, HTML, and PDF", async () => {
	const names = Object.keys(EXPECTED);
	for (let i = 0; i < names.length; i += 1) {
		const name = names[i];
		const expected = EXPECTED[name];
		const filePath = path.join(examples, name);
		const source = fs.readFileSync(filePath, "utf8");
		const metrics = analyzeFile(filePath, expected.extension);
		assert.strictEqual(metrics.n1, expected.n1, name);
		assert.strictEqual(metrics.n2, expected.n2, name);
		assert.strictEqual(metrics.length, expected.length, name);
		assert.strictEqual(metrics.vocabulary, expected.vocabulary, name);
		assert.strictEqual(roundTo2Decimals(metrics.volume), expected.volume, name);
		assert.strictEqual(roundTo2Decimals(metrics.effort), expected.effort, name);
		assert.strictEqual(roundTo2Decimals(metrics.programmingTime), expected.time, name);
		assert.ok(metrics.operators.has(expected.operator), name);
		assert.ok(!metrics.operands.has("include"), name + " keeps preprocessor lines out");

		const html = renderHtmlReport(metrics, name);
		assert.match(html, new RegExp("File Name: </h3>" + name.replace(".", "\\.")));
		assert.match(html, new RegExp("Program Length</th><td>" + expected.length.toFixed(1)));
		assert.match(html, new RegExp("Volume</th><td>" + expected.volume));
		assert.match(html, new RegExp("<td>" + expected.operator + "</td>"));

		const pdf = await renderPdfReport(metrics, filePath);
		const text = pdfText(pdf);
		assert.strictEqual(pdf.subarray(0, 5).toString(), "%PDF-");
		assert.match(text, new RegExp(name.replace(".", "\\.")));
		assert.match(text, new RegExp(String(expected.volume)));
		assert.match(text, new RegExp(String(expected.effort)));
		assert.ok(source.length > 0);
	}
});
