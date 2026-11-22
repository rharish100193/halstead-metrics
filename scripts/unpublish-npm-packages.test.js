"use strict";

const assert = require("assert");
const test = require("node:test");

const { specsFor } = require("./unpublish-npm-packages");

test("unpublishes the CLI before the library at one exact version", () => {
	assert.deepStrictEqual(specsFor("1.2.0"), [
		"halstead-metrics-tui@1.2.0",
		"halstead-metrics-core@1.2.0",
		"halstead-metrics@1.2.0",
	]);
	assert.deepStrictEqual(specsFor("0.0.0-stage"), [
		"halstead-metrics-tui@0.0.0-stage",
		"halstead-metrics-core@0.0.0-stage",
		"halstead-metrics@0.0.0-stage",
	]);
});

test("rejects a version that could select more than one release", () => {
	for (const version of ["", "*", "latest", "1.2", "1.2.3 ", "1.2.3;rm", "@1.2.3"]) {
		assert.throws(() => specsFor(version), /Refusing to unpublish/);
	}
});
