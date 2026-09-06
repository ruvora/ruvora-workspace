import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createRPC, serve } from '../src/mcp.mjs';
import { openWorkspace } from '../src/workspace.mjs';
import { temporary } from './helpers.mjs';
import { root } from '../src/components.mjs';
test('MCP negotiation, static schemas and errors do not leak execution authority', async t => {
  const rpc = createRPC(await openWorkspace(temporary(t)));
  const request = (method, params = {}) => rpc({ jsonrpc: '2.0', id: 1, method, params });
  assert.equal(request('tools/list').error.code, -32002);
  assert.equal(request('initialize', { protocolVersion: 'unknown' }).error.code, -32602);
  assert.ok(request('initialize', { protocolVersion: '2025-03-26' }).result);
  const tools = request('tools/list').result.tools; assert.ok(tools.length > 10); assert.ok(tools.every(t => t.inputSchema.additionalProperties === false));
  assert.equal(request('tools/call', { name: 'workspace_port_import', arguments: {} }).result.isError, true);
  assert.equal(rpc({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'workspace_prepare_workflow' } }), null);
  assert.equal(request('shell').error.code, -32601);
});
test('stream handles malformed, fragmented, oversized messages and recovers for next request', async t => {
  const chunks = ['{bad}\n', 'x'.repeat(1024 * 1024 + 1), '\n', '{"jsonrpc":"2.0","id":2,"method":"initial', 'ize","params":{"protocolVersion":"2025-03-26"}}\n'];
  let output = ''; const sink = new Writable({ write(chunk, _, cb) { output += chunk; cb(); } });
  await serve(await openWorkspace(temporary(t)), Readable.from(chunks), sink);
  const messages = output.trim().split('\n').map(JSON.parse);
  assert.equal(messages[0].error.code, -32700); assert.equal(messages[1].error.code, -32600); assert.equal(messages[2].id, 2); assert.ok(messages[2].result);
});
test('actual CLI and launcher run with runtime Node and read-only fresh project', t => {
  const project = temporary(t);
  const cli = spawnSync(process.execPath, [path.join(root, 'bin/workspace.mjs'), '--project', project, 'inspect'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr); assert.match(cli.stdout, /RUVORA Workspace/); assert.match(cli.stdout, /미지원/);
  const protocol = spawnSync(path.join(root, 'bin/launch-mcp'), [], { cwd: project, env: { ...process.env, CODEX_MCP_NODE_PATH: process.execPath }, encoding: 'utf8', input: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26"}}\n' });
  assert.equal(protocol.status, 0, protocol.stderr); assert.equal(JSON.parse(protocol.stdout).result.serverInfo.name, 'ruvora-workspace');
});
