import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initialize, openWorkspace } from '../src/workspace.mjs';
import { root } from '../src/components.mjs';
export const siblings = path.dirname(root.replace(/\/$/, ''));
export function temporary(t) {
  const p = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ruvora-workspace-test-')));
  t?.after(() => fs.rmSync(p, { recursive: true, force: true })); return p;
}
export async function fixture(t, options = {}) {
  const project = temporary(t);
  initialize(project, { mode: 'fixture', profile: { hostId: 'fixture-host', canonicalProjectId: 'fixture-project', displayName: 'Fixture only', branch: 'main' },
    foldRoot: path.join(siblings, 'threadfold'), portRoot: path.join(siblings, 'threadport'), ...options });
  return { project, workspace: await openWorkspace(project) };
}
export const work = w => w.prepare({ intent: 'work', request: 'Synthetic implementation contract check', requestId: 'request-1', followupCleanup: true });
export async function completed(t) {
  const result = await fixture(t); const ticket = work(result.workspace);
  const dispatched = result.workspace.dispatch({ workflowId: ticket.id });
  result.workspace.hub.advance(dispatched.dispatch.operationId);
  return { ...result, ticket };
}
