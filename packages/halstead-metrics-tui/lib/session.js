"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const { SUPPORTED_EXTENSIONS } = require("halstead-metrics");
const { listDirectory, readSource, exportReport } = require("./files");

/**
 * @param {string} dirPath
 * @returns {string}
 */
function parentOf(dirPath) {
	const parent = path.dirname(dirPath);
	return parent === dirPath ? dirPath : parent;
}

/**
 * @param {string} dirPath
 */
function loadNodes(dirPath) {
	try {
		return {
			ok: true,
			nodes: listDirectory(dirPath).map((entry) => ({
				entry: entry,
				expanded: false,
				children: null,
				note: null,
			})),
		};
	} catch (err) {
		return { ok: false, error: err.message, nodes: [] };
	}
}

/**
 * @param {object[]} nodes
 * @param {number} depth
 * @param {object[]} out
 */
function flatten(nodes, depth, out) {
	for (let i = 0; i < nodes.length; i += 1) {
		const node = nodes[i];
		out.push({ node: node, depth: depth, note: null });
		if (!node.entry.isDirectory || !node.expanded) {
			continue;
		}
		if (node.children && node.children.length > 0) {
			flatten(node.children, depth + 1, out);
		} else if (node.note) {
			out.push({ node: node, depth: depth + 1, note: node.note });
		}
	}
	return out;
}

/**
 * @param {object} session
 */
function rows(session) {
	return flatten(session.nodes, 0, []);
}

/**
 * @param {object} session
 */
function clampCursor(session) {
	const count = rows(session).length;
	if (count === 0) {
		session.cursor = 0;
		return;
	}
	if (session.cursor < 0) {
		session.cursor = 0;
	}
	if (session.cursor >= count) {
		session.cursor = count - 1;
	}
}

/**
 * @param {string} directory
 */
function createSession(directory) {
	const loaded = loadNodes(directory);
	return {
		directory: directory,
		nodes: loaded.nodes,
		listError: loaded.ok ? "" : loaded.error,
		cursor: 0,
		sourceScroll: 0,
		filePath: null,
		file: null,
		status: loaded.ok ? "" : loaded.error,
		statusError: !loaded.ok,
		prompt: null,
	};
}

/**
 * @param {object} session
 * @param {number} delta
 */
function move(session, delta) {
	session.cursor += delta;
	clampCursor(session);
	return session;
}

/**
 * @param {object} node
 */
function toggle(node) {
	if (!node.entry.isDirectory) {
		return;
	}
	if (node.expanded) {
		node.expanded = false;
		return;
	}
	if (!node.children) {
		const loaded = loadNodes(node.entry.path);
		if (!loaded.ok) {
			node.children = [];
			node.note = loaded.error;
		} else if (loaded.nodes.length === 0) {
			node.children = [];
			node.note = "Empty";
		} else {
			node.children = loaded.nodes;
			node.note = null;
		}
	}
	node.expanded = true;
}

/**
 * @param {object} session
 * @param {string} filePath
 */
function openFile(session, filePath) {
	const file = readSource(filePath);
	session.file = file;
	session.filePath = file.supported && file.fields ? filePath : null;
	session.sourceScroll = 0;
	if (file.error) {
		session.status = file.error;
		session.statusError = true;
	} else if (!file.supported) {
		session.status = "Halstead metrics are not available for this file type.";
		session.statusError = false;
	} else {
		session.status = "";
		session.statusError = false;
	}
	return session;
}

/**
 * @param {object} session
 */
function activate(session) {
	const row = rows(session)[session.cursor];
	if (!row || row.note) {
		return session;
	}
	if (row.node.entry.isDirectory) {
		toggle(row.node);
		return session;
	}
	return openFile(session, row.node.entry.path);
}

/**
 * @param {object} session
 * @param {number} direction
 */
function nudge(session, direction) {
	const row = rows(session)[session.cursor];
	if (!row || row.note || !row.node.entry.isDirectory) {
		return session;
	}
	if (direction > 0) {
		if (!row.node.expanded) {
			toggle(row.node);
		}
		return session;
	}
	if (row.node.expanded) {
		row.node.expanded = false;
	}
	return session;
}

/**
 * @param {object} session
 * @param {string} dirPath
 * @param {string} [selectPath]
 */
function showDirectory(session, dirPath, selectPath) {
	const loaded = loadNodes(dirPath);
	session.directory = dirPath;
	session.nodes = loaded.nodes;
	session.listError = loaded.ok ? "" : loaded.error;
	session.cursor = 0;
	if (!loaded.ok) {
		session.status = loaded.error;
		session.statusError = true;
	}
	if (!selectPath) {
		return session;
	}
	const index = rows(session).findIndex((row) => row.node.entry.path === selectPath);
	if (index >= 0) {
		session.cursor = index;
	}
	return openFile(session, selectPath);
}

/**
 * @param {object} session
 */
function goUp(session) {
	const parent = parentOf(session.directory);
	if (parent === session.directory) {
		return session;
	}
	return showDirectory(session, parent);
}

/**
 * @param {object} session
 * @param {"html"|"pdf"} kind
 */
async function exportCurrent(session, kind) {
	if (!session.filePath) {
		return session;
	}
	session.status = kind === "pdf" ? "Writing PDF report..." : "Writing HTML report...";
	session.statusError = false;
	try {
		const outputPath = await exportReport(session.filePath, kind);
		session.status = "Wrote " + outputPath;
		session.statusError = false;
	} catch (err) {
		session.status = err.message || "Could not write the report.";
		session.statusError = true;
	}
	return session;
}

/**
 * @param {object} session
 * @param {string} inputPath
 */
function openAt(session, inputPath) {
	const resolved = path.resolve(session.directory, inputPath.trim());
	let stat;
	try {
		stat = fs.statSync(resolved);
	} catch (err) {
		session.status = "Cannot read file.";
		session.statusError = true;
		return session;
	}
	if (stat.isDirectory()) {
		return showDirectory(session, resolved);
	}
	return showDirectory(session, path.dirname(resolved), resolved);
}

/**
 * @param {object} session
 */
function startPrompt(session) {
	session.prompt = "";
	return session;
}

/**
 * @param {object} session
 * @param {string} text
 */
function typePrompt(session, text) {
	if (session.prompt === null) {
		return session;
	}
	session.prompt += text.replace(/[\r\n]/g, "");
	return session;
}

/**
 * @param {object} session
 */
function backspacePrompt(session) {
	if (session.prompt) {
		session.prompt = session.prompt.slice(0, -1);
	}
	return session;
}

/**
 * @param {object} session
 */
function cancelPrompt(session) {
	session.prompt = null;
	return session;
}

/**
 * @param {object} session
 */
function submitPrompt(session) {
	const value = session.prompt;
	session.prompt = null;
	if (!value || !value.trim()) {
		return session;
	}
	return openAt(session, value);
}

/**
 * @param {object} session
 * @param {number} delta
 */
function scrollSource(session, delta) {
	const count = session.file && session.file.lines ? session.file.lines.length : 0;
	const max = Math.max(0, count - 1);
	const next = session.sourceScroll + delta;
	session.sourceScroll = Math.max(0, Math.min(max, next));
	return session;
}

/**
 * @param {object} entry
 * @returns {boolean}
 */
function isSourceFile(entry) {
	if (entry.isDirectory) {
		return false;
	}
	const dot = entry.name.lastIndexOf(".");
	const extension = dot === -1 ? "" : entry.name.slice(dot + 1).toLowerCase();
	return SUPPORTED_EXTENSIONS.has(extension);
}

module.exports = {
	createSession,
	rows,
	move,
	activate,
	nudge,
	goUp,
	exportCurrent,
	openAt,
	startPrompt,
	typePrompt,
	backspacePrompt,
	cancelPrompt,
	submitPrompt,
	scrollSource,
	parentOf,
	isSourceFile,
	home: () => os.homedir(),
};
