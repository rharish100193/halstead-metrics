"use strict";

/**
 * Lexer that emits the same token texts the ANTLR lexers feed to the
 * analyzers: one lexeme per token, trivia skipped, and an <EOF> sentinel.
 * Whitespace, comments, and preprocessor lines are skipped, which is what
 * `-> skip` does in the original grammars (LiteralAnalyzer only special-cases <EOF>).
 */

const JAVA_OPERATORS = [
	">>>=", ">>=", "<<=", "...", "->", "::", "+=", "-=", "*=", "/=", "&=", "|=",
	"^=", "%=", "==", "<=", ">=", "!=", "&&", "||", "++", "--", "(", ")", "{",
	"}", "[", "]", ";", ",", ".", "=", ">", "<", "!", "~", "?", ":", "+", "-",
	"*", "/", "&", "|", "^", "%", "@",
];

const C_OPERATORS = [
	"<<=", ">>=", "...", "->", "*=", "/=", "%=", "+=", "-=", "&=", "^=", "|=",
	"==", "!=", "<=", ">=", "&&", "||", "++", "--", "<<", ">>", "(", ")", "[",
	"]", "{", "}", "<", ">", "+", "-", "*", "/", "%", "&", "|", "^", "!", "~",
	"?", ":", ";", ",", "=", ".",
];

const CPP_OPERATORS = [
	"<<=", "->*", "...", ".*", "->", "::", "+=", "-=", "*=", "/=", "%=", "^=",
	"&=", "|=", "==", "!=", "<=", ">=", "<<", "&&", "||", "++", "--", "(", ")",
	"[", "]", "{", "}", "+", "-", "*", "/", "%", "^", "&", "|", "~", "!", "=",
	"<", ">", ",", "?", ":", ";", ".",
];

const OPERATORS = {
	java: byLength(JAVA_OPERATORS),
	c: byLength(C_OPERATORS),
	cpp: byLength(CPP_OPERATORS),
};

/**
 * @param {string[]} operators
 * @returns {string[]}
 */
function byLength(operators) {
	return operators.slice().sort((a, b) => b.length - a.length);
}

/**
 * @param {string} source
 * @param {"java"|"c"|"cpp"} language
 * @returns {string[]}
 */
function tokenize(source, language) {
	const ops = OPERATORS[language];
	if (!ops) {
		throw new Error("Unsupported language: " + language);
	}
	const tokens = [];
	const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
	const n = text.length;
	let i = 0;
	let atLineStart = true;

	while (i < n) {
		const ws = scanWhitespace(text, i);
		if (ws > i) {
			atLineStart = text.slice(i, ws).includes("\n");
			i = ws;
			continue;
		}

		if (atLineStart && (language === "c" || language === "cpp") && text[i] === "#") {
			i = scanDirective(text, i);
			atLineStart = true;
			continue;
		}

		if (text.startsWith("//", i)) {
			i = scanLineComment(text, i + 2);
			atLineStart = false;
			continue;
		}
		if (text.startsWith("/*", i)) {
			i = scanBlockComment(text, i + 2);
			atLineStart = false;
			continue;
		}

		const literal = scanLiteral(text, i, language);
		if (literal) {
			tokens.push(literal.text);
			i = literal.index;
			atLineStart = false;
			continue;
		}

		const number = scanNumber(text, i, language);
		if (number) {
			tokens.push(number.text);
			i = number.index;
			atLineStart = false;
			continue;
		}

		const ident = scanIdentifier(text, i, language);
		if (ident) {
			tokens.push(ident.text);
			i = ident.index;
			atLineStart = false;
			continue;
		}

		const op = matchOperator(text, i, ops);
		if (op) {
			tokens.push(op);
			i += op.length;
			atLineStart = false;
			continue;
		}

		tokens.push(text[i]);
		i += 1;
		atLineStart = false;
	}

	tokens.push("<EOF>");
	return tokens;
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function scanWhitespace(text, i) {
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
 * @param {number} i index of '#'
 * @returns {number}
 */
function scanDirective(text, i) {
	let j = i + 1;
	while (j < text.length) {
		if (text[j] === "\\" && (text[j + 1] === "\n" || text[j + 1] === "\r")) {
			j += text[j + 1] === "\r" && text[j + 2] === "\n" ? 3 : 2;
			continue;
		}
		if (text[j] === "\n" || text[j] === "\r") {
			break;
		}
		j += 1;
	}
	return j;
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function scanLineComment(text, i) {
	let j = i;
	while (j < text.length && text[j] !== "\n" && text[j] !== "\r") {
		j += 1;
	}
	return j;
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function scanBlockComment(text, i) {
	const end = text.indexOf("*/", i);
	return end === -1 ? text.length : end + 2;
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
 * @param {"java"|"c"|"cpp"} language
 * @returns {{text: string, index: number}|null}
 */
function scanLiteral(text, i, language) {
	const prefixed = scanPrefix(text, i, language);
	if (!prefixed) {
		return null;
	}
	let j = prefixed.index;
	if (language === "cpp" && text[j] === "R" && text[j + 1] === "\"") {
		const raw = scanRawString(text, j + 2);
		if (!raw) {
			return null;
		}
		return glueSuffix(text, prefixed.text + "R\"" + raw.text, raw.index, language);
	}
	if (text[j] === "\"") {
		const str = scanQuoted(text, j, "\"");
		return glueSuffix(text, prefixed.text + str.text, str.index, language);
	}
	if (text[j] === "'") {
		const ch = scanQuoted(text, j, "'");
		return glueSuffix(text, prefixed.text + ch.text, ch.index, language);
	}
	return null;
}

/**
 * Encoding prefixes that must be part of the literal, not a separate identifier.
 * @param {string} text
 * @param {number} i
 * @param {"java"|"c"|"cpp"} language
 * @returns {{text: string, index: number}|null}
 */
function scanPrefix(text, i, language) {
	if (text[i] === "\"" || text[i] === "'") {
		return { text: "", index: i };
	}
	if (language === "cpp" && text[i] === "R" && text[i + 1] === "\"") {
		return { text: "", index: i };
	}
	if (language === "java") {
		return null;
	}
	const candidates = language === "cpp"
		? ["u8", "u", "U", "L"]
		: ["u8", "u", "U", "L"];
	for (let c = 0; c < candidates.length; c += 1) {
		const prefix = candidates[c];
		if (!text.startsWith(prefix, i)) {
			continue;
		}
		const next = i + prefix.length;
		if (text[next] === "\"" || text[next] === "'") {
			return { text: prefix, index: next };
		}
		if (language === "cpp" && text[next] === "R" && text[next + 1] === "\"") {
			return { text: prefix, index: next };
		}
	}
	return null;
}

/**
 * @param {string} text
 * @param {number} i index of the opening quote
 * @param {string} quote
 * @returns {{text: string, index: number}}
 */
function scanQuoted(text, i, quote) {
	let j = i + 1;
	let body = quote;
	while (j < text.length) {
		const ch = text[j];
		body += ch;
		if (ch === "\\") {
			if (j + 1 < text.length) {
				body += text[j + 1];
				j += 2;
				continue;
			}
			j += 1;
			break;
		}
		if (ch === quote) {
			j += 1;
			break;
		}
		if (ch === "\n" || ch === "\r") {
			break;
		}
		j += 1;
	}
	return { text: body, index: j };
}

/**
 * C++ raw string. `i` points at the character after R".
 * @param {string} text
 * @param {number} i
 * @returns {{text: string, index: number}|null}
 */
function scanRawString(text, i) {
	const open = text.indexOf("(", i);
	if (open === -1 || open - i > 16) {
		return null;
	}
	const delim = text.slice(i, open);
	if (!/^[\w]*$/.test(delim)) {
		return null;
	}
	const closer = ")" + delim + "\"";
	const end = text.indexOf(closer, open + 1);
	if (end === -1) {
		return { text: text.slice(i) + "\"", index: text.length };
	}
	return { text: text.slice(i, end + closer.length), index: end + closer.length };
}

/**
 * C++ user-defined literal suffixes sit in the same token as the literal.
 * @param {string} text
 * @param {string} literal
 * @param {number} index
 * @param {"java"|"c"|"cpp"} language
 * @returns {{text: string, index: number}}
 */
function glueSuffix(text, literal, index, language) {
	if (language !== "cpp") {
		return { text: literal, index: index };
	}
	const suffix = scanIdentifier(text, index, language);
	if (!suffix || suffix.index === index) {
		return { text: literal, index: index };
	}
	return { text: literal + suffix.text, index: suffix.index };
}

/**
 * @param {string} text
 * @param {number} i
 * @param {"java"|"c"|"cpp"} language
 * @returns {{text: string, index: number}|null}
 */
function scanNumber(text, i, language) {
	const n = text.length;
	if (i >= n) {
		return null;
	}
	let j = i;
	const allowBinary = language !== "c";

	if (text[j] === "0" && (text[j + 1] === "x" || text[j + 1] === "X") && isHex(text[j + 2])) {
		j += 2;
		j = consumeRun(text, j, isHex);
		if (text[j] === "." && isHex(text[j + 1])) {
			j += 1;
			j = consumeRun(text, j, isHex);
		}
		if (text[j] === "p" || text[j] === "P") {
			j = consumeExponent(text, j);
		}
		j = consumeIntSuffix(text, j);
		return finishNumber(text, i, j, language);
	}

	if (allowBinary && text[j] === "0" && (text[j + 1] === "b" || text[j + 1] === "B") && (text[j + 2] === "0" || text[j + 2] === "1")) {
		j += 2;
		j = consumeRun(text, j, (ch) => ch === "0" || ch === "1");
		j = consumeIntSuffix(text, j);
		return finishNumber(text, i, j, language);
	}

	if (text[j] === "." && isDigit(text[j + 1])) {
		j += 1;
		j = consumeDigits(text, j);
		if (text[j] === "e" || text[j] === "E") {
			j = consumeExponent(text, j);
		}
		j = consumeFloatSuffix(text, j);
		return finishNumber(text, i, j, language);
	}

	if (!isDigit(text[j])) {
		return null;
	}

	j = consumeDigits(text, j);
	let isFloat = false;
	if (text[j] === "." && text[j + 1] !== ".") {
		isFloat = true;
		j += 1;
		if (isDigit(text[j])) {
			j = consumeDigits(text, j);
		}
	}
	if (text[j] === "e" || text[j] === "E") {
		isFloat = true;
		j = consumeExponent(text, j);
	}
	j = isFloat ? consumeFloatSuffix(text, j) : consumeIntSuffix(text, j);
	return finishNumber(text, i, j, language);
}

/**
 * @param {string} text
 * @param {number} start
 * @param {number} index
 * @param {"java"|"c"|"cpp"} language
 * @returns {{text: string, index: number}}
 */
function finishNumber(text, start, index, language) {
	const base = { text: text.slice(start, index), index: index };
	if (language !== "cpp") {
		return base;
	}
	if (text[index] !== "_") {
		return base;
	}
	const suffix = scanIdentifier(text, index, language);
	if (!suffix) {
		return base;
	}
	return { text: base.text + suffix.text, index: suffix.index };
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function consumeDigits(text, i) {
	return consumeRun(text, i, isDigit);
}

/**
 * @param {string} text
 * @param {number} i
 * @param {(ch: string) => boolean} pred
 * @returns {number}
 */
function consumeRun(text, i, pred) {
	let j = i;
	while (j < text.length) {
		if (pred(text[j])) {
			j += 1;
			continue;
		}
		if (text[j] === "_" && pred(text[j + 1])) {
			j += 2;
			continue;
		}
		break;
	}
	return j;
}

/**
 * @param {string} text
 * @param {number} i index of e/E/p/P
 * @returns {number}
 */
function consumeExponent(text, i) {
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
function consumeIntSuffix(text, i) {
	const slice = text.slice(i, i + 3);
	const match = /^(?:[uU](?:ll|LL|[lL])?|[lL][lL][uU]|[lL][uU]|[lL]{1,2})/.exec(slice);
	return match ? i + match[0].length : i;
}

/**
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function consumeFloatSuffix(text, i) {
	const ch = text[i];
	if (ch === "f" || ch === "F" || ch === "d" || ch === "D" || ch === "l" || ch === "L") {
		return i + 1;
	}
	return i;
}

/**
 * @param {string} text
 * @param {number} i
 * @param {"java"|"c"|"cpp"} language
 * @returns {{text: string, index: number}|null}
 */
function scanIdentifier(text, i, language) {
	if (!isIdentStart(text[i], language)) {
		return null;
	}
	let j = i + 1;
	while (j < text.length && isIdentPart(text[j], language)) {
		j += 1;
	}
	return { text: text.slice(i, j), index: j };
}

/**
 * @param {string} ch
 * @param {"java"|"c"|"cpp"} language
 * @returns {boolean}
 */
function isIdentStart(ch, language) {
	if (!ch) {
		return false;
	}
	if (language === "java" && ch === "$") {
		return true;
	}
	return /[A-Za-z_]/.test(ch) || (ch.codePointAt(0) > 127 && /\p{L}/u.test(ch));
}

/**
 * @param {string} ch
 * @param {"java"|"c"|"cpp"} language
 * @returns {boolean}
 */
function isIdentPart(ch, language) {
	if (!ch) {
		return false;
	}
	if (language === "java" && ch === "$") {
		return true;
	}
	return /[A-Za-z0-9_]/.test(ch) || (ch.codePointAt(0) > 127 && /[\p{L}\p{N}]/u.test(ch));
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
	tokenize,
};
