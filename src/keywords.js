"use strict";

/**
 * Keyword lists copied from the Java Halstead tool.
 * A keyword is counted as an operator. Extensions .cc and .c++ use the C++
 * lexer but, matching KeywordAnalyzer, do not apply the C++ keyword list.
 */

const JAVA_KEYWORDS = [
	"abstract", "continue", "for", "new", "switch", "assert", "default", "goto",
	"package", "synchronized", "boolean", "do", "if", "private", "this", "break",
	"double", "implements", "protected", "throw", "byte", "else", "import", "public",
	"throws", "case", "enum", "instanceof", "return", "transient", "catch", "extends",
	"int", "short", "try", "char", "final", "interface", "static", "void", "class",
	"finally", "long", "strictfp", "volatile", "const", "float", "native", "super",
	"while",
];

const C_KEYWORDS = [
	"auto", "break", "case", "char", "const", "continue", "default", "do",
	"double", "else", "enum", "extern", "float", "for", "goto", "if", "int",
	"long", "register", "return", "short", "signed", "sizeof", "static", "struct",
	"switch", "typedef", "union", "unsigned", "void", "volatile", "while",
];

const CPP_KEYWORDS = [
	"auto", "break", "case", "char", "const", "continue", "default", "do",
	"double", "else", "enum", "extern", "float", "for", "goto", "if", "int",
	"long", "register", "return", "short", "signed", "sizeof", "static", "struct",
	"switch", "typedef", "union", "unsigned", "void", "volatile", "while", "asm",
	"dynamic_cast", "namespace", "reinterpret_cast", "try", "bool", "explicit",
	"new", "static_cast", "typeid", "catch", "false", "operator", "template",
	"typename", "class", "friend", "private", "this", "using", "const_cast",
	"inline", "public", "throw", "virtual", "delete", "mutable", "protected",
	"true", "wchar_t", "and", "bitand", "compl", "not_eq", "or_eq", "xor_eq",
	"and_eq", "bitor", "not", "or", "xor",
];

const SUPPORTED_EXTENSIONS = new Set(["java", "c", "cc", "c++", "cpp"]);

/**
 * @param {string} extension extension without the leading dot
 * @returns {"java"|"c"|"cpp"|null}
 */
function languageForExtension(extension) {
	const ext = String(extension).toLowerCase();
	if (ext === "java") {
		return "java";
	}
	if (ext === "c") {
		return "c";
	}
	if (ext === "cc" || ext === "c++" || ext === "cpp") {
		return "cpp";
	}
	return null;
}

/**
 * @param {string} extension
 * @returns {Set<string>|null}
 */
function keywordsForExtension(extension) {
	const ext = String(extension).toLowerCase();
	if (ext === "java") {
		return new Set(JAVA_KEYWORDS);
	}
	if (ext === "c") {
		return new Set(C_KEYWORDS);
	}
	if (ext === "cpp") {
		return new Set(CPP_KEYWORDS);
	}
	return null;
}

module.exports = {
	JAVA_KEYWORDS,
	C_KEYWORDS,
	CPP_KEYWORDS,
	SUPPORTED_EXTENSIONS,
	languageForExtension,
	keywordsForExtension,
};
