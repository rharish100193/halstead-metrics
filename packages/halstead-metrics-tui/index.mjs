#!/usr/bin/env node

import { createElement } from "react";
import { render } from "ink";
import { App } from "./ui/app.mjs";

render(createElement(App), { alternateScreen: true, exitOnCtrlC: true });
