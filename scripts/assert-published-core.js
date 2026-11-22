"use strict";

const path = require("path");

const resolved = path.resolve("node_modules", "halstead-metrics");
const installed = require(path.join(resolved, "package.json"));
const expected = process.env.VERSION;
if (installed.version !== expected) {
	console.error(`expected halstead-metrics@${expected}, found ${installed.version}`);
	process.exit(1);
}
const workspaceCopy = `${path.sep}packages${path.sep}halstead-metrics${path.sep}`;
if (resolved.includes(workspaceCopy) || resolved.endsWith(`${path.sep}packages${path.sep}halstead-metrics`)) {
	console.error(`desktop resolved the workspace package at ${resolved}`);
	process.exit(1);
}

console.log(`desktop is using ${installed.name}@${installed.version}`);
