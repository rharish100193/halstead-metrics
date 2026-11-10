"use strict";

const { analyzeFile, analyzeSource, reportSource } = require("./analyze");
const {
	C_KEYWORDS,
	CPP_KEYWORDS,
	JAVA_KEYWORDS,
	SUPPORTED_EXTENSIONS,
	keywordsForExtension,
	languageForExtension,
} = require("./keywords");
const { formatRounded, toReport, roundTo2Decimals } = require("./metrics");
const { renderHtmlReport, renderPdfReport, reportBaseName } = require("./report");

module.exports = {
	analyzeFile,
	analyzeSource,
	reportSource,
	toReport,
	roundTo2Decimals,
	formatRounded,
	renderHtmlReport,
	renderPdfReport,
	reportBaseName,
	SUPPORTED_EXTENSIONS,
	languageForExtension,
	keywordsForExtension,
	JAVA_KEYWORDS,
	C_KEYWORDS,
	CPP_KEYWORDS,
};
