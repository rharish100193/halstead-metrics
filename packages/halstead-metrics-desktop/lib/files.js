"use strict";

const fs = require("fs");
const path = require("path");

const {
	SUPPORTED_EXTENSIONS,
	analyzeSource,
	formatRounded,
	renderHtmlReport,
	renderPdfReport,
	reportBaseName,
} = require("halstead-metrics");

const { highlightLines } = require("./highlight");

/**
 * @param {string} filePath
 * @returns {string}
 */
function extensionOf(filePath) {
	return path.extname(filePath).slice(1).toLowerCase();
}

/**
 * @param {string} dirPath
 * @returns {Array<{name: string, path: string, isDirectory: boolean}>}
 */
function listDirectory(dirPath) {
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	const items = [];
	for (let i = 0; i < entries.length; i += 1) {
		const entry = entries[i];
		if (entry.name.startsWith(".")) {
			continue;
		}
		const full = path.join(dirPath, entry.name);
		let isDirectory = entry.isDirectory();
		if (entry.isSymbolicLink()) {
			try {
				isDirectory = fs.statSync(full).isDirectory();
			} catch (err) {
				continue;
			}
		}
		items.push({
			name: entry.name,
			path: full,
			isDirectory: isDirectory,
		});
	}
	items.sort((a, b) => {
		if (a.isDirectory !== b.isDirectory) {
			return a.isDirectory ? -1 : 1;
		}
		return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
	});
	return items;
}

/**
 * @param {object} metrics
 * @returns {object}
 */
function metricFields(metrics) {
	return {
		programLength: formatRounded(metrics.length),
		programVocabulary: formatRounded(metrics.vocabulary),
		estimatedLength: formatRounded(metrics.estimatedLength),
		purityRatio: formatRounded(metrics.purityRatio),
		volume: formatRounded(metrics.volume),
		difficulty: formatRounded(metrics.difficulty),
		programEffort: formatRounded(metrics.effort),
		programmingTime: formatRounded(metrics.programmingTime),
	};
}

/**
 * @param {string} filePath
 */
function readSource(filePath) {
	const name = path.basename(filePath);
	const extension = extensionOf(filePath);
	if (!SUPPORTED_EXTENSIONS.has(extension)) {
		return {
			name: name,
			extension: extension,
			supported: false,
			source: "",
			lines: [],
			fields: null,
		};
	}
	let source;
	try {
		source = fs.readFileSync(filePath, "utf8");
	} catch (err) {
		return {
			name: name,
			extension: extension,
			supported: true,
			source: "",
			lines: [],
			fields: null,
			error: "Cannot read file.",
		};
	}
	try {
		const metrics = analyzeSource(source, extension);
		return {
			name: name,
			extension: extension,
			supported: true,
			source: source,
			lines: highlightLines(source, extension),
			fields: metricFields(metrics),
		};
	} catch (err) {
		return {
			name: name,
			extension: extension,
			supported: true,
			source: source,
			lines: highlightLines(source, extension),
			fields: null,
			error: "Could not calculate metrics.",
		};
	}
}

/**
 * Write the HTML or PDF report beside the source file, using the same stem as the Java tool.
 * @param {string} filePath
 * @param {"html"|"pdf"} kind
 * @returns {Promise<string>} output path
 */
async function exportReport(filePath, kind) {
	const extension = extensionOf(filePath);
	if (!SUPPORTED_EXTENSIONS.has(extension)) {
		throw new Error("Select a Java, C, or C++ source file.");
	}
	const source = fs.readFileSync(filePath, "utf8");
	const metrics = analyzeSource(source, extension);
	const displayName = path.basename(filePath);
	const suffix = kind === "pdf" ? ".pdf" : ".html";
	const outputPath = path.join(path.dirname(filePath), reportBaseName(filePath) + suffix);
	const body = kind === "pdf"
		? await renderPdfReport(metrics, displayName)
		: renderHtmlReport(metrics, displayName);
	fs.writeFileSync(outputPath, body);
	return outputPath;
}

module.exports = {
	extensionOf,
	listDirectory,
	readSource,
	exportReport,
};
