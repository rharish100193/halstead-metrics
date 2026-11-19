"use strict";

const fs = require("fs");

const { getModernLanguage } = require("./languages");
const { tokenizeGeneric } = require("./genericLexer");
const { classify, toReport } = require("./metrics");

/**
 * @param {string} source
 * @param {string} extension extension without the leading dot
 */
function analyzeSource(source, extension) {
	const language = getModernLanguage(extension);
	if (!language) {
		throw new Error("Unsupported extension: " + extension);
	}
	const tokens = tokenizeGeneric(source, language);
	return classify(tokens, language.keywords, language.operators);
}

/**
 * @param {string} filePath
 * @param {string} extension
 */
function analyzeFile(filePath, extension) {
	const source = fs.readFileSync(filePath, "utf8");
	return analyzeSource(source, extension);
}

/**
 * @param {string} source
 * @param {string} extension
 * @param {string} filename
 */
function reportSource(source, extension, filename) {
	return toReport(analyzeSource(source, extension), filename);
}

module.exports = {
	analyzeSource,
	analyzeFile,
	reportSource,
};
