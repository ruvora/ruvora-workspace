#!/usr/bin/env node
import path from 'node:path';
import { openWorkspace, initialize } from '../src/workspace.mjs';
import { callTool } from '../src/tools.mjs';
import { serve } from '../src/mcp.mjs';
import { report } from '../src/report.mjs';
const args = process.argv.slice(2);
let project = process.env.RUVORA_PROJECT_ROOT ?? process.cwd();
if (args[0] === '--project') { project = args[1]; args.splice(0, 2); }
const command = args.shift() ?? 'inspect';
try {
  if (command === 'init') {
    if (args.length !== 1) throw new Error('Usage: workspace --project PATH init CONFIG_JSON');
    console.log(JSON.stringify(initialize(path.resolve(project), JSON.parse(args[0])), null, 2));
  } else if (command === 'help') {
    console.log('workspace [--project PATH] inspect|capabilities|mcp|init CONFIG_JSON|call TOOL ARGUMENTS_JSON\nDefault: read-only report. See README.md and docs/USAGE_KO.md.');
  } else {
    const workspace = await openWorkspace(path.resolve(project));
    if (command === 'mcp') await serve(workspace);
    else if (command === 'inspect') console.log(report(workspace.inspect()));
    else if (command === 'capabilities') console.log(JSON.stringify(workspace.capabilities(), null, 2));
    else if (command === 'call' && args.length === 2) console.log(JSON.stringify(callTool(workspace, args[0], JSON.parse(args[1])), null, 2));
    else throw new Error('Unknown command or arguments; run help.');
  }
} catch (e) { console.error(JSON.stringify({ code: e.code ?? 'INVALID_COMMAND', message: e.message })); process.exitCode = 1; }
