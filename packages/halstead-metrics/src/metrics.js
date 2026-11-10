"use strict";

const SYMBOLS = [
	"+", "++", "-", "--", "*", ".", ";", "/", "%", "!", ">", "<", ">=", "<=",
	"==", "=", ":", "~",
];

const BRACE_PAIRS = [
	["{", "}"],
	["(", ")"],
	["[", "]"],
	["<", ">"],
];

/**
 * Insertion-ordered multiset, matching Operators/Operands ArrayLists.
 */
class Counter {
	constructor() {
		this.names = [];
		this.counts = [];
	}

	/**
	 * @param {string} name
	 * @param {number} [amount]
	 */
	add(name, amount) {
		const step = amount === undefined ? 1 : amount;
		const index = this.names.indexOf(name);
		if (index === -1) {
			this.names.push(name);
			this.counts.push(step);
			return;
		}
		this.counts[index] += step;
	}

	/**
	 * @returns {boolean}
	 */
	has(name) {
		return this.names.indexOf(name) !== -1;
	}

	/**
	 * @returns {Array<[string, number]>}
	 */
	entries() {
		const pairs = [];
		for (let i = 0; i < this.names.length; i += 1) {
			pairs.push([this.names[i], this.counts[i]]);
		}
		return pairs;
	}
}

/**
 * Same pipeline as Initiator: keywords, symbols, brace pairs, then leftovers.
 * @param {string[]} tokens
 * @param {Set<string>|null} keywords
 */
function classify(tokens, keywords) {
	const operators = new Counter();
	const operands = new Counter();

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (keywords && keywords.has(token)) {
			operators.add(token);
		} else if (token.charAt(0) === "\"") {
			operands.add(token);
		}
	}

	for (let s = 0; s < SYMBOLS.length; s += 1) {
		const symbol = SYMBOLS[s];
		let count = 0;
		for (let i = 0; i < tokens.length; i += 1) {
			if (tokens[i] === symbol) {
				count += 1;
			}
		}
		if (count > 0) {
			operators.add(symbol, count);
		}
	}

	for (let b = 0; b < BRACE_PAIRS.length; b += 1) {
		const open = BRACE_PAIRS[b][0];
		const close = BRACE_PAIRS[b][1];
		let startCount = 0;
		let endCount = 0;
		for (let i = 0; i < tokens.length; i += 1) {
			if (tokens[i] === open) {
				startCount += 1;
			} else if (tokens[i] === close) {
				endCount += 1;
			}
		}
		if (startCount === endCount && startCount > 0) {
			operators.add(open + " " + close, startCount);
		}
	}

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (operators.has(token) || operands.has(token) || token === "<EOF>") {
			continue;
		}
		operands.add(token);
	}

	return evaluate(operators, operands);
}

/**
 * Formulas from MetricsEvaluator.
 * @param {Counter} operators
 * @param {Counter} operands
 */
function evaluate(operators, operands) {
	const n1 = operators.names.length;
	const n2 = operands.names.length;
	let N1 = 0;
	let N2 = 0;
	for (let i = 0; i < operators.counts.length; i += 1) {
		N1 += operators.counts[i];
	}
	for (let i = 0; i < operands.counts.length; i += 1) {
		N2 += operands.counts[i];
	}

	const programLength = N1 + N2;
	const programVocabulary = n1 + n2;
	const estimatedLength = (n1 * (Math.log(n1) / Math.log(2))) + (n2 * (Math.log(n2) / Math.log(2)));
	const purityRatio = estimatedLength / programLength;
	const volume = programLength * (Math.log(programVocabulary) / Math.log(2));
	const difficulty = (n1 / 2) * (N2 / n2);
	const effort = volume * difficulty;
	const programmingTime = effort / 18;

	return {
		n1: n1,
		n2: n2,
		N1: N1,
		N2: N2,
		vocabulary: programVocabulary,
		length: programLength,
		estimatedLength: estimatedLength,
		purityRatio: purityRatio,
		volume: volume,
		difficulty: difficulty,
		effort: effort,
		programmingTime: programmingTime,
		operators: operators,
		operands: operands,
	};
}

/**
 * DecimalFormat("###.##") with HALF_EVEN, then parsed back to a number.
 * Non-finite values become null, matching json-simple.
 * @param {number} value
 * @returns {number|null}
 */
function roundTo2Decimals(value) {
	if (!Number.isFinite(value)) {
		return null;
	}
	const negative = value < 0;
	const scaled = Math.abs(value) * 100;
	const floor = Math.floor(scaled + 1e-10);
	const fraction = scaled - floor;
	let digits = floor;
	if (fraction > 0.5 + 1e-10) {
		digits = floor + 1;
	} else if (Math.abs(fraction - 0.5) <= 1e-10) {
		digits = floor % 2 === 0 ? floor : floor + 1;
	}
	const rounded = (negative ? -digits : digits) / 100;
	return Number(rounded.toFixed(2));
}

/**
 * Java `"" + RoundTo2Decimals(value)`: whole numbers keep one decimal place.
 * @param {number} value
 * @returns {string}
 */
function formatRounded(value) {
	const rounded = roundTo2Decimals(value);
	if (rounded === null) {
		return "";
	}
	if (Number.isInteger(rounded)) {
		return rounded.toFixed(1);
	}
	return String(rounded);
}

/**
 * JSON document printed by cli.NewMain.
 * @param {ReturnType<typeof evaluate>} metrics
 * @param {string} filename
 */
function toReport(metrics, filename) {
	const operatorMap = {};
	const operators = metrics.operators.entries();
	for (let i = 0; i < operators.length; i += 1) {
		operatorMap[operators[i][0]] = String(operators[i][1]);
	}
	const operandMap = {};
	const operands = metrics.operands.entries();
	for (let i = 0; i < operands.length; i += 1) {
		operandMap[operands[i][0]] = String(operands[i][1]);
	}

	return {
		Halstead: {
			n1: metrics.n1,
			n2: metrics.n2,
			N1: metrics.N1,
			N2: metrics.N2,
			Vocabulary: roundTo2Decimals(metrics.vocabulary),
			Length: roundTo2Decimals(metrics.length),
			"Estimated program length": roundTo2Decimals(metrics.estimatedLength),
			Volume: roundTo2Decimals(metrics.volume),
			Difficulty: roundTo2Decimals(metrics.difficulty),
			Effort: roundTo2Decimals(metrics.effort),
			"Programming time": roundTo2Decimals(metrics.programmingTime),
			"Purity ratio": roundTo2Decimals(metrics.purityRatio),
			_Operands: operandMap,
			_Operators: operatorMap,
		},
		filename: filename,
	};
}

module.exports = {
	Counter,
	classify,
	evaluate,
	roundTo2Decimals,
	formatRounded,
	toReport,
	SYMBOLS,
};
