import test from 'node:test';
import assert from 'node:assert/strict';
import { Workspace } from '../src/workspace.mjs';

// Projection-only fixtures: no product modules, stores, native work or approvals.
for (const stage of ['preview', 'archive', 'restore']) {
  test(`Hub disconnect remains attention after ${stage}; known results survive reconnection`, () => {
    const scope = { hostId: 'fixture-host', canonicalProjectId: 'fixture-project' };
    const workspace = new Workspace({ mode: 'fixture', profile: { ...scope, canonicalProjectPath: '/unused', branch: 'main' } }, '/unused');
    const ticket = { id: 'workflow-fixture', scope, status: 'completed', followupCleanup: true,
      dispatch: { operationId: 'work-fixture', idempotencyKey: 'request-fixture' }, reviewId: 'review-fixture' };
    const review = { kind: 'archive', operationId: stage === 'preview' ? null : 'archive-fixture',
      restoreReviewId: stage === 'restore' ? 'restore-review-fixture' : null };
    const state = { tickets: { [ticket.id]: ticket }, selections: {}, reviews: {
      'review-fixture': review, 'restore-review-fixture': { operationId: 'restore-fixture' }
    } };
    workspace.store = { read: () => structuredClone(state) };
    let disconnected = true;
    workspace.hub = { find: () => {
      if (disconnected) throw Object.assign(new Error('fixture disconnected'), { code: 'HUB_DISCONNECTED' });
      return { id: 'work-fixture', scope, mode: 'fixture', sequence: 1, status: 'completed', result: { mode: 'fixture' } };
    } };
    workspace.fold = () => ({ engine: { getOperation: ({ operationId }) => ({ operationId, status: 'applied' }) } });
    const before = structuredClone(state);
    const value = workspace.getWorkflow({ workflowId: ticket.id });
    assert.equal(value.status, 'attention');
    assert.equal(value.lastError, 'HUB_DISCONNECTED');
    assert.equal(value.observation.connection, 'disconnected');
    assert.equal(workspace.inspect().attention.length, 1);
    if (stage !== 'preview') assert.equal(value.cleanup.status, 'applied');
    if (stage === 'restore') assert.equal(value.cleanup.restore.status, 'applied');
    assert.deepEqual(state, before, 'projection must not mutate product records');
    disconnected = false;
    const recovered = workspace.getWorkflow({ workflowId: ticket.id });
    assert.equal(recovered.status, stage === 'preview' ? 'waiting_user' : 'completed');
    assert.equal(recovered.lastError, undefined);
  });
}
