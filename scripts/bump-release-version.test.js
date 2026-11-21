"use strict";

const assert = require("assert");
const test = require("node:test");

const { bumpVersion, shouldBump } = require("./bump-release-version");

test("bumps each semver component and resets the lower ones", () => {
	assert.strictEqual(bumpVersion("1.0.1", "patch"), "1.0.2");
	assert.strictEqual(bumpVersion("1.2.3", "minor"), "1.3.0");
	assert.strictEqual(bumpVersion("1.2.3", "major"), "2.0.0");
});

test("bumps when the version is installable on both packages or was removed", () => {
	const live = { versions: { "1.0.1": {} }, time: { "1.0.1": "2026-11-21T11:35:02.756Z" } };
	const removed = { versions: { "1.0.0": {} }, time: { "1.0.0": "t", "1.0.1": "2026-11-21T11:35:02.756Z" } };
	const fresh = { versions: { "1.0.0": {} }, time: { "1.0.0": "t" } };
	assert.strictEqual(shouldBump("1.0.1", live, live), true);
	assert.strictEqual(shouldBump("1.0.1", removed, removed), true);
	assert.strictEqual(shouldBump("1.0.1", live, removed), true);
	assert.strictEqual(shouldBump("1.0.1", live, fresh), false);
	assert.strictEqual(shouldBump("1.0.1", null, null), false);
});
