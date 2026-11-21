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
 * A version npm will not accept again: it is still installable, or it was
 * published before and then removed. Removed versions stay in `time` and
 * `npm view name@version` returns 404 for them.
 * @param {string} version
 * @param {{ versions?: Record<string, unknown>, time?: Record<string, string> } | null} library
 * @param {{ versions?: Record<string, unknown>, time?: Record<string, string> } | null} core
 * @returns {boolean}
 */
function shouldBump(version, library, core) {
	const recorded = (packument) => Boolean(
		packument && ((packument.time && packument.time[version]) || (packument.versions && packument.versions[version]))
	);
	const installable = (packument) => Boolean(packument && packument.versions && packument.versions[version]);
	const libraryRecorded = recorded(library);
	const coreRecorded = recorded(core);
	if (!libraryRecorded && !coreRecorded) {
		return false;
	}
	if (installable(library) && installable(core)) {
		return true;
	}
	return (libraryRecorded && !installable(library)) || (coreRecorded && !installable(core));
}

/**
 * @param {string} name
 * @returns {{ versions?: Record<string, unknown>, time?: Record<string, string> } | null}
 */
function fetchPackument(name) {
	const result = spawnSync("curl", [
		"-fsS",
		"-H", "Accept: application/json",
		"-H", "Cache-Control: no-cache",
		`https://registry.npmjs.org/${encodeURIComponent(name)}`,
	], { encoding: "utf8" });
	if (result.status !== 0) {
		const detail = `${result.stderr || ""}${result.stdout || ""}`;
		if (detail.includes("404")) {
			return null;
		}
		throw new Error(`Failed to read ${name} from npm: ${detail}`);
	}
	return JSON.parse(result.stdout);
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
	const core = JSON.parse(fs.readFileSync("packages/halstead-metrics-core/package.json", "utf8"));
	const current = library.version;
	const next = shouldBump(
		current,
		fetchPackument(library.name),
		fetchPackument(core.name),
	) ? bumpVersion(current, level) : current;
	if (next !== current) {
		for (const path of PACKAGE_PATHS) {
			writeVersion(path, next);
		}
		process.stdout.write(`Bumped ${current} to ${next}\n`);
	} else {
		process.stdout.write(`${current} is not taken on npm yet, so this run publishes it unchanged\n`);
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
	shouldBump,
};
