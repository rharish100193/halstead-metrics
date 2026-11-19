"use strict";

const {
	C_KEYWORDS,
	CPP_KEYWORDS,
	JAVA_KEYWORDS,
	getModernLanguage,
	modernExtensions,
} = require("./languages");

const SUPPORTED_EXTENSIONS = new Set(modernExtensions);

/**
 * @param {string} extension extension without the leading dot
 * @returns {"java"|"c"|"cpp"|null}
 */
function languageForExtension(extension) {
	const language = getModernLanguage(extension);
	if (!language) {
		return null;
	}
	if (language.id === "java" || language.id === "c" || language.id === "cpp") {
		return language.id;
	}
	return null;
}

/**
 * @param {string} extension
 * @returns {Set<string>|null}
 */
function keywordsForExtension(extension) {
	const language = getModernLanguage(extension);
	return language ? language.keywords : null;
}

module.exports = {
	JAVA_KEYWORDS,
	C_KEYWORDS,
	CPP_KEYWORDS,
	SUPPORTED_EXTENSIONS,
	languageForExtension,
	keywordsForExtension,
};
