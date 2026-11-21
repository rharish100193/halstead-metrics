"use strict";

const fs = require("fs");
const { spawnSync } = require("child_process");

const PACKAGE_PATHS = [
	"package.json",
	"packages/halstead-metrics/package.json",
	"packages/halstead-metrics-core/package.json",
	"packages/halstead-metrics-desktop/package.json",
	"packages/halstead-metrics-tui/package.json",
];

/**
 * @param {string} version
 * @param {"major"|"minor"|"patch"} level
 * @returns {string}
 */
function bumpVersion(version, level) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
	if (!match) {
		throw new Error(`Cannot bump ${version}`);
	}
	const major = Number(match[1]);
	const minor = Number(match[2]);
	const patch = Number(match[3]);
	if (level === "major") {
		return `${major + 1}.0.0`;
	}
	if (level === "minor") {
		return `${major}.${minor + 1}.0`;
	}
	if (level === "patch") {
		return `${major}.${minor}.${patch + 1}`;
	}
	throw new Error(`Bump level must be major, minor, or patch (got: ${level})`);
}

/**
 * @param {string} name
 * @param {string} version
 * @returns {boolean}
 */
function alreadyPublished(name, version) {
	const result = spawnSync("npm", ["view", `${name}@${version}`, "version"], {
		encoding: "utf8",
	});
	return result.status === 0 && result.stdout.trim() === version;
}

/**
 * @param {string} path
 * @param {string} version
 */
function writeVersion(path, version) {
	const text = fs.readFileSync(path, "utf8");
	const next = text
		.replace(/"version": "[^"]+"/, `"version": "${version}"`)
		.replace(/"halstead-metrics": "[^"]+"/, `"halstead-metrics": "${version}"`);
	fs.writeFileSync(path, next);
}

function main() {
	const level = process.argv[2] || "patch";
	const library = JSON.parse(fs.readFileSync("packages/halstead-metrics/package.json", "utf8"));
	const current = library.version;
	const next = alreadyPublished(library.name, current) ? bumpVersion(current, level) : current;
	if (next !== current) {
		for (const path of PACKAGE_PATHS) {
			writeVersion(path, next);
		}
		process.stdout.write(`Bumped ${current} to ${next}\n`);
	} else {
		process.stdout.write(`${current} is not on npm yet, so this run publishes it unchanged\n`);
	}
	if (process.env.GITHUB_ENV) {
		fs.appendFileSync(process.env.GITHUB_ENV, `VERSION=${next}\n`);
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	bumpVersion,
};
