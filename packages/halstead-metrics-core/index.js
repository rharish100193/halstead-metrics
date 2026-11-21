#!/usr/bin/env node
"use strict";

const { main } = require("./src/cli");

const code = main(process.argv.slice(2));
if (code !== 0) {
	process.exit(code);
}
