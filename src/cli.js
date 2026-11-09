"use strict";

const fs = require("fs");
const path = require("path");

const { SUPPORTED_EXTENSIONS } = require("./keywords");
const { reportSource } = require("./analyze");

const USAGE = "Usage:\n"
	+ "\tTo use in CLI mode: halstead <path name>\n"
	+ "\tIn CLI mode the results will be printed to stdout in Json format.\n";

/**
 * @param {string[]} args
 * @param {{log?: Function, error?: Function}} [io]
 * @returns {number}
 */
function main(args, io) {
	const log = (io && io.log) || console.log;
	const error = (io && io.error) || console.error;

	if (args.length === 0 || args[0] === "-h" || args[0] === "--help" || args[0] === "-help") {
		log(USAGE.trimEnd());
		return 1;
	}

	const filePath = args[0];
	const absolute = path.resolve(filePath);
	let stat = null;
	try {
		stat = fs.statSync(filePath);
	} catch (err) {
		stat = null;
	}
	if (!stat || !stat.isFile()) {
		log("Cannot read file: " + absolute);
		return 2;
	}
	try {
		fs.accessSync(filePath, fs.constants.R_OK);
	} catch (err) {
		log("Cannot read file: " + absolute);
		return 2;
	}

	const extension = path.extname(filePath).slice(1).toLowerCase();
	if (!SUPPORTED_EXTENSIONS.has(extension)) {
		log("Check the path you inserted: " + absolute);
		return 3;
	}

	try {
		const source = fs.readFileSync(filePath, "utf8");
		const report = reportSource(source, extension, filePath);
		log(JSON.stringify(report));
		return 0;
	} catch (err) {
		error("MetricsEvaluator exception.");
		error(err);
		return 4;
	}
}

module.exports = {
	main,
	USAGE,
};
