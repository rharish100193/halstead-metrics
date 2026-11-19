"use strict";

/**
 * One classifier for every language. Keywords and the shared operator list
 * are operators. Comments and C-family preprocessor lines are not tokens.
 */

const OPERATORS = [
	">>>=", ">>=", "<<=", "...", "..=",
	"||=", "&&=", "??=", "**=", "//=",
	"===", "!==", "==", "!=", "<=", ">=",
	"=>", "->", "<-", "::", "|>",
	"+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "~=",
	"++", "--", "&&", "||", "??", "?.", "..",
	"<<", ">>", "**", "//",
	":=", "=~", "!~",
	"+", "-", "*", "/", "%", "&", "|", "^", "~", "!", "=",
	"<", ">", "?", ":", ".", ",", ";", "@",
];

const C_STYLE = { lineComments: ["//"], blockComments: [["/*", "*/"]] };
const HASH = { lineComments: ["#"], blockComments: [] };
const PHP_STYLE = { lineComments: ["//", "#"], blockComments: [["/*", "*/"]] };
const SQL_STYLE = { lineComments: ["--"], blockComments: [["/*", "*/"]] };
const LUA_STYLE = { lineComments: ["--"], blockComments: [["--[[", "]]"]] };
const HASKELL_STYLE = { lineComments: ["--"], blockComments: [["{-", "-}"]] };
const ML_STYLE = { lineComments: [], blockComments: [["(*", "*)"]] };
const POWERSHELL_STYLE = { lineComments: ["#"], blockComments: [["<#", "#>"]] };

/**
 * @param {string} id
 * @param {string[]} extensions
 * @param {string[]} keywords
 * @param {{lineComments: string[], blockComments: string[][]}} comments
 * @param {object} [options]
 */
function define(id, extensions, keywords, comments, options) {
	const settings = options || {};
	const folded = Boolean(settings.caseInsensitive);
	const words = folded ? keywords.map((word) => word.toLowerCase()) : keywords;
	return {
		id: id,
		extensions: extensions,
		keywords: new Set(words),
		lineComments: comments.lineComments,
		blockComments: comments.blockComments,
		caseInsensitive: folded,
		prefixedStrings: Boolean(settings.prefixedStrings),
		dollar: Boolean(settings.dollar),
		atPrefix: Boolean(settings.atPrefix),
		identSuffix: settings.identSuffix || "",
		identPartExtra: settings.identPartExtra || "",
		hyphenIdent: Boolean(settings.hyphenIdent),
		lifetimes: Boolean(settings.lifetimes),
		verbatimAt: Boolean(settings.verbatimAt),
		rustRaw: id === "rust",
		preprocessor: Boolean(settings.preprocessor),
		operators: OPERATORS,
	};
}

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

const LANGUAGES = [
	define("java", ["java"], JAVA_KEYWORDS, C_STYLE),
	define("c", ["c", "h"], C_KEYWORDS, C_STYLE, { preprocessor: true }),
	define("cpp", ["cpp", "cc", "cxx", "c++", "hpp", "hh", "hxx"], CPP_KEYWORDS, C_STYLE, { preprocessor: true }),
	define("javascript", ["js", "mjs", "cjs", "jsx"], [
		"break", "case", "catch", "class", "const", "continue", "debugger", "default",
		"delete", "do", "else", "export", "extends", "false", "finally", "for", "function",
		"if", "import", "in", "instanceof", "new", "null", "return", "super", "switch",
		"this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield",
		"await", "let", "static", "enum", "of",
	], C_STYLE, { dollar: true }),
	define("typescript", ["ts", "tsx", "mts", "cts"], [
		"break", "case", "catch", "class", "const", "continue", "debugger", "default",
		"delete", "do", "else", "export", "extends", "false", "finally", "for", "function",
		"if", "import", "in", "instanceof", "new", "null", "return", "super", "switch",
		"this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield",
		"await", "let", "static", "enum", "of", "type", "interface", "implements",
		"namespace", "abstract", "readonly", "declare", "keyof", "unique", "is", "asserts",
		"override", "public", "private", "protected", "as", "infer", "never", "unknown", "any",
	], C_STYLE, { dollar: true }),
	define("python", ["py", "pyw", "pyi"], [
		"False", "None", "True", "and", "as", "assert", "async", "await", "break", "class",
		"continue", "def", "del", "elif", "else", "except", "finally", "for", "from",
		"global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass",
		"raise", "return", "try", "while", "with", "yield",
	], HASH, { prefixedStrings: true }),
	define("csharp", ["cs"], [
		"abstract", "as", "base", "bool", "break", "byte", "case", "catch", "char", "checked",
		"class", "const", "continue", "decimal", "default", "delegate", "do", "double", "else",
		"enum", "event", "explicit", "extern", "false", "finally", "fixed", "float", "for",
		"foreach", "goto", "if", "implicit", "in", "int", "interface", "internal", "is", "lock",
		"long", "namespace", "new", "null", "object", "operator", "out", "override", "params",
		"private", "protected", "public", "readonly", "ref", "return", "sbyte", "sealed",
		"short", "sizeof", "stackalloc", "static", "string", "struct", "switch", "this", "throw",
		"true", "try", "typeof", "uint", "ulong", "unchecked", "unsafe", "ushort", "using",
		"virtual", "void", "volatile", "while", "add", "alias", "ascending", "async", "await",
		"by", "descending", "dynamic", "equals", "from", "get", "global", "group", "init",
		"into", "join", "let", "nameof", "notnull", "on", "orderby", "partial", "record",
		"remove", "required", "select", "set", "unmanaged", "value", "var", "when", "where",
		"with", "yield",
	], C_STYLE, { verbatimAt: true }),
	define("go", ["go"], [
		"break", "default", "func", "interface", "select", "case", "defer", "go", "map",
		"struct", "chan", "else", "goto", "package", "switch", "const", "fallthrough", "if",
		"range", "type", "continue", "for", "import", "return", "var",
	], C_STYLE),
	define("rust", ["rs"], [
		"as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum",
		"extern", "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod",
		"move", "mut", "pub", "ref", "return", "self", "Self", "static", "struct", "super",
		"trait", "true", "type", "unsafe", "use", "where", "while",
	], C_STYLE, { lifetimes: true }),
	define("php", ["php"], [
		"abstract", "and", "array", "as", "break", "callable", "case", "catch", "class", "clone",
		"const", "continue", "declare", "default", "die", "do", "echo", "else", "elseif", "empty",
		"enddeclare", "endfor", "endforeach", "endif", "endswitch", "endwhile", "eval", "exit",
		"extends", "final", "finally", "fn", "for", "foreach", "function", "global", "goto", "if",
		"implements", "include", "include_once", "instanceof", "insteadof", "interface", "isset",
		"list", "match", "namespace", "new", "or", "print", "private", "protected", "public",
		"require", "require_once", "return", "static", "switch", "throw", "trait", "try", "unset",
		"use", "var", "while", "xor", "yield", "true", "false", "null",
	], PHP_STYLE, { dollar: true, caseInsensitive: true }),
	define("ruby", ["rb"], [
		"BEGIN", "END", "alias", "and", "begin", "break", "case", "class", "def", "defined?",
		"do", "else", "elsif", "end", "ensure", "false", "for", "if", "in", "module", "next",
		"nil", "not", "or", "redo", "rescue", "retry", "return", "self", "super", "then", "true",
		"undef", "unless", "until", "when", "while", "yield",
	], HASH, { atPrefix: true, identSuffix: "?!" }),
	define("kotlin", ["kt", "kts"], [
		"as", "break", "class", "continue", "do", "else", "false", "for", "fun", "if", "in",
		"interface", "is", "null", "object", "package", "return", "super", "this", "throw",
		"true", "try", "typealias", "typeof", "val", "var", "when", "while", "by", "catch",
		"constructor", "delegate", "dynamic", "field", "file", "finally", "get", "import",
		"init", "param", "property", "receiver", "set", "setparam", "where", "actual", "abstract",
		"annotation", "companion", "const", "crossinline", "data", "enum", "expect", "external",
		"final", "infix", "inline", "inner", "internal", "lateinit", "noinline", "open",
		"operator", "out", "override", "private", "protected", "public", "reified", "sealed",
		"suspend", "tailrec", "vararg",
	], C_STYLE),
	define("swift", ["swift"], [
		"associatedtype", "class", "deinit", "enum", "extension", "fileprivate", "func", "import",
		"init", "inout", "internal", "let", "open", "operator", "private", "protocol", "public",
		"rethrows", "static", "struct", "subscript", "typealias", "var", "break", "case",
		"continue", "default", "defer", "do", "else", "fallthrough", "for", "guard", "if", "in",
		"repeat", "return", "switch", "where", "while", "as", "catch", "false", "is", "nil",
		"super", "self", "Self", "throw", "throws", "true", "try",
	], C_STYLE),
	define("scala", ["scala", "sc"], [
		"abstract", "case", "catch", "class", "def", "do", "else", "extends", "false", "final",
		"finally", "for", "forSome", "if", "implicit", "import", "lazy", "match", "new", "null",
		"object", "override", "package", "private", "protected", "return", "sealed", "super",
		"this", "throw", "trait", "true", "try", "type", "val", "var", "while", "with", "yield",
	], C_STYLE, { dollar: true }),
	define("dart", ["dart"], [
		"assert", "break", "case", "catch", "class", "const", "continue", "default", "do",
		"else", "enum", "extends", "false", "final", "finally", "for", "if", "in", "is", "new",
		"null", "rethrow", "return", "super", "switch", "this", "throw", "true", "try", "var",
		"void", "while", "with", "async", "await", "yield", "sync", "abstract", "as", "covariant",
		"deferred", "dynamic", "export", "extension", "external", "factory", "get", "implements",
		"import", "interface", "late", "library", "mixin", "on", "operator", "part", "required",
		"set", "show", "static", "typedef",
	], C_STYLE, { dollar: true }),
	define("sql", ["sql"], [
		"select", "from", "where", "and", "or", "not", "insert", "into", "values", "update",
		"set", "delete", "create", "table", "view", "index", "drop", "alter", "join", "inner",
		"left", "right", "full", "outer", "on", "group", "by", "order", "having", "as",
		"distinct", "union", "all", "limit", "offset", "case", "when", "then", "else", "end",
		"null", "is", "like", "between", "exists", "in", "primary", "key", "foreign",
		"references", "constraint", "default", "unique", "check", "begin", "commit", "rollback",
		"transaction", "grant", "revoke", "with", "recursive", "over", "partition", "row",
		"rows", "range", "fetch", "next", "only", "returning", "procedure", "function",
		"trigger", "declare", "cursor", "open", "close", "loop", "while", "if", "elsif",
		"return", "true", "false", "join",
	], SQL_STYLE, { caseInsensitive: true }),
	define("shell", ["sh", "bash", "zsh"], [
		"if", "then", "else", "elif", "fi", "case", "esac", "for", "while", "until", "do",
		"done", "in", "function", "select", "time", "coproc",
	], HASH, { dollar: true }),
	define("powershell", ["ps1", "psm1"], [
		"begin", "break", "catch", "class", "continue", "data", "define", "do", "dynamicparam",
		"else", "elseif", "end", "exit", "filter", "finally", "for", "foreach", "from",
		"function", "if", "in", "param", "process", "return", "switch", "throw", "trap", "try",
		"until", "using", "var", "while",
	], POWERSHELL_STYLE, { caseInsensitive: true, dollar: true }),
	define("perl", ["pl", "pm"], [
		"if", "elsif", "else", "unless", "while", "until", "for", "foreach", "do", "sub",
		"package", "use", "require", "return", "my", "our", "local", "state", "next", "last",
		"redo", "goto", "given", "when", "default", "and", "or", "not", "xor",
	], HASH, { dollar: true, atPrefix: true }),
	define("lua", ["lua"], [
		"and", "break", "do", "else", "elseif", "end", "false", "for", "function", "goto", "if",
		"in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while",
	], LUA_STYLE),
	define("r", ["r"], [
		"if", "else", "repeat", "while", "function", "for", "in", "next", "break", "TRUE",
		"FALSE", "NULL", "Inf", "NaN", "NA",
	], HASH),
	define("haskell", ["hs"], [
		"case", "class", "data", "default", "deriving", "do", "else", "forall", "if", "import",
		"in", "infix", "infixl", "infixr", "instance", "let", "module", "newtype", "of",
		"qualified", "then", "type", "where",
	], HASKELL_STYLE),
	define("elixir", ["ex", "exs"], [
		"alias", "and", "after", "case", "catch", "cond", "def", "defp", "defmacro", "defmacrop",
		"defmodule", "defstruct", "do", "else", "end", "false", "fn", "for", "if", "import",
		"in", "nil", "not", "or", "quote", "raise", "receive", "require", "rescue", "super",
		"throw", "true", "try", "unless", "unquote", "use", "when", "with",
	], HASH, { atPrefix: true, identSuffix: "?!" }),
	define("erlang", ["erl", "hrl"], [
		"after", "and", "andalso", "band", "begin", "bnot", "bor", "bsl", "bsr", "bxor", "case",
		"catch", "cond", "div", "end", "fun", "if", "let", "not", "of", "or", "orelse",
		"receive", "rem", "try", "when", "xor",
	], { lineComments: ["%"], blockComments: [] }),
	define("objectivec", ["m", "mm"], [
		"auto", "break", "case", "char", "const", "continue", "default", "do", "double", "else",
		"enum", "extern", "float", "for", "goto", "if", "int", "long", "register", "return",
		"short", "signed", "sizeof", "static", "struct", "switch", "typedef", "union",
		"unsigned", "void", "volatile", "while", "@interface", "@implementation", "@end",
		"@property", "@synthesize", "@dynamic", "@class", "@selector", "@protocol", "@public",
		"@private", "@protected", "@optional", "@required", "@try", "@catch", "@throw",
		"@finally", "@synchronized", "@autoreleasepool", "self", "super", "nil", "YES", "NO",
		"in", "id",
	], C_STYLE, { atPrefix: true }),
	define("groovy", ["groovy", "gvy"], [
		"abstract", "assert", "break", "case", "catch", "class", "const", "continue", "def",
		"default", "do", "else", "enum", "extends", "final", "finally", "for", "goto", "if",
		"implements", "import", "in", "instanceof", "interface", "native", "new", "package",
		"return", "static", "strictfp", "super", "switch", "synchronized", "this", "throw",
		"throws", "trait", "transient", "try", "var", "volatile", "while", "as", "true", "false",
		"null",
	], C_STYLE, { dollar: true }),
	define("zig", ["zig"], [
		"addrspace", "align", "allowzero", "and", "anyframe", "anytype", "asm", "async", "await",
		"break", "callconv", "catch", "comptime", "const", "continue", "defer", "else", "enum",
		"errdefer", "error", "export", "extern", "fn", "for", "if", "inline", "noalias",
		"noinline", "nosuspend", "opaque", "or", "orelse", "packed", "pub", "resume", "return",
		"linksection", "struct", "suspend", "switch", "test", "threadlocal", "try", "union",
		"unreachable", "usingnamespace", "var", "volatile", "while",
	], C_STYLE),
	define("julia", ["jl"], [
		"baremodule", "begin", "break", "catch", "const", "continue", "do", "else", "elseif",
		"end", "export", "false", "finally", "for", "function", "global", "if", "import",
		"let", "local", "macro", "module", "quote", "return", "struct", "true", "try", "using",
		"while", "in", "isa", "where",
	], HASH),
	define("vb", ["vb"], [
		"addhandler", "addressof", "alias", "and", "andalso", "as", "boolean", "byref", "byte",
		"byval", "call", "case", "catch", "cbool", "cbyte", "cchar", "cdate", "cdbl", "cdec",
		"cint", "class", "clng", "cobj", "const", "continue", "csbyte", "cshort", "csng",
		"cstr", "ctype", "cuint", "culng", "cushort", "date", "decimal", "declare", "default",
		"delegate", "dim", "directcast", "do", "double", "each", "else", "elseif", "end",
		"endif", "enum", "erase", "error", "event", "exit", "false", "finally", "for", "friend",
		"function", "get", "gettype", "getxmlnamespace", "global", "gosub", "goto", "handles",
		"if", "implements", "imports", "in", "inherits", "integer", "interface", "is", "isnot",
		"let", "lib", "like", "long", "loop", "me", "mod", "module", "mustinherit",
		"mustoverride", "mybase", "myclass", "namespace", "narrowing", "new", "next", "not",
		"nothing", "notinheritable", "notoverridable", "object", "of", "on", "operator",
		"option", "optional", "or", "orelse", "overloads", "overridable", "overrides", "paramarray",
		"partial", "private", "property", "protected", "public", "raiseevent", "readonly",
		"redim", "removehandler", "resume", "return", "sbyte", "select", "set", "shadows",
		"shared", "short", "single", "static", "step", "stop", "string", "structure", "sub",
		"synclock", "then", "throw", "to", "true", "try", "trycast", "typeof", "uinteger",
		"ulong", "ushort", "using", "variant", "wend", "when", "while", "widening", "with",
		"withevents", "writeonly", "xor",
	], { lineComments: ["'"], blockComments: [] }, { caseInsensitive: true }),
	define("fsharp", ["fs", "fsx"], [
		"abstract", "and", "as", "assert", "base", "begin", "class", "default", "delegate", "do",
		"done", "downcast", "downto", "elif", "else", "end", "exception", "extern", "false",
		"finally", "for", "fun", "function", "global", "if", "in", "inherit", "inline",
		"interface", "internal", "lazy", "let", "let!", "match", "member", "module", "mutable",
		"namespace", "new", "null", "of", "open", "or", "override", "private", "public", "rec",
		"return", "return!", "select", "static", "struct", "then", "to", "true", "try", "type",
		"upcast", "use", "use!", "val", "void", "when", "while", "with", "yield", "yield!",
	], C_STYLE),
	define("clojure", ["clj", "cljs", "cljc"], [
		"def", "defn", "defmacro", "defonce", "ns", "fn", "let", "if", "if-let", "when",
		"when-let", "cond", "case", "loop", "recur", "do", "quote", "var", "try", "catch",
		"finally", "throw", "and", "or", "not", "true", "false", "nil", "deftype", "defrecord",
		"defprotocol", "reify", "for", "doseq", "dotimes",
	], { lineComments: [";"], blockComments: [] }, { identPartExtra: "*!?+-/" }),
	define("fortran", ["f90", "f95", "f03", "f08"], [
		"program", "end", "subroutine", "function", "module", "use", "implicit", "integer",
		"real", "complex", "character", "logical", "type", "dimension", "parameter", "data",
		"common", "if", "then", "else", "elseif", "endif", "do", "while", "enddo", "continue",
		"cycle", "exit", "goto", "return", "stop", "call", "read", "write", "open", "close",
		"format", "print", "allocate", "deallocate", "nullify", "intent", "optional", "pointer",
		"target", "allocatable", "save", "public", "private", "contains", "interface", "select",
		"case", "where", "forall", "procedure", "result", "recursive", "elemental", "pure",
		"associate", "block", "critical", "enum", "abstract", "import", "only", "none",
	], { lineComments: ["!"], blockComments: [] }, { caseInsensitive: true }),
	define("solidity", ["sol"], [
		"pragma", "solidity", "contract", "interface", "library", "function", "modifier", "event",
		"error", "struct", "enum", "mapping", "address", "bool", "string", "bytes", "int", "uint",
		"if", "else", "for", "while", "do", "break", "continue", "return", "returns", "emit",
		"try", "catch", "throw", "new", "delete", "public", "private", "internal", "external",
		"pure", "view", "payable", "constant", "immutable", "memory", "storage", "calldata",
		"override", "virtual", "abstract", "is", "using", "assembly", "let", "switch", "case",
		"default", "true", "false",
	], C_STYLE),
	define("ocaml", ["ml", "mli"], [
		"and", "as", "assert", "asr", "begin", "class", "constraint", "do", "done", "downto",
		"else", "end", "exception", "external", "false", "for", "fun", "function", "functor",
		"if", "in", "include", "inherit", "initializer", "land", "lazy", "let", "lor", "lsl",
		"lsr", "lxor", "match", "method", "mod", "module", "mutable", "new", "nonrec", "object",
		"of", "open", "or", "private", "rec", "sig", "struct", "then", "to", "true", "try",
		"type", "val", "virtual", "when", "while", "with",
	], ML_STYLE),
	define("pascal", ["pas", "dpr", "pp"], [
		"program", "begin", "end", "if", "then", "else", "while", "do", "for", "to", "downto",
		"repeat", "until", "procedure", "function", "var", "const", "type", "array", "of",
		"record", "case", "with", "uses", "unit", "interface", "implementation", "and", "or",
		"not", "div", "mod", "nil", "true", "false", "string", "integer", "real", "boolean",
		"char", "file", "set", "packed", "goto", "label", "in",
	], C_STYLE, { caseInsensitive: true }),
	define("ada", ["adb", "ads"], [
		"procedure", "function", "is", "begin", "end", "if", "then", "else", "elsif", "while",
		"loop", "for", "in", "return", "package", "type", "subtype", "record", "array", "of",
		"range", "null", "and", "or", "not", "xor", "abs", "mod", "rem", "new", "with", "use",
		"declare", "exception", "when", "others", "case", "exit", "goto", "raise", "constant",
		"access", "all", "limited", "private", "abstract", "interface", "task", "entry", "accept",
		"select", "delay", "protected", "generic", "body", "out", "reverse",
	], { lineComments: ["--"], blockComments: [] }, { caseInsensitive: true }),
	define("cobol", ["cbl", "cob", "cobol"], [
		"identification", "division", "program-id", "environment", "data", "procedure",
		"section", "working-storage", "pic", "picture", "perform", "until", "varying", "if",
		"else", "end-if", "evaluate", "when", "move", "to", "add", "subtract", "multiply",
		"divide", "compute", "display", "accept", "stop", "run", "goback", "exit", "call",
		"using", "into", "from", "by", "not", "and", "or", "true", "false",
	], { lineComments: ["*>"], blockComments: [] }, { caseInsensitive: true, hyphenIdent: true }),
	define("lisp", ["lisp", "lsp", "cl"], [
		"defun", "defmacro", "defvar", "defparameter", "defconstant", "let", "let*", "if",
		"when", "unless", "cond", "case", "lambda", "progn", "setq", "setf", "quote", "function",
		"loop", "do", "dolist", "dotimes", "return", "return-from", "block", "catch", "throw",
		"declare", "and", "or", "not", "t", "nil",
	], { lineComments: [";"], blockComments: [] }, { identPartExtra: "*!?+-/" }),
	define("scheme", ["scm", "ss"], [
		"define", "lambda", "let", "let*", "letrec", "if", "cond", "case", "and", "or", "not",
		"begin", "do", "delay", "quote", "set!", "define-syntax", "call/cc",
	], { lineComments: [";"], blockComments: [["#|", "|#"]] }, { identPartExtra: "*!?+-/" }),
	define("awk", ["awk"], [
		"BEGIN", "END", "if", "else", "while", "do", "for", "in", "break", "continue", "next",
		"exit", "return", "function", "delete", "print", "printf",
	], HASH, { dollar: true }),
	define("nim", ["nim"], [
		"addr", "and", "as", "asm", "bind", "block", "break", "case", "cast", "concept", "const",
		"continue", "converter", "defer", "discard", "distinct", "div", "do", "elif", "else",
		"end", "enum", "except", "export", "finally", "for", "from", "func", "if", "import",
		"in", "include", "interface", "is", "isnot", "iterator", "let", "macro", "method",
		"mixin", "mod", "nil", "not", "notin", "object", "of", "or", "out", "proc", "ptr",
		"raise", "ref", "return", "shl", "shr", "static", "template", "try", "tuple", "type",
		"using", "var", "when", "while", "xor", "yield",
	], HASH),
	define("d", ["d"], [
		"abstract", "alias", "align", "asm", "assert", "auto", "body", "bool", "break", "byte",
		"case", "cast", "catch", "cdouble", "cent", "cfloat", "char", "class", "const",
		"continue", "creal", "dchar", "debug", "default", "delegate", "delete", "deprecated",
		"do", "double", "else", "enum", "export", "extern", "false", "final", "finally", "float",
		"for", "foreach", "foreach_reverse", "function", "goto", "idouble", "if", "ifloat",
		"immutable", "import", "in", "inout", "int", "interface", "invariant", "ireal", "is",
		"lazy", "long", "macro", "mixin", "module", "new", "nothrow", "null", "out", "override",
		"package", "pragma", "private", "protected", "public", "pure", "real", "ref", "return",
		"scope", "shared", "short", "static", "struct", "super", "switch", "synchronized",
		"template", "this", "throw", "true", "try", "typeid", "typeof", "ubyte", "ucent", "uint",
		"ulong", "union", "unittest", "ushort", "version", "void", "wchar", "while", "with",
	], C_STYLE),
	define("elm", ["elm"], [
		"if", "then", "else", "case", "of", "let", "in", "type", "alias", "module", "import",
		"exposing", "as", "port", "where",
	], { lineComments: ["--"], blockComments: [["{-", "-}"]] }),
	define("graphql", ["graphql", "gql"], [
		"query", "mutation", "subscription", "fragment", "on", "type", "interface", "union",
		"enum", "input", "scalar", "schema", "extend", "implements", "directive", "true",
		"false", "null",
	], HASH),
];

const BY_EXTENSION = new Map();
for (let i = 0; i < LANGUAGES.length; i += 1) {
	const language = LANGUAGES[i];
	for (let e = 0; e < language.extensions.length; e += 1) {
		BY_EXTENSION.set(language.extensions[e], language);
	}
}

/**
 * @param {string} extension extension without the leading dot
 * @returns {object|null}
 */
function getModernLanguage(extension) {
	return BY_EXTENSION.get(String(extension).toLowerCase()) || null;
}

/**
 * Comment and preprocessor rules for the source viewer.
 * @param {string} extension
 */
function syntaxForExtension(extension) {
	const language = getModernLanguage(extension);
	if (!language) {
		return { lineComments: [], blockComments: [], preprocessor: false };
	}
	return {
		lineComments: language.lineComments,
		blockComments: language.blockComments,
		preprocessor: language.preprocessor,
	};
}

module.exports = {
	OPERATORS,
	JAVA_KEYWORDS,
	C_KEYWORDS,
	CPP_KEYWORDS,
	getModernLanguage,
	syntaxForExtension,
	modernExtensions: Array.from(BY_EXTENSION.keys()),
};
