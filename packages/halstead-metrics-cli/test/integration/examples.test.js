"use strict";

const assert = require("assert");
const path = require("path");
const test = require("node:test");

const { main } = require("../../src/cli");

const examples = path.resolve(__dirname, "../../../../examples");

test("cli reports the checked-in Java, C, and C++ examples", () => {
	const expected = {
		"Sample.java": { n1: 12, Length: 34, Volume: 165.17 },
		"hello.c": { n1: 8, Length: 24, Volume: 103.73 },
		"hello.cpp": { n1: 7, Length: 24, Volume: 105.42 },
	};
	const names = Object.keys(expected);
	for (let i = 0; i < names.length; i += 1) {
		const name = names[i];
		const filePath = path.join(examples, name);
		const lines = [];
		const errors = [];
		const code = main([filePath], {
			log: (line) => lines.push(line),
			error: (line) => errors.push(line),
		});
		assert.strictEqual(code, 0, name);
		assert.deepStrictEqual(errors, []);
		const report = JSON.parse(lines[0]);
		assert.strictEqual(report.filename, filePath);
		assert.strictEqual(report.Halstead.n1, expected[name].n1);
		assert.strictEqual(report.Halstead.Length, expected[name].Length);
		assert.strictEqual(report.Halstead.Volume, expected[name].Volume);
	}
});
