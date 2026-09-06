import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openWorkspace, initialize } from '../src/workspace.mjs';
import { digest } from '../src/contracts.mjs';
import { callTool } from '../src/tools.mjs';
import { privateDirectory } from '../src/store.mjs';
import { temporary, fixture, work, completed } from './helpers.mjs';

test('fresh open creates no state, index or work and reports unavailable services', async t => {
  const p = temporary(t), w = await openWorkspace(p); const before = fs.readdirSync(p);
  const view = w.inspect(); assert.equal(view.work.length, 0); assert.equal(view.context.status, 'not_analyzed');
  assert.equal(view.capabilities.effects.hubDispatch, 'blocked'); assert.deepEqual(fs.readdirSync(p), before);
  assert.throws(() => work(w), { code: 'PROJECT_NOT_SELECTED' });
});
test('identity and canonical path cannot be silently rebound or fixture promoted', async t => {
  const { project, workspace: w } = await fixture(t);
  assert.throws(() => initialize(project, { ...w.config, mode: 'production' }), { code: 'PROJECT_RECONNECT_REQUIRED' });
  const c = { ...w.config, profile: { ...w.profile, canonicalProjectPath: '/elsewhere' } };
  fs.writeFileSync(path.join(project, '.ruvora-workspace/config.json'), JSON.stringify(c));
  await assert.rejects(openWorkspace(project), { code: 'PROJECT_RECONNECT_REQUIRED' });
});
test('context selection pins references, reason and observation time without reindexing', async t => {
  const { workspace: w } = await fixture(t); const before = digest(w.graph().revision);
  const c = w.selectContext({ expectedRevision: 'fixture-revision-1', evidenceIds: ['evidence-1'], reason: 'Keep source bytes' });
  assert.equal(c.references[0].authority, false); assert.equal(c.revision, 'fixture-revision-1');
  assert.equal(digest(w.graph().revision), before); assert.equal(w.inspect().work.length, 0);
});
test('stale, wrong branch, unknown evidence and conflicts fail closed', async t => {
  const { workspace: w } = await fixture(t);
  const args = { expectedRevision: 'fixture-revision-1', evidenceIds: ['evidence-1'], reason: 'test' };
  w.fixtureRevision.revision.observationCutoff = '2000-01-01T00:00:00Z';
  assert.throws(() => w.selectContext(args), { code: 'STALE_CONTEXT' });
  const accepted = { ...args, acceptStale: true }; assert.ok(w.selectContext(accepted).acceptStale);
  w.fixtureRevision.revision.evidenceItems[0].branch = 'other';
  assert.throws(() => w.selectContext(accepted), { code: 'BRANCH_APPLICABILITY_UNVERIFIED' });
  w.fixtureRevision.revision.evidenceItems[0].branch = 'main';
  assert.throws(() => w.selectContext({ ...accepted, evidenceIds: ['missing'] }), { code: 'EVIDENCE_NOT_FOUND' });
  w.fixtureRevision.revision.relations = [{ kind: 'contradicts', evidenceIds: ['evidence-1'] }];
  assert.throws(() => w.selectContext(accepted), { code: 'CONTEXT_CONFLICT' });
});
test('dispatch checks pinned evidence again and does not apply changed revision', async t => {
  const { workspace: w } = await fixture(t);
  const c = w.selectContext({ expectedRevision: 'fixture-revision-1', evidenceIds: ['evidence-1'], reason: 'test' });
  const ticket = w.prepare({ intent: 'work', requestId: 'one', request: 'test', contextId: c.id });
  w.fixtureRevision.revision.evidenceItems[0].summary = 'changed';
  assert.throws(() => w.dispatch({ workflowId: ticket.id }), { code: 'CONTEXT_CHANGED' });
  assert.equal(Object.keys(w.hub.store.read().operations ?? {}).length, 0);
});
test('duplicate requests and response loss reconcile exactly one fixture operation across restart', async t => {
  const { project, workspace: w } = await fixture(t); const ticket = work(w);
  assert.equal(work(w).id, ticket.id);
  assert.throws(() => w.prepare({ intent: 'work', requestId: 'request-1', request: 'different' }), { code: 'IDEMPOTENCY_CONFLICT' });
  w.hub.loseResponse = true;
  const first = w.dispatch({ workflowId: ticket.id }); assert.ok(first.dispatch.operationId);
  const restarted = await openWorkspace(project);
  const again = restarted.dispatch({ workflowId: ticket.id }); assert.equal(again.dispatch.operationId, first.dispatch.operationId);
  assert.equal(Object.keys(restarted.hub.store.read().operations).length, 1);
});
test('unknown dispatch outcome never causes automatic replay', async t => {
  const { workspace: w } = await fixture(t), ticket = work(w);
  w.hub.dispatch = () => { throw Object.assign(new Error(), { code: 'RESPONSE_LOST' }); };
  assert.equal(w.dispatch({ workflowId: ticket.id }).status, 'attention');
  w.hub.dispatch = () => assert.fail('blind replay');
  assert.equal(w.dispatch({ workflowId: ticket.id }).status, 'attention');
});
test('completion observations do not automatically start cleanup; disconnect is not success', async t => {
  const { workspace: w, ticket } = await completed(t);
  const value = w.getWorkflow({ workflowId: ticket.id }); assert.equal(value.status, 'waiting_user');
  assert.equal(Object.keys(w.store.read().reviews).length, 0);
  w.hub.find = () => { throw Object.assign(new Error(), { code: 'CONNECTION_FAILED' }); };
  assert.equal(w.getWorkflow({ workflowId: ticket.id }).status, 'attention');
});
test('old product observations are rejected', async t => {
  const { workspace: w } = await fixture(t), ticket = work(w); w.dispatch({ workflowId: ticket.id });
  const saved = w.store.read().tickets[ticket.id], op = w.hub.find(saved.dispatch.idempotencyKey);
  w.acceptOperation(saved, { ...op, sequence: 5 });
  assert.throws(() => w.acceptOperation(saved, { ...op, sequence: 4 }), { code: 'OUT_OF_ORDER_OBSERVATION' });
});
test('cancel followup retains successful work and running-work cancellation is separate', async t => {
  const { workspace: w, ticket } = await completed(t);
  const cancelled = w.cancel({ workflowId: ticket.id, target: 'followup' });
  assert.equal(cancelled.observation.status, 'completed'); assert.equal(cancelled.status, 'completed');
  assert.throws(() => w.previewCleanup({ workflowId: ticket.id }), { code: 'FOLLOWUP_CANCELLED' });
  const second = w.prepare({ intent: 'work', request: 'another', requestId: 'second' });
  w.dispatch({ workflowId: second.id }); assert.equal(w.cancel({ workflowId: second.id, target: 'running_work' }).observation.status, 'cancelled');
});
test('workspace lock rejects concurrent writers, read still works, no auto lock stealing', async t => {
  const { workspace: w } = await fixture(t); const lock = path.join(w.directory, 'writer.lock');
  fs.writeFileSync(lock, JSON.stringify({ pid: 99999999 }));
  assert.throws(() => work(w), { code: 'WORKSPACE_BUSY' }); assert.equal(w.inspect().work.length, 0); assert.ok(fs.existsSync(lock));
});
test('native mutation stays blocked even with fabricated approval and unknown generic commands', async t => {
  const p = temporary(t); initialize(p, { mode: 'production', profile: { hostId: 'local', canonicalProjectId: 'project', displayName: 'Real', branch: 'main' } });
  const w = await openWorkspace(p), ticket = work(w);
  assert.throws(() => w.dispatch({ workflowId: ticket.id }), { code: 'HUB_DISPATCH_UNSUPPORTED' });
  assert.throws(() => w.applyReview({ approvalReceipt: { approved: true } }), { code: 'TRUSTED_APPROVAL_UNAVAILABLE' });
  assert.throws(() => callTool(w, 'workspace_port_export'), { code: 'PORT_G0_G3_UNVERIFIED' });
  assert.throws(() => callTool(w, 'workspace_graph_refresh'), { code: 'GRAPH_REFRESH_HOST_UNVERIFIED' });
  assert.throws(() => callTool(w, 'execute_command', { cmd: 'anything' }), { code: 'UNKNOWN_TOOL' });
  assert.throws(() => callTool(w, 'workspace_get_capabilities', { url: 'https://example.com' }), { code: 'INVALID_ARGUMENTS' });
});
test('component failure is isolated from usable status and other components', async t => {
  const { workspace: w } = await fixture(t, { foldRoot: '/does-not-exist' });
  assert.equal(w.capabilities().components.fold.status, 'disconnected');
  assert.equal(w.capabilities().components.port.status, 'available'); assert.equal(w.graph().status, 'available');
});
test('removing a gateway reference leaves fixture product operation running', async t => {
  const { project, workspace: w } = await fixture(t); const ticket = work(w); const op = w.dispatch({ workflowId: ticket.id });
  const next = await openWorkspace(project); assert.equal(next.hub.read(op.dispatch.operationId).status, 'running');
  assert.equal(w.capabilities().migration, 'read_only_attach_only');
});
test('symlink parents are rejected before any child directory is created', t => {
  const p = temporary(t), outside = temporary(t); fs.symlinkSync(outside, path.join(p, 'redirect'));
  assert.throws(() => privateDirectory(path.join(p, 'redirect', 'new-data')), { code: 'UNSAFE_PATH' });
  assert.deepEqual(fs.readdirSync(outside), []);
});
test('read-only review after product-data removal never seeds a replacement inventory', async t => {
  const { project, workspace: w, ticket } = await completed(t); const preview = w.previewCleanup({ workflowId: ticket.id });
  fs.rmSync(path.join(w.directory, 'fixture-fold'), { recursive: true });
  const restarted = await openWorkspace(project);
  assert.throws(() => restarted.readReview({ reviewId: preview.review.id }), { code: 'PRODUCT_DATA_UNAVAILABLE' });
  assert.equal(fs.existsSync(path.join(w.directory, 'fixture-fold')), false);
});
