"use strict";

const fs = require("fs");
const path = require("path");

const APP_FILES = ["main.js", "preload.js", "renderer.js", "index.html", "styles.css", "package.json"];
const INSTALLER_EXTENSIONS = new Set([".AppImage", ".deb", ".dmg", ".zip", ".exe"]);

function stageDesktop({ version, workspace, runnerTemp }) {
	if (!version || !workspace || !runnerTemp) {
		throw new Error("version, workspace, and runnerTemp are required");
	}

	const source = path.join(workspace, "packages", "halstead-metrics-desktop");
	const stage = path.join(runnerTemp, "halstead-desktop");
	fs.rmSync(stage, { recursive: true, force: true });
	fs.mkdirSync(stage, { recursive: true });

	for (const file of APP_FILES) {
		fs.copyFileSync(path.join(source, file), path.join(stage, file));
	}
	fs.cpSync(path.join(source, "lib"), path.join(stage, "lib"), { recursive: true });

	const packagePath = path.join(stage, "package.json");
	const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
	manifest.version = version;
	manifest.dependencies = manifest.dependencies || {};
	manifest.dependencies["halstead-metrics"] = version;
	fs.writeFileSync(packagePath, JSON.stringify(manifest, null, 2) + "\n");
	return stage;
}

function collectInstallers({ stage, runnerTemp }) {
	if (!stage || !runnerTemp) {
		throw new Error("stage and runnerTemp are required");
	}

	const output = path.join(runnerTemp, "installers");
	fs.rmSync(output, { recursive: true, force: true });
	fs.mkdirSync(output, { recursive: true });

	const dist = path.join(stage, "dist");
	const copied = [];
	for (const entry of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile() || !INSTALLER_EXTENSIONS.has(path.extname(entry.name))) {
			continue;
		}
		const parent = entry.parentPath || entry.path;
		fs.copyFileSync(path.join(parent, entry.name), path.join(output, entry.name));
		copied.push(entry.name);
	}

	if (copied.length === 0) {
		throw new Error(`No installers found in ${dist}`);
	}
	return copied.sort();
}

function readEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is required`);
	}
	return value;
}

if (require.main === module) {
	const command = process.argv[2];
	if (command === "stage") {
		const stage = stageDesktop({
			version: readEnv("VERSION"),
			workspace: readEnv("GITHUB_WORKSPACE"),
			runnerTemp: readEnv("RUNNER_TEMP"),
		});
		fs.appendFileSync(readEnv("GITHUB_ENV"), `DESKTOP_STAGE=${stage}\n`);
		process.stdout.write(`Staged desktop at ${stage}\n`);
	} else if (command === "collect") {
		const copied = collectInstallers({
			stage: readEnv("DESKTOP_STAGE"),
			runnerTemp: readEnv("RUNNER_TEMP"),
		});
		process.stdout.write(copied.join("\n") + "\n");
	} else {
		throw new Error("Usage: node scripts/stage-desktop-release.js <stage|collect>");
	}
}

module.exports = {
	collectInstallers,
	stageDesktop,
};
