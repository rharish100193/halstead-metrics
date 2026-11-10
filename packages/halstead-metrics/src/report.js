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
 * File stem used by the Java exporters: everything before the first dot.
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
	return "<table border=\"1\">" + rows + "</table>";
}

/**
 * Detailed HTML report, laid out like the Java HTMLWriter.
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

	return "<!DOCTYPE HTML><html> <head> <title>Halstead Metrics</title>"
		+ "<style type=\"text/css\">"
		+ "html,body{background:#fff;color:#222;margin:0;}"
		+ "#header,#body,#footer{box-sizing:border-box;width:min(800px,calc(100% - 32px));margin-left:auto;margin-right:auto;}"
		+ "#header{border:2px solid #a1a1a1;padding:10px 40px;background:#dddddd;border-radius:25px;margin-top:16px;}"
		+ "h1{font-family: sans-serif;font-size: 32px;margin:10px;text-align:center;}"
		+ "#body{font-family: sans-serif;border:2px solid #a1a1a1;padding:10px 40px;background:#fff;}"
		+ "#footer{border:2px solid #a1a1a1;padding:10px 40px;background:#dddddd;border-radius:25px;margin-bottom:16px;}"
		+ "#footer-contents{font-family: sans-serif;text-align:center;}"
		+ "table, th, td{border: 2px solid #a1a1a1;}"
		+ "table{border-collapse:collapse;margin:12px auto;background:#fff;}"
		+ "th,td{text-align: center;padding:5px;color:#222;}"
		+ "th{background:#dddddd;}"
		+ "td{background:#fff;}"
		+ "</style></head>"
		+ "<body><div id=\"layout\"><div id=\"header\">"
		+ "<h1 id=\"heading\">Halstead Metrics Detailed Report</h1></div>"
		+ "<div id=\"body\"><br /><p><h3>File Name: </h3>" + escapeHtml(fileName) + "</p>"
		+ "<br /><h4><u>Operators</u></h4>" + countTable(metrics.operators.entries())
		+ "<br /><h4><u>Operands</u></h4>" + countTable(metrics.operands.entries())
		+ "<br><h4><u>Values</u></h4><table border=\"1\">" + values + "</table>"
		+ "</div><div id=\"footer\"><p id=\"footer-contents\">Copyright &copy; Harish Ramasubramanian</p></div>"
		+ "</div></body></html>";
}

/**
 * @param {import("pdfkit")} doc
 * @param {string} text
 */
function drawBanner(doc, text, fontSize) {
	const left = doc.page.margins.left;
	const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
	doc.font("Helvetica-Bold").fontSize(fontSize);
	const height = doc.heightOfString(text, { width: width - 24, align: "center" }) + 18;
	if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
		doc.addPage();
	}
	const y = doc.y;
	doc.save();
	doc.roundedRect(left, y, width, height, 10).fillAndStroke("#dddddd", "#a1a1a1");
	doc.restore();
	doc.fillColor("#222222").text(text, left + 12, y + 8, {
		width: width - 24,
		align: "center",
	});
	doc.y = y + height + 16;
	doc.x = left;
}

/**
 * @param {import("pdfkit")} doc
 * @param {Array<Array<{text: string, fill?: boolean, bold?: boolean}>>} rows
 */
function drawTable(doc, rows) {
	const left = doc.page.margins.left;
	const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
	const colWidths = [tableWidth * 0.72, tableWidth * 0.28];

	for (let r = 0; r < rows.length; r += 1) {
		const row = rows[r];
		let rowHeight = 22;
		for (let c = 0; c < row.length; c += 1) {
			doc.font(row[c].bold ? "Helvetica-Bold" : "Helvetica").fontSize(11);
			const textHeight = doc.heightOfString(String(row[c].text), {
				width: colWidths[c] - 12,
				align: "center",
			});
			rowHeight = Math.max(rowHeight, textHeight + 12);
		}
		if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
			doc.addPage();
		}
		const y = doc.y;
		let x = left;
		for (let c = 0; c < row.length; c += 1) {
			const cell = row[c];
			if (cell.fill) {
				doc.save();
				doc.rect(x, y, colWidths[c], rowHeight).fill("#dddddd");
				doc.restore();
			}
			doc.lineWidth(1).strokeColor("#a1a1a1").rect(x, y, colWidths[c], rowHeight).stroke();
			doc.font(cell.bold ? "Helvetica-Bold" : "Helvetica").fontSize(11).fillColor("#222222");
			doc.text(String(cell.text), x + 6, y + 6, {
				width: colWidths[c] - 12,
				align: "center",
				lineBreak: true,
			});
			x += colWidths[c];
		}
		doc.y = y + rowHeight;
		doc.x = left;
	}
	doc.moveDown(0.7);
}

/**
 * @param {import("pdfkit")} doc
 * @param {string} text
 */
function drawHeading(doc, text) {
	doc.font("Helvetica-Bold").fontSize(13).fillColor("#222222");
	doc.text(text, { underline: true });
	doc.moveDown(0.35);
}

/**
 * Printable report with the same sections as the Java PDFWriter.
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
			margins: { top: 54, bottom: 54, left: 54, right: 54 },
			info: {
				Title: "Halstead Metrics - " + reportBaseName(filename) + " Report",
				Author: "Harish Ramasubramanian",
				Subject: "Halstead Metrics Analysis Report for " + fileName,
			},
		});
		const chunks = [];
		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		drawBanner(doc, "Halstead Metrics Analysis Report for " + fileName, 20);
		doc.font("Helvetica-Bold").fontSize(12).fillColor("#222222");
		doc.text("File Name : " + fileName);
		doc.moveDown(0.8);

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

		drawHeading(doc, "Values");
		const valueRows = [];
		for (let i = 0; i < VALUE_ROWS.length; i += 1) {
			valueRows.push([
				{ text: VALUE_ROWS[i][0], fill: true },
				{ text: formatRounded(metrics[VALUE_ROWS[i][1]]) },
			]);
		}
		drawTable(doc, valueRows);
		doc.moveDown(0.4);
		drawBanner(doc, "Copyright \u00a9 Harish Ramasubramanian", 14);
		doc.end();
	});
}

module.exports = {
	VALUE_ROWS,
	reportBaseName,
	renderHtmlReport,
	renderPdfReport,
};
