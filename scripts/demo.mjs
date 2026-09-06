import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { root, loadComponent } from '../src/components.mjs';
import { initialize, openWorkspace } from '../src/workspace.mjs';
import { report } from '../src/report.mjs';

const siblings = path.dirname(root.replace(/\/$/, ''));
const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ruvora-workspace-demo-')));
try {
  initialize(project, { mode: 'fixture', profile: { hostId: 'fixture-host', canonicalProjectId: 'fixture-project', displayName: 'Local fixture journey', branch: 'main' }, foldRoot: path.join(siblings, 'threadfold'), portRoot: path.join(siblings, 'threadport') });
  let workspace = await openWorkspace(project);
  const context = workspace.selectContext({ expectedRevision: 'fixture-revision-1', evidenceIds: ['evidence-1'], reason: 'Preserve source designs in this simulated journey.' });
  const ticket = workspace.prepare({ intent: 'work', request: 'Demonstrate context → work → cleanup using synthetic records', requestId: 'demo-request', contextId: context.id, followupCleanup: true });
  workspace.hub.loseResponse = true;
  const dispatched = workspace.dispatch({ workflowId: ticket.id });
  workspace = await openWorkspace(project);
  const reconciled = workspace.dispatch({ workflowId: ticket.id });
  assert.equal(dispatched.dispatch.operationId, reconciled.dispatch.operationId);
  workspace.hub.advance(reconciled.dispatch.operationId);
  const preview = workspace.previewCleanup({ workflowId: ticket.id });
  const reviewed = workspace.reviewCoverage({ reviewId: preview.review.id, expectedDigest: preview.review.planDigest });
  const fold = workspace.fold(workspace.store.read().tickets[ticket.id]);
  // Fixture issuer is intentionally available only in this explicit test harness.
  const archive = workspace.applyReview({ reviewId: reviewed.review.id, expectedDigest: reviewed.plan.digest, approvalReceipt: fold.approval.issue(reviewed.plan), idempotencyKey: 'demo-archive' });
  const restore = workspace.previewRestore({ reviewId: reviewed.review.id });
  const restored = workspace.applyReview({ reviewId: restore.id, expectedDigest: restore.planDigest, approvalReceipt: fold.approval.issue(workspace.readReview({ reviewId: restore.id }).plan), idempotencyKey: 'demo-restore' });
  const { buildFixturePackage } = await loadComponent('port', path.join(siblings, 'threadport'), 'src/package.mjs');
  const source = fs.readFileSync(path.join(siblings, 'threadport/fixtures/conversation.json'));
  fs.writeFileSync(path.join(project, 'sample.ruvora-port'), buildFixturePackage(source, 'first'));
  const port = workspace.portPreview({ localPath: 'sample.ruvora-port' });
  assert.equal(archive.operation.status, 'applied'); assert.equal(restored.operation.status, 'applied'); assert.equal(port.nativeExecutable, false);
  console.log(report(workspace.inspect()));
  console.log(JSON.stringify({ mode: 'fixture', nativeThreadsCreated: 0, nativeArchives: 0,
    operationCount: Object.keys(workspace.hub.store.read().operations).length,
    context: context.id, operationId: reconciled.dispatch.operationId,
    archive: { operationId: archive.operation.operationId, status: archive.operation.status, items: archive.operation.itemResults },
    restore: { operationId: restored.operation.operationId, status: restored.operation.status, items: restored.operation.itemResults }, port }, null, 2));
} finally { fs.rmSync(project, { recursive: true, force: true }); }
