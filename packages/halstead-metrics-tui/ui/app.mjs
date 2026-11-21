import { createElement as h, useRef, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sessionLib = require("../lib/session.js");

const palette = {
	bg: "#09090b",
	panel: "#111113",
	line: "#3f3f46",
	text: "#fafafa",
	muted: "#a1a1aa",
	faint: "#71717a",
	accent: "#a5b4fc",
	accentDeep: "#4f46e5",
	selected: "#312e81",
	selectedText: "#eef2ff",
	danger: "#fca5a5",
	ok: "#86efac",
	kw: "#c4b5fd",
	st: "#fcd34d",
	cm: "#71717a",
	nu: "#5eead4",
	pp: "#d8b4fe",
};

const metrics = [
	["Length", "programLength"],
	["Vocabulary", "programVocabulary"],
	["Volume", "volume"],
	["Difficulty", "difficulty"],
	["Estimated", "estimatedLength"],
	["Purity", "purityRatio"],
	["Effort", "programEffort"],
	["Time", "programmingTime"],
];

const tokenColor = {
	kw: palette.kw,
	st: palette.st,
	cm: palette.cm,
	nu: palette.nu,
	pp: palette.pp,
	tx: palette.text,
};

/**
 * @param {string} value
 * @param {number} width
 */
function fitEnd(value, width) {
	const text = String(value);
	if (width <= 0) {
		return "";
	}
	if (text.length <= width) {
		return text;
	}
	if (width === 1) {
		return "…";
	}
	return "…" + text.slice(text.length - (width - 1));
}

/**
 * @param {string} value
 * @param {number} width
 */
function fitStart(value, width) {
	const text = String(value);
	if (width <= 0) {
		return "";
	}
	if (text.length <= width) {
		return text;
	}
	if (width === 1) {
		return "…";
	}
	return text.slice(0, width - 1) + "…";
}

/**
 * @param {number} cursor
 * @param {number} count
 * @param {number} height
 */
function windowStart(cursor, count, height) {
	if (count <= height) {
		return 0;
	}
	const start = cursor - Math.floor(height / 2);
	return Math.max(0, Math.min(start, count - height));
}

/**
 * @param {object} props
 */
function TokenLine({ tokens, width }) {
	const children = [];
	let used = 0;
	const source = tokens && tokens.length > 0 ? tokens : [{ kind: "tx", text: " " }];
	for (let i = 0; i < source.length; i += 1) {
		if (used >= width) {
			break;
		}
		const token = source[i];
		const text = token.text.slice(0, width - used);
		used += text.length;
		children.push(h(Text, { key: i, color: tokenColor[token.kind] || palette.text }, text));
	}
	return h(Text, null, children);
}

/**
 * @param {object} props
 */
function metricCell(label, value, width) {
	const shown = value || "—";
	const room = Math.max(label.length + shown.length + 1, width);
	const gap = Math.max(1, room - label.length - String(shown).length);
	return h(Text, null,
		h(Text, { color: palette.muted }, label),
		h(Text, { color: palette.text }, " ".repeat(gap) + shown),
	);
}

function MetricGrid({ fields, width }) {
	const columnWidth = Math.max(18, Math.floor((width - 2) / 2));
	const lines = [];
	for (let i = 0; i < metrics.length; i += 2) {
		const left = metrics[i];
		const right = metrics[i + 1];
		const leftValue = fields ? fields[left[1]] : "";
		const rightValue = fields ? fields[right[1]] : "";
		lines.push(h(Box, { key: left[0] },
			h(Box, { width: columnWidth }, metricCell(left[0], leftValue, columnWidth - 1)),
			h(Text, null, "  "),
			h(Box, { width: columnWidth }, metricCell(right[0], rightValue, columnWidth - 1)),
		));
	}
	return h(Box, { flexDirection: "column" }, lines);
}

function App() {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const sessionRef = useRef(null);
	if (!sessionRef.current) {
		sessionRef.current = sessionLib.createSession(sessionLib.home());
	}
	const [, setFrame] = useState(0);
	const refresh = () => setFrame((frame) => frame + 1);

	useInput((input, key) => {
		const session = sessionRef.current;
		if (session.prompt !== null) {
			if (key.escape) {
				sessionLib.cancelPrompt(session);
				refresh();
				return;
			}
			if (key.return) {
				sessionLib.submitPrompt(session);
				refresh();
				return;
			}
			if (key.backspace || key.delete) {
				sessionLib.backspacePrompt(session);
				refresh();
				return;
			}
			if (input && !key.ctrl && !key.meta) {
				sessionLib.typePrompt(session, input);
				refresh();
			}
			return;
		}
		if (input === "q") {
			exit();
			return;
		}
		if (key.upArrow) {
			sessionLib.move(session, -1);
			refresh();
			return;
		}
		if (key.downArrow) {
			sessionLib.move(session, 1);
			refresh();
			return;
		}
		if (key.return) {
			sessionLib.activate(session);
			refresh();
			return;
		}
		if (key.rightArrow) {
			sessionLib.nudge(session, 1);
			refresh();
			return;
		}
		if (key.leftArrow) {
			sessionLib.nudge(session, -1);
			refresh();
			return;
		}
		if (input === "u") {
			sessionLib.goUp(session);
			refresh();
			return;
		}
		if (input === "o") {
			sessionLib.startPrompt(session);
			refresh();
			return;
		}
		if (input === "h") {
			sessionLib.exportCurrent(session, "html").then(refresh);
			refresh();
			return;
		}
		if (input === "p") {
			sessionLib.exportCurrent(session, "pdf").then(refresh);
			refresh();
			return;
		}
		if (key.pageUp || input === "[") {
			sessionLib.scrollSource(session, -8);
			refresh();
			return;
		}
		if (key.pageDown || input === "]") {
			sessionLib.scrollSource(session, 8);
			refresh();
		}
	});

	const session = sessionRef.current;
	const screenRows = Math.max(stdout.rows || 32, 24);
	const screenCols = Math.max(stdout.columns || 100, 80);
	const bodyHeight = screenRows - 2;
	const filesWidth = Math.min(36, Math.max(28, Math.floor(screenCols * 0.32)));
	const treeHeight = Math.max(6, bodyHeight - 10);
	const sourceHeight = Math.max(4, bodyHeight - 16);
	const innerFiles = filesWidth - 4;
	const contentWidth = Math.max(24, screenCols - filesWidth - 8);
	const listed = sessionLib.rows(session);
	const treeStart = windowStart(session.cursor, listed.length, treeHeight);
	const treeRows = [];
	for (let i = 0; i < treeHeight; i += 1) {
		const row = listed[treeStart + i];
		if (!row) {
			treeRows.push(h(Text, { key: "pad-" + i }, " "));
			continue;
		}
		const selected = treeStart + i === session.cursor;
		const nameWidth = Math.max(6, innerFiles - row.depth * 2);
		let label;
		let color = palette.text;
		if (row.note) {
			label = fitStart(row.note, nameWidth);
			color = palette.faint;
		} else if (row.node.entry.isDirectory) {
			const mark = row.node.expanded ? "▾ " : "▸ ";
			label = mark + fitStart(row.node.entry.name, nameWidth - 2);
			color = palette.accent;
		} else if (sessionLib.isSourceFile(row.node.entry)) {
			const extension = row.node.entry.name.includes(".")
				? row.node.entry.name.slice(row.node.entry.name.lastIndexOf(".") + 1)
				: "";
			const badge = extension ? " " + extension : "";
			label = "  " + fitStart(row.node.entry.name, Math.max(1, nameWidth - badge.length - 2)) + badge;
		} else {
			label = "  " + fitStart(row.node.entry.name, nameWidth - 2);
			color = palette.muted;
		}
		treeRows.push(h(Text, {
			key: (row.note || row.node.entry.path) + ":" + i,
			backgroundColor: selected ? palette.selected : undefined,
			color: selected ? palette.selectedText : color,
		}, " ".repeat(row.depth * 2) + label));
	}

	const sourceLines = session.file && session.file.lines ? session.file.lines : [];
	const sourceMax = Math.max(0, sourceLines.length - sourceHeight);
	const sourceStart = Math.min(session.sourceScroll, sourceMax);
	const gutter = String(Math.max(sourceLines.length, 1)).length;
	const codeWidth = Math.max(8, contentWidth - gutter - 2);
	const codeRows = [];
	for (let i = 0; i < sourceHeight; i += 1) {
		const lineIndex = sourceStart + i;
		if (lineIndex >= sourceLines.length) {
			codeRows.push(h(Text, { key: "src-" + i }, " "));
			continue;
		}
		const number = String(lineIndex + 1).padStart(gutter, " ");
		codeRows.push(h(Box, { key: "src-" + i },
			h(Text, { color: palette.faint }, number + " "),
			h(TokenLine, { tokens: sourceLines[lineIndex], width: codeWidth }),
		));
	}

	const fileName = session.file ? session.file.name : "No file open";
	const statusColor = session.statusError ? palette.danger : session.status.startsWith("Wrote ") ? palette.ok : palette.muted;
	const atRoot = sessionLib.parentOf(session.directory) === session.directory;

	return h(Box, {
		width: screenCols,
		height: screenRows,
		flexDirection: "column",
		backgroundColor: palette.bg,
	},
	h(Box, { flexGrow: 1, paddingX: 1, paddingTop: 1 },
		h(Box, {
			width: filesWidth,
			height: bodyHeight,
			marginRight: 1,
			flexDirection: "column",
			borderStyle: "round",
			borderColor: palette.line,
			paddingX: 1,
		},
		h(Box, { marginBottom: 1 },
			h(Text, { backgroundColor: palette.accentDeep, color: "#ffffff", bold: true }, " H "),
			h(Text, { color: palette.text, bold: true }, " Halstead"),
		),
		h(Text, { color: palette.faint }, "Metrics"),
		h(Box, { marginTop: 1 },
			h(Text, { color: atRoot ? palette.faint : palette.accent }, atRoot ? "· " : "↑ "),
			h(Text, { color: palette.muted }, fitEnd(session.directory, filesWidth - 6)),
		),
		h(Text, { color: palette.faint }, "Files"),
		h(Box, { flexDirection: "column", marginTop: 1 }, treeRows),
		),
		h(Box, { width: screenCols - filesWidth - 4, height: bodyHeight, flexDirection: "column" },
			h(Box, {
				flexDirection: "column",
				borderStyle: "round",
				borderColor: palette.line,
				paddingX: 1,
				marginBottom: 1,
			},
			h(Text, { color: palette.text, bold: true }, "Measures"),
			h(Text, { color: palette.accent }, fitStart(fileName, contentWidth)),
			h(Text, { color: palette.faint }, "Operators, operands, and the derived values."),
			h(Box, { marginTop: 1 }, h(MetricGrid, { fields: session.file && session.file.fields, width: contentWidth })),
			h(Text, { color: statusColor }, fitStart(session.status || " ", contentWidth)),
			),
			h(Box, {
				flexDirection: "column",
				borderStyle: "round",
				borderColor: palette.line,
				paddingX: 1,
				flexGrow: 1,
			},
			h(Text, { color: palette.text, bold: true }, "Source"),
			h(Box, { flexDirection: "column", marginTop: 1 }, codeRows),
			),
		),
	),
	h(Box, { paddingX: 2, height: 1 },
		session.prompt === null
			? h(Text, { color: palette.faint }, "↑↓ move   enter open   ←→ fold   u up   o path   h html   p pdf   [ ] source   q quit")
			: h(Text, null,
				h(Text, { color: palette.accent }, "Open "),
				h(Text, { color: palette.text }, session.prompt || ""),
				h(Text, { color: palette.accent }, "▌"),
				h(Text, { color: palette.faint }, "  enter confirm   esc cancel"),
			),
	));
}

export { App };
