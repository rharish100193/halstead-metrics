"use strict";

const path = require("path");

const { formatRounded } = require("./metrics");

const VALUE_ROWS = [
	["No of Distinct Operators(n1)", "n1"],
	["No of Distinct Operands(n2)", "n2"],
	["Total No of Operators(N1)", "N1"],
	["Total No of Operands(N2)", "N2"],
	["Program Length", "length"],
	["Program Vocabulary", "vocabulary"],
	["Estimated Length", "estimatedLength"],
	["Purity Ratio", "purityRatio"],
	["Volume", "volume"],
	["Difficulty", "difficulty"],
	["Program Effort", "effort"],
	["Programming Time", "programmingTime"],
];

/**
 * Report stem: everything before the first dot.
 * @param {string} filename
 * @returns {string}
 */
function reportBaseName(filename) {
	const base = path.basename(String(filename));
	const dot = base.indexOf(".");
	return dot === -1 ? base : base.slice(0, dot);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

const ABOUT = [
	"Halstead software science treats a program as a sequence of operators and operands. The four base counts are the distinct operators (n1), the distinct operands (n2), the total operators (N1), and the total operands (N2). Vocabulary and length are those counts added together. Volume, difficulty, effort, and programming time are calculated from them.",
	"The measures describe the size of the implementation and how much mental work the token mix implies. They are not a defect count, a coverage figure, or a statement about runtime performance.",
];

const FORMULAS = [
	["Vocabulary", "n1 + n2"],
	["Program length", "N1 + N2"],
	["Estimated length", "n1 log2(n1) + n2 log2(n2)"],
	["Purity ratio", "estimated length / program length"],
	["Volume", "program length \u00d7 log2(vocabulary)"],
	["Difficulty", "(n1 / 2) \u00d7 (N2 / n2)"],
	["Effort", "volume \u00d7 difficulty"],
	["Programming time", "effort / 18 seconds"],
];

const SCOPE = [
	"This report covers one source file. Comments are left out. Keywords and operators are counted as operators. Identifiers, numbers, and quoted strings are counted as operands. When a brace pair is balanced, that pair is recorded as one more operator.",
	"Compare files in the same language that do similar work. A larger number means a larger or more demanding implementation under this model. It is not, by itself, a pass or fail result.",
];

const SUMMARY_KEYS = [
	["Length", "length"],
	["Vocabulary", "vocabulary"],
	["Volume", "volume"],
	["Difficulty", "difficulty"],
	["Effort", "effort"],
	["Time", "programmingTime"],
];

/**
 * Sentences that explain this file's measured values.
 * @param {object} metrics
 * @returns {string[]}
 */
function readingFor(metrics) {
	const purity = metrics.purityRatio;
	let purityNote = "Purity ratio is not defined for this count.";
	if (Number.isFinite(purity) && metrics.length > 0) {
		if (purity < 0.85) {
			purityNote = "Purity ratio is " + formatRounded(purity) + ". The measured length is longer than the length estimated from the vocabulary, so operators or operands are repeated more than a compact expression of the same tokens would suggest.";
		} else if (purity > 1.15) {
			purityNote = "Purity ratio is " + formatRounded(purity) + ". The measured length is shorter than the length estimated from the vocabulary. The file introduces many distinct operators or operands and uses each of them only a few times.";
		} else {
			purityNote = "Purity ratio is " + formatRounded(purity) + ". The measured length is close to the length estimated from the vocabulary, which is what the Halstead length equation expects for this mix of tokens.";
		}
	}

	const volumeNote = Number.isFinite(metrics.volume)
		? "Volume is " + formatRounded(metrics.volume) + ". That is the information size of the implementation, in bits. A larger volume means more of the program has to be accounted for, token by token."
		: "Volume is not defined for this count.";

	let difficultyNote = "Difficulty is not defined for this count.";
	if (Number.isFinite(metrics.difficulty) && metrics.n2 > 0) {
		const reuse = formatRounded(metrics.N2 / metrics.n2);
		difficultyNote = "Difficulty is " + formatRounded(metrics.difficulty) + ". It rises when there are many distinct operators, or when operands are reused often. This file has " + metrics.n1 + " distinct operators and " + metrics.n2 + " distinct operands, and each distinct operand appears about " + reuse + " times.";
	}

	let timeNote = "Programming time is not defined for this count.";
	if (Number.isFinite(metrics.programmingTime)) {
		timeNote = "Programming time is " + formatRounded(metrics.programmingTime) + " seconds. Halstead divides effort by 18, an estimate of elementary mental discriminations per second. Use it to compare files with each other, not as a clock of how long the file took to write.";
		if (metrics.programmingTime >= 60) {
			timeNote += " That is about " + formatRounded(metrics.programmingTime / 60) + " minutes on the same scale.";
		}
	}

	return [purityNote, volumeNote, difficultyNote, timeNote];
}

/**
 * @param {string[]} paragraphs
 * @returns {string}
 */
function prose(paragraphs) {
	let html = "<div class=\"prose\">";
	for (let i = 0; i < paragraphs.length; i += 1) {
		html += "<p>" + escapeHtml(paragraphs[i]) + "</p>";
	}
	return html + "</div>";
}

/**
 * @param {object} metrics
 * @returns {string}
 */
function summaryCards(metrics) {
	let html = "<div class=\"stats\">";
	for (let i = 0; i < SUMMARY_KEYS.length; i += 1) {
		html += "<div class=\"stat\"><span>" + SUMMARY_KEYS[i][0] + "</span><strong>"
			+ escapeHtml(formatRounded(metrics[SUMMARY_KEYS[i][1]])) + "</strong></div>";
	}
	return html + "</div>";
}

/**
 * @returns {string}
 */
function formulaTable() {
	let rows = "<tr><th>Measure</th><th>Formula</th></tr>";
	for (let i = 0; i < FORMULAS.length; i += 1) {
		rows += "<tr><td>" + escapeHtml(FORMULAS[i][0]) + "</td><td>"
			+ escapeHtml(FORMULAS[i][1]) + "</td></tr>";
	}
	return "<div class=\"sheet formulas\"><table>" + rows + "</table></div>";
}

/**
 * @param {Array<[string, number]>} entries
 * @returns {string}
 */
function countTable(entries) {
	let rows = "<tr><th>Name</th><th>Count</th></tr>";
	for (let i = 0; i < entries.length; i += 1) {
		rows += "<tr><td>" + escapeHtml(entries[i][0]) + "</td><td>"
			+ escapeHtml(entries[i][1]) + "</td></tr>";
	}
	return "<div class=\"sheet\"><table>" + rows + "</table></div>";
}

/**
 * Detailed HTML report: operators, operands, and metric values.
 * @param {object} metrics result of analyzeSource
 * @param {string} filename display name, usually the source file name
 * @returns {string}
 */
function renderHtmlReport(metrics, filename) {
	const fileName = path.basename(String(filename));
	let values = "";
	for (let i = 0; i < VALUE_ROWS.length; i += 1) {
		const label = VALUE_ROWS[i][0];
		const key = VALUE_ROWS[i][1];
		values += "<tr><th>" + label + "</th><td>" + escapeHtml(formatRounded(metrics[key])) + "</td></tr>";
	}

	return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">"
		+ "<title>Halstead Metrics</title>"
		+ "<style>"
		+ "html,body{margin:0;background:#f3f4f6;color:#18181b;font:14px/1.45 ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif;letter-spacing:-0.011em;}"
		+ "#layout{box-sizing:border-box;width:min(800px,calc(100% - 32px));margin:24px auto;padding:24px 28px 20px;background:#fff;border:1px solid #e4e4e7;border-radius:14px;box-shadow:0 1px 2px rgba(24,24,27,.04),0 8px 24px rgba(24,24,27,.04);}"
		+ ".brand{display:flex;align-items:center;gap:10px;margin-bottom:18px;}"
		+ ".mark{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:#18181b;color:#fff;font-weight:650;letter-spacing:-0.04em;}"
		+ ".brand-name{font-weight:650;letter-spacing:-0.03em;}"
		+ ".brand-sub{color:#71717a;font-size:12px;}"
		+ "h1{margin:0;font-size:28px;font-weight:650;letter-spacing:-0.03em;}"
		+ ".lede{margin:6px 0 18px;color:#71717a;font-size:13px;}"
		+ ".file{margin:0 0 22px;padding:12px 14px;border:1px solid #e4e4e7;border-radius:12px;background:#fafafa;font-size:20px;font-weight:650;letter-spacing:-0.03em;}"
		+ ".file h3{margin:0 0 2px;color:#71717a;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;}"
		+ "h4{margin:26px 0 8px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#71717a;}"
		+ ".stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}"
		+ ".stat{padding:10px 12px;border:1px solid #e4e4e7;border-radius:12px;background:#fafafa;}"
		+ ".stat span{display:block;color:#71717a;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;}"
		+ ".stat strong{display:block;margin-top:2px;font-size:20px;font-weight:650;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;}"
		+ ".prose p{margin:0 0 10px;color:#3f3f46;font-size:14px;line-height:1.55;}"
		+ ".callout{padding:12px 14px;border:1px solid #e0e7ff;border-left:3px solid #4f46e5;border-radius:12px;background:#f8faff;}"
		+ ".callout p:last-child{margin-bottom:0;}"
		+ ".sheet{overflow:hidden;border:1px solid #e4e4e7;border-radius:12px;}"
		+ "table{width:100%;border-collapse:collapse;background:#fff;}"
		+ "th,td{padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:left;}"
		+ "tr:last-child td,tr:last-child th{border-bottom:0;}"
		+ "th{background:#fafafa;font-size:12px;font-weight:600;}"
		+ "td:last-child,th:last-child{text-align:right;font-variant-numeric:tabular-nums;}"
		+ ".formulas td,.formulas th{text-align:left;font-variant-numeric:normal;}"
		+ "#footer{margin-top:22px;padding-top:14px;border-top:1px solid #e4e4e7;}"
		+ "#footer-contents{margin:0;color:#71717a;font-size:12px;}"
		+ "</style></head><body><div id=\"layout\">"
		+ "<header id=\"header\"><div class=\"brand\"><span class=\"mark\">H</span><div>"
		+ "<div class=\"brand-name\">Halstead</div><div class=\"brand-sub\">Metrics</div></div></div>"
		+ "<h1 id=\"heading\">Halstead Metrics Detailed Report</h1>"
		+ "<p class=\"lede\">Operators, operands, and the derived Halstead values for the open file.</p>"
		+ "</header><div id=\"body\">"
		+ "<div class=\"file\"><h3>File Name: </h3>" + escapeHtml(fileName) + "</div>"
		+ "<h4>Summary</h4>" + summaryCards(metrics)
		+ "<h4>About Halstead metrics</h4>" + prose(ABOUT)
		+ "<h4>Reading this file</h4><div class=\"callout\">" + prose(readingFor(metrics)) + "</div>"
		+ "<h4>Formulas</h4>" + formulaTable()
		+ "<h4>Operators</h4>" + countTable(metrics.operators.entries())
		+ "<h4>Operands</h4>" + countTable(metrics.operands.entries())
		+ "<h4>Measured values</h4><div class=\"sheet\"><table>" + values + "</table></div>"
		+ "<h4>How to use this report</h4>" + prose(SCOPE)
		+ "</div><footer id=\"footer\"><p id=\"footer-contents\">Copyright &copy; Harish Ramasubramanian</p></footer>"
		+ "</div></body></html>";
}

/**
 * @param {import("pdfkit")} doc
 * @returns {number}
 */
function contentWidth(doc) {
	return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

/**
 * Gray page with a white card, matching the HTML report canvas.
 * @param {import("pdfkit")} doc
 */
function paintPage(doc) {
	const inset = 22;
	doc.save();
	doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f3f4f6");
	doc.roundedRect(inset, inset, doc.page.width - inset * 2, doc.page.height - inset * 2, 14).fill("#ffffff");
	doc.restore();
}

/**
 * @param {import("pdfkit")} doc
 * @param {string} fileName
 */
function drawHeader(doc, fileName) {
	const left = doc.page.margins.left;
	const width = contentWidth(doc);
	const y = doc.y;
	doc.save();
	doc.roundedRect(left, y, 32, 32, 10).fill("#18181b");
	doc.restore();
	doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14);
	doc.text("H", left, y + 9, { width: 32, align: "center", lineBreak: false });
	doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(13);
	doc.text("Halstead", left + 42, y + 4, { lineBreak: false });
	doc.fillColor("#71717a").font("Helvetica").fontSize(10);
	doc.text("Metrics", left + 42, y + 18, { lineBreak: false });
	doc.x = left;
	doc.y = y + 48;
	doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(22);
	doc.text("Halstead Metrics Detailed Report", { width: width });
	doc.moveDown(0.25);
	doc.fillColor("#71717a").font("Helvetica").fontSize(11);
	doc.text("Operators, operands, and the derived Halstead values for the open file.", { width: width });
	doc.moveDown(0.7);
	const cardY = doc.y;
	const cardH = 50;
	doc.save();
	doc.roundedRect(left, cardY, width, cardH, 12).fillAndStroke("#fafafa", "#e4e4e7");
	doc.restore();
	doc.fillColor("#71717a").font("Helvetica-Bold").fontSize(8);
	doc.text("FILE NAME", left + 14, cardY + 10, { lineBreak: false });
	doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(16);
	doc.text(fileName, left + 14, cardY + 24, { width: width - 28, lineBreak: false });
	doc.x = left;
	doc.y = cardY + cardH + 8;
}

/**
 * @param {import("pdfkit")} doc
 * @param {object} metrics
 */
function drawStatGrid(doc, metrics) {
	const left = doc.page.margins.left;
	const width = contentWidth(doc);
	const gap = 8;
	const cols = 3;
	const cardW = (width - gap * (cols - 1)) / cols;
	const cardH = 48;
	const origin = doc.y;
	for (let i = 0; i < SUMMARY_KEYS.length; i += 1) {
		const col = i % cols;
		const row = Math.floor(i / cols);
		const x = left + col * (cardW + gap);
		const y = origin + row * (cardH + gap);
		doc.save();
		doc.roundedRect(x, y, cardW, cardH, 10).fillAndStroke("#fafafa", "#e4e4e7");
		doc.restore();
		doc.fillColor("#71717a").font("Helvetica-Bold").fontSize(8);
		doc.text(SUMMARY_KEYS[i][0].toUpperCase(), x + 10, y + 8, {
			width: cardW - 20,
			lineBreak: false,
		});
		doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(14);
		doc.text(formatRounded(metrics[SUMMARY_KEYS[i][1]]), x + 10, y + 22, {
			width: cardW - 20,
			lineBreak: false,
		});
	}
	const rows = Math.ceil(SUMMARY_KEYS.length / cols);
	doc.x = left;
	doc.y = origin + rows * (cardH + gap);
}

/**
 * @param {import("pdfkit")} doc
 * @param {Array<Array<{text: string, fill?: boolean, bold?: boolean}>>} rows
 * @param {{alignLast?: "left"|"right"}} [options]
 */
function drawTable(doc, rows, options) {
	const alignLast = options && options.alignLast === "left" ? "left" : "right";
	const left = doc.page.margins.left;
	const tableWidth = contentWidth(doc);
	const colWidths = [tableWidth * 0.62, tableWidth * 0.38];
	const heights = [];
	let total = 0;
	for (let r = 0; r < rows.length; r += 1) {
		const row = rows[r];
		let rowHeight = 24;
		for (let c = 0; c < row.length; c += 1) {
			const align = c === row.length - 1 ? alignLast : "left";
			doc.font(row[c].bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
			const textHeight = doc.heightOfString(String(row[c].text), {
				width: colWidths[c] - 20,
				align: align,
			});
			rowHeight = Math.max(rowHeight, textHeight + 12);
		}
		heights.push(rowHeight);
		total += rowHeight;
	}
	const bottom = doc.page.height - doc.page.margins.bottom;
	const fits = doc.y + total <= bottom;
	const startY = doc.y;
	if (fits) {
		doc.save();
		doc.roundedRect(left, startY, tableWidth, total, 10).clip();
	}
	for (let r = 0; r < rows.length; r += 1) {
		const row = rows[r];
		const rowHeight = heights[r];
		if (!fits && doc.y + rowHeight > bottom) {
			doc.addPage();
		}
		const y = doc.y;
		if (row[0].fill) {
			doc.save();
			doc.rect(left, y, tableWidth, rowHeight).fill("#fafafa");
			doc.restore();
		}
		if (r < rows.length - 1) {
			doc.save();
			doc.lineWidth(0.6).strokeColor("#e4e4e7");
			doc.moveTo(left, y + rowHeight).lineTo(left + tableWidth, y + rowHeight).stroke();
			doc.restore();
		}
		let x = left;
		for (let c = 0; c < row.length; c += 1) {
			const cell = row[c];
			const align = c === row.length - 1 ? alignLast : "left";
			doc.font(cell.bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#18181b");
			doc.text(String(cell.text), x + 10, y + 6, {
				width: colWidths[c] - 20,
				align: align,
				lineBreak: true,
			});
			x += colWidths[c];
		}
		doc.y = y + rowHeight;
		doc.x = left;
	}
	if (fits) {
		doc.restore();
		doc.save();
		doc.lineWidth(0.8).strokeColor("#e4e4e7");
		doc.roundedRect(left, startY, tableWidth, total, 10).stroke();
		doc.restore();
	}
	doc.x = left;
	doc.y = fits ? startY + total + 8 : doc.y + 8;
}

/**
 * Indigo reading panel, matching the HTML callout.
 * @param {import("pdfkit")} doc
 * @param {string[]} paragraphs
 */
function drawCallout(doc, paragraphs) {
	const left = doc.page.margins.left;
	const width = contentWidth(doc);
	const inner = width - 32;
	doc.font("Helvetica").fontSize(10.5);
	let textHeight = 8;
	for (let i = 0; i < paragraphs.length; i += 1) {
		textHeight += doc.heightOfString(paragraphs[i], { width: inner }) + 8;
	}
	if (doc.y + textHeight > doc.page.height - doc.page.margins.bottom) {
		doc.addPage();
	}
	const y = doc.y;
	doc.save();
	doc.roundedRect(left, y, width, textHeight, 12).fillAndStroke("#f8faff", "#e0e7ff");
	doc.rect(left, y + 10, 3, Math.max(8, textHeight - 20)).fill("#4f46e5");
	doc.restore();
	let cursor = y + 10;
	doc.fillColor("#3f3f46").font("Helvetica").fontSize(10.5);
	for (let i = 0; i < paragraphs.length; i += 1) {
		doc.text(paragraphs[i], left + 16, cursor, { width: inner });
		cursor = doc.y + 6;
	}
	doc.x = left;
	doc.y = y + textHeight + 10;
}

/**
 * @param {import("pdfkit")} doc
 * @param {string[]} paragraphs
 */
function drawParagraphs(doc, paragraphs) {
	const left = doc.page.margins.left;
	const width = contentWidth(doc);
	doc.fillColor("#3f3f46").font("Helvetica").fontSize(10.5);
	for (let i = 0; i < paragraphs.length; i += 1) {
		doc.x = left;
		doc.text(paragraphs[i], { width: width, lineGap: 2 });
		doc.moveDown(0.35);
	}
}

/**
 * @param {import("pdfkit")} doc
 * @param {string} text
 */
function drawHeading(doc, text) {
	const left = doc.page.margins.left;
	doc.x = left;
	doc.moveDown(0.45);
	doc.fillColor("#71717a").font("Helvetica-Bold").fontSize(9);
	doc.text(text.toUpperCase(), { characterSpacing: 0.6 });
	doc.moveDown(0.3);
}

/**
 * Printable report with the same sections as the HTML report.
 * @param {object} metrics
 * @param {string} filename
 * @returns {Promise<Buffer>}
 */
function renderPdfReport(metrics, filename) {
	const PDFDocument = require("pdfkit");
	const fileName = path.basename(String(filename));
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({
			size: "LETTER",
			compress: false,
			margins: { top: 46, bottom: 46, left: 46, right: 46 },
			info: {
				Title: "Halstead Metrics - " + reportBaseName(filename) + " Report",
				Author: "Harish Ramasubramanian",
				Subject: "Halstead Metrics Detailed Report for " + fileName,
			},
		});
		const chunks = [];
		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
		paintPage(doc);
		doc.on("pageAdded", () => paintPage(doc));

		drawHeader(doc, fileName);

		drawHeading(doc, "Summary");
		drawStatGrid(doc, metrics);

		drawHeading(doc, "About Halstead metrics");
		drawParagraphs(doc, ABOUT);
		drawHeading(doc, "Reading this file");
		drawCallout(doc, readingFor(metrics));
		drawHeading(doc, "Formulas");
		const formulaRows = [[
			{ text: "Measure", fill: true, bold: true },
			{ text: "Formula", fill: true, bold: true },
		]];
		for (let i = 0; i < FORMULAS.length; i += 1) {
			formulaRows.push([
				{ text: FORMULAS[i][0] },
				{ text: FORMULAS[i][1] },
			]);
		}
		drawTable(doc, formulaRows, { alignLast: "left" });

		drawHeading(doc, "Operators:");
		const operators = metrics.operators.entries();
		const operatorRows = [[
			{ text: "Name", fill: true, bold: true },
			{ text: "Count", fill: true, bold: true },
		]];
		for (let i = 0; i < operators.length; i += 1) {
			operatorRows.push([
				{ text: operators[i][0] },
				{ text: String(operators[i][1]) },
			]);
		}
		drawTable(doc, operatorRows);

		drawHeading(doc, "Operands:");
		const operands = metrics.operands.entries();
		const operandRows = [[
			{ text: "Name", fill: true, bold: true },
			{ text: "Count", fill: true, bold: true },
		]];
		for (let i = 0; i < operands.length; i += 1) {
			operandRows.push([
				{ text: operands[i][0] },
				{ text: String(operands[i][1]) },
			]);
		}
		drawTable(doc, operandRows);

		drawHeading(doc, "Measured values");
		const valueRows = [];
		for (let i = 0; i < VALUE_ROWS.length; i += 1) {
			valueRows.push([
				{ text: VALUE_ROWS[i][0], fill: true },
				{ text: formatRounded(metrics[VALUE_ROWS[i][1]]) },
			]);
		}
		drawTable(doc, valueRows);
		drawHeading(doc, "How to use this report");
		drawParagraphs(doc, SCOPE);
		doc.moveDown(0.4);
		const left = doc.page.margins.left;
		const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
		doc.save();
		doc.lineWidth(0.6).strokeColor("#e4e4e7");
		doc.moveTo(left, doc.y).lineTo(left + width, doc.y).stroke();
		doc.restore();
		doc.moveDown(0.5);
		doc.fillColor("#71717a").font("Helvetica").fontSize(10);
		doc.text("Copyright \u00a9 Harish Ramasubramanian", left, doc.y, { width: width });
		doc.end();
	});
}

module.exports = {
	VALUE_ROWS,
	reportBaseName,
	renderHtmlReport,
	renderPdfReport,
};
