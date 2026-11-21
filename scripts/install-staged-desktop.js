"use strict";

const { spawnSync } = require("child_process");
const { setTimeout } = require("timers/promises");

const stage = process.env.DESKTOP_STAGE;
if (!stage) {
	console.error("DESKTOP_STAGE is required");
	process.exit(1);
}

async function install() {
	for (let attempt = 1; attempt <= 12; attempt += 1) {
		spawnSync("npm", ["cache", "clean", "--force"], {
			cwd: stage,
			stdio: "inherit",
			shell: process.platform === "win32",
			env: process.env,
		});
		const result = spawnSync("npm", ["install", "--prefer-online", "--no-package-lock", "--no-audit", "--no-fund"], {
			cwd: stage,
			stdio: "inherit",
			shell: process.platform === "win32",
			env: process.env,
		});
		if (result.status === 0) {
			return;
		}
		console.error(`desktop npm install failed (${attempt}/12)`);
		if (attempt === 12) {
			process.exit(result.status || 1);
		}
		await setTimeout(10000);
	}
}

install().catch((error) => {
	console.error(error);
	process.exit(1);
});
