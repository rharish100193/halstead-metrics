"use strict";

const assert = require("assert");
const test = require("node:test");

const { bumpVersion } = require("./bump-release-version");

test("bumps each semver component and resets the lower ones", () => {
	assert.strictEqual(bumpVersion("1.0.1", "patch"), "1.0.2");
	assert.strictEqual(bumpVersion("1.2.3", "minor"), "1.3.0");
	assert.strictEqual(bumpVersion("1.2.3", "major"), "2.0.0");
});
