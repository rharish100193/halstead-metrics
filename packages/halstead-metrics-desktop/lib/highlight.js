"use strict";

const { keywordsForExtension, syntaxForExtension } = require("halstead-metrics");

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
	return keywordsForExtension(extension) || new Set();
}

/**
 * @param {string[]} comments
 * @returns {string[]}
 */
function longestFirst(comments) {
	return comments.slice().sort((a, b) => b.length - a.length);
}

/**
 * @param {string} line
 * @param {Set<string>} keywords
 * @param {string|null} blockCloser
 * @param {{lineComments: string[], blockComments: string[][], preprocessor: boolean}} syntax
 * @returns {{html: string, blockCloser: string|null}}
 */
function highlightLine(line, keywords, blockCloser, syntax) {
	if (!blockCloser && syntax.preprocessor && /^\s*#/.test(line)) {
		return { html: span("pp", line), blockCloser: null };
	}
	const lineComments = longestFirst(syntax.lineComments);
	const blockComments = syntax.blockComments.slice().sort((a, b) => b[0].length - a[0].length);
	let html = "";
	let i = 0;
	while (i < line.length) {
		if (blockCloser) {
			const end = line.indexOf(blockCloser, i);
			if (end === -1) {
				html += span("cm", line.slice(i));
				return { html: html, blockCloser: blockCloser };
			}
			html += span("cm", line.slice(i, end + blockCloser.length));
			i = end + blockCloser.length;
			blockCloser = null;
			continue;
		}
		let opened = false;
		for (let b = 0; b < blockComments.length; b += 1) {
			if (line.startsWith(blockComments[b][0], i)) {
				blockCloser = blockComments[b][1];
				opened = true;
				break;
			}
		}
		if (opened) {
			continue;
		}
		for (let c = 0; c < lineComments.length; c += 1) {
			if (line.startsWith(lineComments[c], i)) {
				html += span("cm", line.slice(i));
				return { html: html, blockCloser: null };
			}
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
	return { html: html, blockCloser: blockCloser };
}

/**
 * One HTML fragment per source line, with keywords, strings, comments, and numbers marked.
 * @param {string} source
 * @param {string} extension
 * @returns {string[]}
 */
function highlightLines(source, extension) {
	const keywords = keywordsFor(extension);
	const syntax = syntaxForExtension(extension);
	const lines = String(source).split("\n");
	const html = [];
	let blockCloser = null;
	for (let i = 0; i < lines.length; i += 1) {
		const rendered = highlightLine(lines[i], keywords, blockCloser, syntax);
		html.push(rendered.html);
		blockCloser = rendered.blockCloser;
	}
	return html;
}

module.exports = {
	highlightLines,
};
