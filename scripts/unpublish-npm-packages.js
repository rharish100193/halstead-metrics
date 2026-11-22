"use strict";

const { spawnSync } = require("child_process");

const PACKAGES = ["halstead-metrics-tui", "halstead-metrics-core", "halstead-metrics"];
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * @param {string} version
 * @returns {string[]}
 */
function specsFor(version) {
	if (!VERSION_PATTERN.test(version)) {
		throw new Error(`Refusing to unpublish "${version}". Pass one exact version, such as 1.2.3.`);
	}
	return PACKAGES.map((name) => `${name}@${version}`);
}

function main() {
	const version = process.argv[2] || "";
	const specs = specsFor(version);
	for (const spec of specs) {
		process.stdout.write(`Unpublishing ${spec}\n`);
		const result = spawnSync("npm", ["unpublish", spec, "--force"], {
			encoding: "utf8",
			stdio: ["ignore", "inherit", "inherit"],
		});
		if (result.error) {
			throw result.error;
		}
		if (result.status !== 0) {
			process.exit(result.status === null ? 1 : result.status);
		}
	}
}

if (require.main === module) {
	try {
		main();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}

module.exports = {
	specsFor,
};
