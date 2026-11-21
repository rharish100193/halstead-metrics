"use strict";

const { keywordsForExtension, syntaxForExtension } = require("halstead-metrics");

/**
 * @param {Array<{kind: string, text: string}>} tokens
 * @param {string} kind
 * @param {string} text
 */
function push(tokens, kind, text) {
	if (!text) {
		return;
	}
	const last = tokens[tokens.length - 1];
	if (last && last.kind === kind) {
		last.text += text;
		return;
	}
	tokens.push({ kind: kind, text: text });
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
 * @returns {{tokens: Array<{kind: string, text: string}>, blockCloser: string|null}}
 */
function highlightLine(line, keywords, blockCloser, syntax) {
	const tokens = [];
	if (!blockCloser && syntax.preprocessor && /^\s*#/.test(line)) {
		push(tokens, "pp", line);
		return { tokens: tokens, blockCloser: null };
	}
	const lineComments = longestFirst(syntax.lineComments);
	const blockComments = syntax.blockComments.slice().sort((a, b) => b[0].length - a[0].length);
	let i = 0;
	while (i < line.length) {
		if (blockCloser) {
			const end = line.indexOf(blockCloser, i);
			if (end === -1) {
				push(tokens, "cm", line.slice(i));
				return { tokens: tokens, blockCloser: blockCloser };
			}
			push(tokens, "cm", line.slice(i, end + blockCloser.length));
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
				push(tokens, "cm", line.slice(i));
				return { tokens: tokens, blockCloser: null };
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
			push(tokens, "st", line.slice(i, j));
			i = j;
			continue;
		}
		if (/[A-Za-z_$]/.test(line[i])) {
			let j = i + 1;
			while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) {
				j += 1;
			}
			const word = line.slice(i, j);
			push(tokens, keywords.has(word) ? "kw" : "tx", word);
			i = j;
			continue;
		}
		if (line[i] >= "0" && line[i] <= "9") {
			let j = i + 1;
			while (j < line.length && /[0-9a-fA-FxX.]/.test(line[j])) {
				j += 1;
			}
			push(tokens, "nu", line.slice(i, j));
			i = j;
			continue;
		}
		if (line[i] === "." && line[i + 1] >= "0" && line[i + 1] <= "9") {
			let j = i + 1;
			while (j < line.length && /[0-9.]/.test(line[j])) {
				j += 1;
			}
			push(tokens, "nu", line.slice(i, j));
			i = j;
			continue;
		}
		push(tokens, "tx", line[i]);
		i += 1;
	}
	return { tokens: tokens, blockCloser: blockCloser };
}

/**
 * One token list per source line. Kinds are tx, kw, st, cm, nu, and pp.
 * @param {string} source
 * @param {string} extension
 * @returns {Array<Array<{kind: string, text: string}>>}
 */
function highlightLines(source, extension) {
	const keywords = keywordsForExtension(extension) || new Set();
	const syntax = syntaxForExtension(extension);
	const lines = String(source).split("\n");
	const rendered = [];
	let blockCloser = null;
	for (let i = 0; i < lines.length; i += 1) {
		const line = highlightLine(lines[i], keywords, blockCloser, syntax);
		rendered.push(line.tokens);
		blockCloser = line.blockCloser;
	}
	return rendered;
}

module.exports = {
	highlightLines,
};
