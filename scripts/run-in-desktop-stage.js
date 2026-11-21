"use strict";

const { spawnSync } = require("child_process");

const stage = process.env.DESKTOP_STAGE;
const command = process.argv[2];
const args = process.argv.slice(3);
if (!stage || !command) {
	console.error("Usage: DESKTOP_STAGE=... node scripts/run-in-desktop-stage.js <command> [args...]");
	process.exit(1);
}

const result = spawnSync(command, args, {
	cwd: stage,
	stdio: "inherit",
	shell: process.platform === "win32",
	env: process.env,
});

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
