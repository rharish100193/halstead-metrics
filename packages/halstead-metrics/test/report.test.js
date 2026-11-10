"use strict";

const assert = require("assert");
const test = require("node:test");

const { analyzeSource } = require("../src/analyze");
const { renderHtmlReport, renderPdfReport, reportBaseName } = require("../src/report");

test("names the report from the stem before the first dot", () => {
	assert.strictEqual(reportBaseName("/tmp/Sample.java"), "Sample");
	assert.strictEqual(reportBaseName("foo.bar.cpp"), "foo");
	assert.strictEqual(reportBaseName("Makefile"), "Makefile");
});

test("html report lists operators, operands, and rounded values", () => {
	const metrics = analyzeSource("int x=1;", "java");
	const html = renderHtmlReport(metrics, "Sample.java");
	assert.match(html, /Halstead Metrics Detailed Report/);
	assert.match(html, /File Name: <\/h3>Sample\.java/);
	assert.match(html, /<td>int<\/td><td>1<\/td>/);
	assert.match(html, /<td>x<\/td><td>1<\/td>/);
	assert.match(html, /No of Distinct Operators\(n1\)<\/th><td>3\.0<\/td>/);
	assert.match(html, /Program Length<\/th><td>5\.0<\/td>/);
	assert.match(html, /Volume<\/th><td>11\.61<\/td>/);
	assert.match(html, /Programming Time<\/th><td>0\.97<\/td>/);
	assert.match(html, /Copyright &copy; Harish Ramasubramanian/);
});

test("html report escapes operator names", () => {
	const metrics = analyzeSource("a<b;", "java");
	const html = renderHtmlReport(metrics, "Cmp.java");
	assert.match(html, /<td>&lt;<\/td><td>1<\/td>/);
	assert.ok(!html.includes("<td><</td>"));
});

test("pdf report is a document that names the source file", async () => {
	const metrics = analyzeSource("int x=1;", "java");
	const pdf = await renderPdfReport(metrics, "Sample.java");
	assert.ok(Buffer.isBuffer(pdf));
	assert.ok(pdf.subarray(0, 5).toString() === "%PDF-");
	const text = pdf.toString("latin1");
	assert.match(text, /Sample\.java/);
	assert.match(text, /Halstead Metrics Analysis Report/);
});
