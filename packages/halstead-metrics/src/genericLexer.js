"use strict";

const STRING_PREFIXES = ["rf", "fr", "rb", "br", "ur", "ru", "r", "u", "b", "f"];

/**
 * Tokenize a language defined in languages.js.
 * The trailing <EOF> matches the classic lexer.
 * @param {string} source
 * @param {object} lang
 * @returns {string[]}
 */
function tokenizeGeneric(source, lang) {
	const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
	const operators = lang.operators.slice().sort((a, b) => b.length - a.length);
	const lineComments = lang.lineComments.slice().sort((a, b) => b.length - a.length);
	const blockComments = lang.blockComments.slice().sort((a, b) => b[0].length - a[0].length);
	const tokens = [];
	let i = 0;
	let atLineStart = true;

	if (text.startsWith("#!")) {
		i = skipToEol(text, 2);
	}

	while (i < text.length) {
		const ws = skipWhitespace(text, i);
		if (ws > i) {
			if (text.slice(i, ws).includes("\n")) {
				atLineStart = true;
			}
			i = ws;
			continue;
		}
		if (atLineStart && lang.preprocessor && text[i] === "#") {
			i = skipToEol(text, i + 1);
			continue;
		}
		atLineStart = false;

		if (lang.dollar && text[i] === "$" && text[i + 1] && !isIdentStart(text[i + 1], lang) && text[i + 1] !== "{" && !isWhitespace(text[i + 1])) {
			tokens.push(text.slice(i, i + 2));
			i += 2;
			continue;
		}

		const block = matchBlock(text, i, blockComments);
		if (block) {
			i = block;
			continue;
		}
		const line = matchLine(text, i, lineComments);
		if (line > i) {
			i = line;
			continue;
		}

		if (lang.rustRaw) {
			const raw = scanRustRaw(text, i);
			if (raw) {
				tokens.push(raw.text);
				i = raw.index;
				continue;
			}
		}
		if (lang.verbatimAt && text[i] === "@" && text[i + 1] === "\"") {
			const verbatim = scanVerbatim(text, i);
			tokens.push(verbatim.text);
			i = verbatim.index;
			continue;
		}
		const literal = scanString(text, i, lang);
		if (literal) {
			tokens.push(literal.text);
			i = literal.index;
			continue;
		}
		if (lang.lifetimes && text[i] === "'" && isIdentStart(text[i + 1], lang)) {
			const life = scanIdent(text, i + 1, lang);
			if (life) {
				tokens.push(text.slice(i, life.index));
				i = life.index;
				continue;
			}
		}

		const numberEnd = scanNumber(text, i);
		if (numberEnd !== null) {
			tokens.push(text.slice(i, numberEnd));
			i = numberEnd;
			continue;
		}

		if (lang.atPrefix && text[i] === "@") {
			let marks = i;
			while (text[marks] === "@") {
				marks += 1;
			}
			const named = scanIdent(text, marks, lang);
			if (named && marks > i) {
				tokens.push(text.slice(i, named.index));
				i = named.index;
				continue;
			}
		}

		const ident = scanIdent(text, i, lang);
		if (ident) {
			let word = ident.text;
			if (lang.caseInsensitive && lang.keywords.has(word.toLowerCase())) {
				word = word.toLowerCase();
			}
			tokens.push(word);
			i = ident.index;
			continue;
		}

		const op = matchOperator(text, i, operators);
		if (op) {
			tokens.push(op);
			i += op.length;
			continue;
		}

		tokens.push(text[i]);
		i += 1;
	}

	tokens.push("<EOF>");
	return tokens;
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function skipWhitespace(text, i) {
	let j = i;
	while (j < text.length && isWhitespace(text[j])) {
		j += 1;
	}
	return j;
}

/**
 * @param {string} ch
 * @returns {boolean}
 */
function isWhitespace(ch) {
	return ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v";
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function skipToEol(text, i) {
	let j = i;
	while (j < text.length && text[j] !== "\n" && text[j] !== "\r") {
		j += 1;
	}
	return j;
}

/**
 * @param {string} text
 * @param {number} i
 * @param {string[][]} blocks
 * @returns {number|null}
 */
function matchBlock(text, i, blocks) {
	for (let b = 0; b < blocks.length; b += 1) {
		const open = blocks[b][0];
		const close = blocks[b][1];
		if (!text.startsWith(open, i)) {
			continue;
		}
		const end = text.indexOf(close, i + open.length);
		return end === -1 ? text.length : end + close.length;
	}
	return null;
}

/**
 * @param {string} text
 * @param {number} i
 * @param {string[]} comments
 * @returns {number}
 */
function matchLine(text, i, comments) {
	for (let c = 0; c < comments.length; c += 1) {
		if (text.startsWith(comments[c], i)) {
			return skipToEol(text, i + comments[c].length);
		}
	}
	return i;
}

/**
 * @param {string} text
 * @param {number} i
 * @param {string[]} operators
 * @returns {string|null}
 */
function matchOperator(text, i, operators) {
	for (let k = 0; k < operators.length; k += 1) {
		if (text.startsWith(operators[k], i)) {
			return operators[k];
		}
	}
	return null;
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {{text: string, index: number}|null}
 */
function scanRustRaw(text, i) {
	let j = i;
	if (text[j] === "b" && text[j + 1] === "r") {
		j += 1;
	}
	if (text[j] !== "r") {
		return null;
	}
	j += 1;
	let hashes = "";
	while (text[j] === "#") {
		hashes += "#";
		j += 1;
	}
	if (text[j] !== "\"") {
		return null;
	}
	j += 1;
	const closer = "\"" + hashes;
	const end = text.indexOf(closer, j);
	const stop = end === -1 ? text.length : end + closer.length;
	return { text: text.slice(i, stop), index: stop };
}

/**
 * @param {string} text
 * @param {number} i index of @
 * @returns {{text: string, index: number}}
 */
function scanVerbatim(text, i) {
	let j = i + 2;
	while (j < text.length) {
		if (text[j] === "\"" && text[j + 1] === "\"") {
			j += 2;
			continue;
		}
		if (text[j] === "\"") {
			j += 1;
			break;
		}
		j += 1;
	}
	return { text: text.slice(i, j), index: j };
}

/**
 * @param {string} text
 * @param {number} i
 * @param {object} lang
 * @returns {{text: string, index: number}|null}
 */
function scanString(text, i, lang) {
	let start = i;
	let raw = false;
	if (lang.prefixedStrings) {
		for (let p = 0; p < STRING_PREFIXES.length; p += 1) {
			const prefix = STRING_PREFIXES[p];
			if (text.slice(i, i + prefix.length).toLowerCase() !== prefix) {
				continue;
			}
			if (!isQuoteStart(text, i + prefix.length)) {
				continue;
			}
			raw = prefix.toLowerCase().includes("r");
			start = i + prefix.length;
			break;
		}
		if (start === i && !isQuoteStart(text, i)) {
			return null;
		}
	} else if (!isQuoteStart(text, i)) {
		return null;
	}
	if (lang.lifetimes && text[start] === "'" && isIdentStart(text[start + 1], lang) && text[start + 2] !== "'") {
		return null;
	}
	const quote = quoteAt(text, start);
	let j = start + quote.length;
	while (j < text.length) {
		if (!raw && text[j] === "\\") {
			j += 2;
			continue;
		}
		if (text.startsWith(quote, j)) {
			j += quote.length;
			break;
		}
		j += 1;
	}
	return { text: text.slice(i, j), index: j };
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {boolean}
 */
function isQuoteStart(text, i) {
	return quoteAt(text, i) !== null;
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {string|null}
 */
function quoteAt(text, i) {
	if ((text[i] === "\"" || text[i] === "'") && text[i + 1] === text[i] && text[i + 2] === text[i]) {
		return text[i] + text[i] + text[i];
	}
	if (text[i] === "\"" || text[i] === "'" || text[i] === "`") {
		return text[i];
	}
	return null;
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number|null}
 */
function scanNumber(text, i) {
	let j = i;
	if (text[j] === "0" && (text[j + 1] === "x" || text[j + 1] === "X") && isHex(text[j + 2])) {
		j += 2;
		while (isHex(text[j]) || text[j] === "_") {
			j += 1;
		}
		return consumeSuffix(text, j);
	}
	if (text[j] === "0" && (text[j + 1] === "b" || text[j + 1] === "B") && (text[j + 2] === "0" || text[j + 2] === "1")) {
		j += 2;
		while (text[j] === "0" || text[j] === "1" || text[j] === "_") {
			j += 1;
		}
		return consumeSuffix(text, j);
	}
	if (text[j] === "0" && (text[j + 1] === "o" || text[j + 1] === "O") && text[j + 2] >= "0" && text[j + 2] <= "7") {
		j += 2;
		while ((text[j] >= "0" && text[j] <= "7") || text[j] === "_") {
			j += 1;
		}
		return consumeSuffix(text, j);
	}
	if (text[j] === "." && isDigit(text[j + 1])) {
		j += 1;
		j = consumeDigits(text, j);
		j = consumeExponent(text, j);
		return consumeSuffix(text, j);
	}
	if (!isDigit(text[j])) {
		return null;
	}
	j = consumeDigits(text, j);
	if (text[j] === "." && text[j + 1] !== "." && isDigit(text[j + 1])) {
		j += 1;
		j = consumeDigits(text, j);
	}
	if (text[j] === "e" || text[j] === "E") {
		j = consumeExponent(text, j);
	}
	return consumeSuffix(text, j);
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function consumeDigits(text, i) {
	let j = i;
	while (isDigit(text[j]) || text[j] === "_") {
		j += 1;
	}
	return j;
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function consumeExponent(text, i) {
	if (text[i] !== "e" && text[i] !== "E") {
		return i;
	}
	let j = i + 1;
	if (text[j] === "+" || text[j] === "-") {
		j += 1;
	}
	if (!isDigit(text[j])) {
		return i;
	}
	return consumeDigits(text, j);
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function consumeSuffix(text, i) {
	const slice = text.slice(i, i + 3);
	const match = /^(?:n|[uU](?:ll|LL|[lL])?|[lL][lL][uU]|[lL][uU]|[lL]{1,2}|[fFdD])/.exec(slice);
	if (!match) {
		return i;
	}
	const after = text[i + match[0].length];
	if (after && /[A-Za-z0-9_]/.test(after)) {
		return i;
	}
	return i + match[0].length;
}

/**
 * @param {string} text
 * @param {number} i
 * @param {object} lang
 * @returns {{text: string, index: number}|null}
 */
function scanIdent(text, i, lang) {
	if (!isIdentStart(text[i], lang)) {
		return null;
	}
	let j = i + 1;
	while (j < text.length) {
		if (isIdentPart(text[j], lang)) {
			j += 1;
			continue;
		}
		if (lang.hyphenIdent && text[j] === "-" && isIdentStart(text[j + 1], lang)) {
			j += 2;
			continue;
		}
		break;
	}
	if (lang.identSuffix && lang.identSuffix.includes(text[j]) && !isIdentPart(text[j + 1], lang)) {
		j += 1;
	}
	return { text: text.slice(i, j), index: j };
}

/**
 * @param {string} ch
 * @param {object} lang
 * @returns {boolean}
 */
function isIdentStart(ch, lang) {
	if (!ch) {
		return false;
	}
	if (lang.dollar && ch === "$") {
		return true;
	}
	if (ch === "_" || /[A-Za-z]/.test(ch)) {
		return true;
	}
	return ch.codePointAt(0) > 127 && /\p{L}/u.test(ch);
}

/**
 * @param {string} ch
 * @param {object} lang
 * @returns {boolean}
 */
function isIdentPart(ch, lang) {
	if (!ch) {
		return false;
	}
	if (isIdentStart(ch, lang) || isDigit(ch)) {
		return true;
	}
	return lang.identPartExtra.includes(ch);
}

/**
 * @param {string} ch
 * @returns {boolean}
 */
function isDigit(ch) {
	return ch >= "0" && ch <= "9";
}

/**
 * @param {string} ch
 * @returns {boolean}
 */
function isHex(ch) {
	return isDigit(ch) || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
}

module.exports = {
	tokenizeGeneric,
};
