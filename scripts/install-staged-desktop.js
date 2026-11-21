"use strict";

const { spawnSync } = require("child_process");
const { setTimeout } = require("timers/promises");

const stage = process.env.DESKTOP_STAGE;
if (!stage) {
	console.error("DESKTOP_STAGE is required");
	process.exit(1);
}

async function install() {
	for (let attempt = 1; attempt <= 18; attempt += 1) {
		const result = spawnSync("npm", ["install", "--no-package-lock", "--no-audit", "--no-fund"], {
			cwd: stage,
			stdio: "inherit",
			shell: process.platform === "win32",
			env: process.env,
		});
		if (result.status === 0) {
			return;
		}
		console.error(`desktop npm install failed (${attempt}/18)`);
		if (attempt === 18) {
			process.exit(result.status || 1);
		}
		await setTimeout(10000);
	}
}

install().catch((error) => {
	console.error(error);
	process.exit(1);
});
