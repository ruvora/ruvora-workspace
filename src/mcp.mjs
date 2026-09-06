import { tools, callTool } from './tools.mjs';
import { errorCode } from './contracts.mjs';
export function createRPC(workspace) {
  let initialized = false;
  return request => {
    const requestId = request?.id ?? null;
    const error = (code, message) => ({ jsonrpc: '2.0', id: requestId, error: { code, message } });
    if (!request || Array.isArray(request) || request.jsonrpc !== '2.0' || typeof request.method !== 'string') return error(-32600, 'Invalid Request');
    if (!Object.hasOwn(request, 'id')) return null;
    const result = value => ({ jsonrpc: '2.0', id: requestId, result: value });
    if (request.method === 'initialize') {
      const version = request.params?.protocolVersion;
      if (!['2024-11-05', '2025-03-26', '2025-06-18'].includes(version)) return error(-32602, 'Unsupported protocolVersion');
      initialized = true;
      return result({ protocolVersion: version, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'ruvora-workspace', version: '0.1.0' } });
    }
    if (!initialized) return error(-32002, 'Initialize first');
    if (request.method === 'ping') return result({});
    if (request.method === 'tools/list') return result({ tools: tools.map(({ method, ...tool }) => tool) });
    if (request.method !== 'tools/call') return error(-32601, 'Method not found');
    try {
      const value = callTool(workspace, request.params?.name, request.params?.arguments ?? {});
      return result({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
    } catch (e) {
      return result({ isError: true, content: [{ type: 'text', text: JSON.stringify({ code: errorCode(e), message: e.code ? e.message : 'Operation failed; inspect local configuration.' }) }] });
    }
  };
}
export async function serve(workspace, input = process.stdin, output = process.stdout) {
  const rpc = createRPC(workspace); let pending = Buffer.alloc(0); let dropping = false;
  const write = value => { if (value) output.write(JSON.stringify(value) + '\n'); };
  for await (const chunk of input) {
    let bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    while (bytes.length) {
      const newline = bytes.indexOf(10), end = newline < 0 ? bytes.length : newline;
      if (!dropping && pending.length + end > 1024 * 1024) {
        dropping = true; pending = Buffer.alloc(0); write({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Message exceeds 1 MiB' } });
      }
      if (!dropping) pending = Buffer.concat([pending, bytes.subarray(0, end)]);
      if (newline < 0) break;
      if (!dropping && pending.length) {
        let request;
        try { request = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(pending)); }
        catch { write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
        if (request !== undefined) write(rpc(request));
      }
      pending = Buffer.alloc(0); dropping = false; bytes = bytes.subarray(newline + 1);
    }
  }
  if (pending.length && !dropping) write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Unterminated message' } });
}
