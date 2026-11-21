"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const { collectInstallers, stageDesktop } = require("./stage-desktop-release");

test("stage pins the desktop app to the published core version", () => {
	const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), "halstead-stage-"));
	const stage = stageDesktop({
		version: "9.9.9",
		workspace: path.resolve(__dirname, ".."),
		runnerTemp,
	});
	const manifest = JSON.parse(fs.readFileSync(path.join(stage, "package.json"), "utf8"));

	assert.equal(manifest.version, "9.9.9");
	assert.equal(manifest.dependencies["halstead-metrics"], "9.9.9");
	assert.equal(manifest.private, true);
	assert.equal(fs.existsSync(path.join(stage, "lib", "files.js")), true);
	assert.equal(fs.existsSync(path.join(stage, "test")), false);
	fs.rmSync(runnerTemp, { recursive: true, force: true });
});

test("collect copies installer artifacts and skips builder metadata", () => {
	const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), "halstead-collect-"));
	const stage = path.join(runnerTemp, "halstead-desktop");
	const dist = path.join(stage, "dist");
	fs.mkdirSync(dist, { recursive: true });
	fs.writeFileSync(path.join(dist, "halstead-metrics-9.9.9-linux-x64.AppImage"), "app");
	fs.writeFileSync(path.join(dist, "latest-linux.yml"), "meta");
	fs.mkdirSync(path.join(dist, "mac"), { recursive: true });
	fs.writeFileSync(path.join(dist, "mac", "halstead-metrics-9.9.9-mac-arm64.dmg"), "dmg");

	const copied = collectInstallers({ stage, runnerTemp });
	assert.deepEqual(copied, [
		"halstead-metrics-9.9.9-linux-x64.AppImage",
		"halstead-metrics-9.9.9-mac-arm64.dmg",
	]);
	assert.equal(fs.existsSync(path.join(runnerTemp, "installers", "latest-linux.yml")), false);
	fs.rmSync(runnerTemp, { recursive: true, force: true });
});
