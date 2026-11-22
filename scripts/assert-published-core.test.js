"use strict";

const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const script = path.join(__dirname, "assert-published-core.js");

function installFakePackage(root, version) {
	const directory = path.join(root, "node_modules", "halstead-metrics");
	fs.mkdirSync(directory, { recursive: true });
	fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({
		name: "halstead-metrics",
		version,
	}));
}

test("reads the package installed in the working directory", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "assert-core-"));
	installFakePackage(root, "1.0.2");
	const result = spawnSync(process.execPath, [script], {
		cwd: root,
		env: { ...process.env, VERSION: "1.0.2" },
		encoding: "utf8",
	});
	assert.strictEqual(result.status, 0, result.stderr);
	assert.match(result.stdout, /halstead-metrics@1\.0\.2/);
});
