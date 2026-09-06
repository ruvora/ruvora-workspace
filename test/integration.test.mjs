import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { PublishedGraph, loadComponent, verifyComponent } from '../src/components.mjs';
import { completed, temporary, siblings, fixture } from './helpers.mjs';
import { sha } from '../src/contracts.mjs';

test('existing Fold module handles preview, scoped approval, archive and distinct restore', async t => {
  const { workspace: w, ticket } = await completed(t);
  const preview = w.previewCleanup({ workflowId: ticket.id });
  assert.equal(preview.plan.effects.length, 2); assert.ok(preview.plan.exclusions.length > 0);
  assert.equal(w.previewCleanup({ workflowId: ticket.id }).review.id, preview.review.id);
  const reviewed = w.reviewCoverage({ reviewId: preview.review.id, expectedDigest: preview.review.planDigest });
  assert.equal(reviewed.approvalGranted, false);
  const fold = w.fold(w.store.read().tickets[ticket.id]);
  const receipt = fold.approval.issue(reviewed.plan);
  const args = { reviewId: reviewed.review.id, expectedDigest: reviewed.plan.digest, approvalReceipt: receipt, idempotencyKey: 'archive-1' };
  const applied = w.applyReview(args); assert.equal(applied.operation.status, 'applied');
  assert.equal(w.applyReview(args).operation.operationId, applied.operation.operationId);
  assert.equal(fold.hub.inspect().threads.filter(t => t.archived).length, 2);
  const restore = w.previewRestore({ reviewId: reviewed.review.id });
  assert.equal(restore.kind, 'restore'); const restorePlan = w.readReview({ reviewId: restore.id }).plan;
  assert.throws(() => w.applyReview({ reviewId: restore.id, expectedDigest: restore.planDigest, approvalReceipt: receipt, idempotencyKey: 'restore-wrong' }));
  const restored = w.applyReview({ reviewId: restore.id, expectedDigest: restore.planDigest, approvalReceipt: fold.approval.issue(restorePlan), idempotencyKey: 'restore-wrong' });
  assert.equal(restored.operation.status, 'applied'); assert.equal(fold.hub.inspect().threads.filter(t => t.archived).length, 0);
  const projection = w.getWorkflow({ workflowId: ticket.id });
  assert.equal(projection.cleanup.restore.status, 'applied'); assert.match(projection.nextAction, /Restore completed/);
});
test('Fold rejects approval after source state changes and never archives newly active thread', async t => {
  const { workspace: w, ticket } = await completed(t);
  const preview = w.previewCleanup({ workflowId: ticket.id });
  const reviewed = w.reviewCoverage({ reviewId: preview.review.id, expectedDigest: preview.review.planDigest });
  const fold = w.fold(w.store.read().tickets[ticket.id]); const receipt = fold.approval.issue(reviewed.plan);
  fold.hub.edit(s => { s.threads[1].activeTurn = true; });
  const applied = w.applyReview({ reviewId: reviewed.review.id, expectedDigest: reviewed.plan.digest, approvalReceipt: receipt, idempotencyKey: 'changed' });
  assert.equal(applied.operation.status, 'attention'); assert.equal(fold.hub.inspect().threads.some(t => t.archived), false);
});
test('changed plan digest and fabricated receipt are rejected', async t => {
  const { workspace: w, ticket } = await completed(t); const preview = w.previewCleanup({ workflowId: ticket.id });
  const reviewed = w.reviewCoverage({ reviewId: preview.review.id, expectedDigest: preview.review.planDigest });
  assert.throws(() => w.applyReview({ reviewId: preview.review.id, expectedDigest: preview.review.planDigest, approvalReceipt: {}, idempotencyKey: 'stale' }), { code: 'STALE_REVIEW' });
  assert.throws(() => w.applyReview({ reviewId: reviewed.review.id, expectedDigest: reviewed.plan.digest, approvalReceipt: { approved: true }, idempotencyKey: 'forged' }), { code: 'APPROVAL_INVALID' });
});
test('partial Fold changes stay partial and protected representative remains visible', async t => {
  const { workspace: w, ticket } = await completed(t); const preview = w.previewCleanup({ workflowId: ticket.id });
  const reviewed = w.reviewCoverage({ reviewId: preview.review.id, expectedDigest: preview.review.planDigest });
  const fold = w.fold(w.store.read().tickets[ticket.id]); fold.hub.faults.failThreadIds = ['thread-2'];
  const applied = w.applyReview({ reviewId: reviewed.review.id, expectedDigest: reviewed.plan.digest, approvalReceipt: fold.approval.issue(reviewed.plan), idempotencyKey: 'partial' });
  assert.equal(applied.operation.status, 'partial'); assert.equal(w.getWorkflow({ workflowId: ticket.id }).status, 'partial');
  assert.equal(fold.hub.inspect().threads[0].archived, false);
});
test('Graph adapter reads existing schema without migration or creating an absent database', t => {
  const p = temporary(t), file = path.join(p, 'graph.sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA user_version=4; CREATE TABLE scopes(scope_id TEXT,current_revision_id TEXT); CREATE TABLE graph_revisions(revision_id TEXT,scope_id TEXT,payload_json TEXT)');
  const revision = { id: 'revision', scopeId: 'scope', observationCutoff: new Date().toISOString(), nodes: [], observations: [], evidenceItems: [] };
  db.prepare('INSERT INTO scopes VALUES (?,?)').run('scope', 'revision');
  db.prepare('INSERT INTO graph_revisions VALUES (?,?,?)').run('revision', 'scope', JSON.stringify(revision)); db.close();
  const before = sha(fs.readFileSync(file)), filesBefore = fs.readdirSync(p);
  const config = { database: file, scopeId: 'scope', hostId: 'host', canonicalProjectId: 'project' };
  const adapter = new PublishedGraph(config, config);
  assert.equal(adapter.read().revision.id, 'revision'); assert.equal(sha(fs.readFileSync(file)), before); assert.deepEqual(fs.readdirSync(p), filesBefore);
  assert.throws(() => new PublishedGraph({ ...config, database: path.join(p, 'absent') }, config).read(), { code: 'ENOENT' });
  assert.equal(fs.existsSync(path.join(p, 'absent')), false);
  assert.throws(() => new PublishedGraph(config, { ...config, hostId: 'other' }).read(), { code: 'SCOPE_MISMATCH' });
});
test('Graph incompatible schema does not affect source or other services', t => {
  const p = temporary(t), file = path.join(p, 'graph.sqlite'); const db = new DatabaseSync(file); db.exec('PRAGMA user_version=99'); db.close();
  const c = { database: file, scopeId: 'scope', hostId: 'h', canonicalProjectId: 'p' }, before = sha(fs.readFileSync(file));
  assert.throws(() => new PublishedGraph(c, c).read(), { code: 'SCHEMA_UNSUPPORTED' }); assert.equal(sha(fs.readFileSync(file)), before);
});
test('read-only Graph attach interoperates with the actual pinned Registry schema', async t => {
  const { GraphRegistry } = await loadComponent('graph', path.join(siblings, 'codex-threadgraph'), 'src/registry.mjs');
  const file = path.join(temporary(t), 'real-schema.sqlite');
  const registry = new GraphRegistry(file); registry.ensureScope('scope'); registry.close();
  const before = sha(fs.readFileSync(file)), filesBefore = fs.readdirSync(path.dirname(file));
  const c = { database: file, scopeId: 'scope', hostId: 'h', canonicalProjectId: 'p' };
  assert.equal(new PublishedGraph(c, c).read().status, 'not_analyzed');
  assert.equal(sha(fs.readFileSync(file)), before);
  assert.deepEqual(fs.readdirSync(path.dirname(file)), filesBefore);
});
test('Graph live WAL attach is blocked rather than creating or altering sidecars', t => {
  const file = path.join(temporary(t), 'live.sqlite'), db = new DatabaseSync(file);
  t.after(() => db.close()); db.exec('PRAGMA journal_mode=WAL; CREATE TABLE a(x)');
  const c = { database: file, scopeId: 'scope', hostId: 'h', canonicalProjectId: 'p' };
  assert.throws(() => new PublishedGraph(c, c).read(), { code: 'GRAPH_SNAPSHOT_REQUIRED' });
});
test('pinned module mismatch is blocked before importing it', t => {
  const p = temporary(t); fs.mkdirSync(path.join(p, 'src')); fs.writeFileSync(path.join(p, 'package.json'), '{}');
  assert.throws(() => verifyComponent('port', p), { code: 'COMPONENT_MISMATCH' });
});
test('existing Port module inspects synthetic package without extraction and rejects traversal', async t => {
  const { workspace: w, project } = await fixture(t);
  const { buildFixturePackage } = await loadComponent('port', path.join(siblings, 'threadport'), 'src/package.mjs');
  const source = fs.readFileSync(path.join(siblings, 'threadport/fixtures/conversation.json'));
  const document = JSON.parse(source); const boundary = document.turns[0].id;
  const bytes = buildFixturePackage(source, boundary); fs.writeFileSync(path.join(project, 'sample.ruvora-port'), bytes);
  const before = fs.readdirSync(project); const report = w.portPreview({ localPath: 'sample.ruvora-port' });
  assert.equal(report.valid, true); assert.equal(report.nativeExecutable, false); assert.equal(report.evidenceClass, 'synthetic_only');
  assert.deepEqual(fs.readdirSync(project), before); assert.throws(() => w.portPreview({ localPath: '../sample.ruvora-port' }));
  const ticket = w.prepare({ intent: 'transfer', requestId: 'transfer', request: 'Inspect this selected package' });
  const saved = w.portPreview({ localPath: 'sample.ruvora-port', workflowId: ticket.id });
  assert.equal(w.getWorkflow({ workflowId: ticket.id }).status, 'attention');
  assert.equal(w.readReview({ reviewId: saved.review.id }).nativeExecutable, false);
  assert.equal(w.cancel({ workflowId: ticket.id, target: 'followup' }).status, 'cancelled');
  assert.equal(w.readReview({ reviewId: saved.review.id }).report.valid, true);
});
