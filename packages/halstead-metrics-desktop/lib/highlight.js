"use strict";

const {
	C_KEYWORDS,
	CPP_KEYWORDS,
	JAVA_KEYWORDS,
	languageForExtension,
} = require("halstead-metrics");

const KEYWORDS = {
	java: new Set(JAVA_KEYWORDS),
	c: new Set(C_KEYWORDS),
	cpp: new Set(CPP_KEYWORDS),
};

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/**
 * @param {string} className
 * @param {string} text
 * @returns {string}
 */
function span(className, text) {
	return "<span class=\"" + className + "\">" + escapeHtml(text) + "</span>";
}

/**
 * @param {string} extension
 * @returns {Set<string>}
 */
function keywordsFor(extension) {
	const language = languageForExtension(extension);
	if (language === "java") {
		return KEYWORDS.java;
	}
	if (language === "c") {
		return KEYWORDS.c;
	}
	if (language === "cpp") {
		return KEYWORDS.cpp;
	}
	return new Set();
}

/**
 * @param {string} line
 * @param {Set<string>} keywords
 * @param {boolean} inBlock
 * @param {boolean} preprocessor
 * @returns {{html: string, inBlock: boolean}}
 */
function highlightLine(line, keywords, inBlock, preprocessor) {
	if (!inBlock && preprocessor && /^\s*#/.test(line)) {
		return { html: span("pp", line), inBlock: false };
	}
	let html = "";
	let i = 0;
	while (i < line.length) {
		if (inBlock) {
			const end = line.indexOf("*/", i);
			if (end === -1) {
				html += span("cm", line.slice(i));
				return { html: html, inBlock: true };
			}
			html += span("cm", line.slice(i, end + 2));
			i = end + 2;
			inBlock = false;
			continue;
		}
		if (line.startsWith("//", i)) {
			html += span("cm", line.slice(i));
			return { html: html, inBlock: false };
		}
		if (line.startsWith("/*", i)) {
			inBlock = true;
			continue;
		}
		const quote = line[i];
		if (quote === "\"" || quote === "'") {
			let j = i + 1;
			while (j < line.length) {
				if (line[j] === "\\") {
					j += 2;
					continue;
				}
				if (line[j] === quote) {
					j += 1;
					break;
				}
				j += 1;
			}
			html += span("st", line.slice(i, j));
			i = j;
			continue;
		}
		if (/[A-Za-z_$]/.test(line[i])) {
			let j = i + 1;
			while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) {
				j += 1;
			}
			const word = line.slice(i, j);
			html += keywords.has(word) ? span("kw", word) : escapeHtml(word);
			i = j;
			continue;
		}
		if (line[i] >= "0" && line[i] <= "9") {
			let j = i + 1;
			while (j < line.length && /[0-9a-fA-FxX.]/.test(line[j])) {
				j += 1;
			}
			html += span("nu", line.slice(i, j));
			i = j;
			continue;
		}
		if (line[i] === "." && line[i + 1] >= "0" && line[i + 1] <= "9") {
			let j = i + 1;
			while (j < line.length && /[0-9.]/.test(line[j])) {
				j += 1;
			}
			html += span("nu", line.slice(i, j));
			i = j;
			continue;
		}
		html += escapeHtml(line[i]);
		i += 1;
	}
	return { html: html, inBlock: inBlock };
}

/**
 * One HTML fragment per source line, with keywords, strings, comments, and numbers marked.
 * @param {string} source
 * @param {string} extension
 * @returns {string[]}
 */
function highlightLines(source, extension) {
	const keywords = keywordsFor(extension);
	const language = languageForExtension(extension);
	const preprocessor = language === "c" || language === "cpp";
	const lines = String(source).split("\n");
	const html = [];
	let inBlock = false;
	for (let i = 0; i < lines.length; i += 1) {
		const rendered = highlightLine(lines[i], keywords, inBlock, preprocessor);
		html.push(rendered.html);
		inBlock = rendered.inBlock;
	}
	return html;
}

module.exports = {
	highlightLines,
};
