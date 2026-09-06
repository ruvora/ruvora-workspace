import path from 'node:path';
import { Store } from './store.mjs';
import { need, digest, same } from './contracts.mjs';

// Contract double only. No daemon, worker, native thread, model or task graph.
export class FixtureHub {
  mode = 'fixture';
  constructor(directory, profile) { this.profile = profile; this.store = new Store(path.join(directory, 'fixture-hub'), profile); this.loseResponse = false; }
  dispatch(request) {
    const result = this.store.transaction(s => {
      s.operations ??= {};
      const key = digest(request.idempotencyKey);
      if (s.operations[key]) { need(same(s.operations[key].request, request), 'IDEMPOTENCY_CONFLICT'); return s.operations[key]; }
      const operation = { id: `fixture-work-${key.slice(0, 24)}`, status: 'running', sequence: 1, scope: request.scope, mode: 'fixture', request, representative: null, result: null };
      s.operations[key] = operation; return operation;
    });
    if (this.loseResponse) throw Object.assign(new Error('Simulated response loss'), { code: 'RESPONSE_LOST' });
    return result;
  }
  find(key) { return this.store.read().operations?.[digest(key)] ?? null; }
  read(id) { const op = Object.values(this.store.read().operations ?? {}).find(o => o.id === id); need(op, 'OPERATION_NOT_FOUND'); return op; }
  // Test and demo harness only, never exposed as a gateway tool.
  advance(id, status = 'completed') {
    need(['completed', 'partial', 'failed', 'cancelled'].includes(status), 'INVALID_STATUS');
    return this.store.transaction(s => {
      const op = Object.values(s.operations ?? {}).find(o => o.id === id); need(op, 'OPERATION_NOT_FOUND');
      need(op.status === 'running', 'TERMINAL_OPERATION'); op.status = status; op.sequence++;
      op.result = { evidenceClass: 'fixture', message: 'Synthetic work result; no implementation was executed by Hub.' }; return op;
    });
  }
  interrupt(id) { return this.advance(id, 'cancelled'); }
}
export function fixtureGraph(profile) {
  return { status: 'available', mode: 'fixture', revision: { id: 'fixture-revision-1', scopeId: profile.canonicalProjectId,
    observationCutoff: new Date().toISOString(), observations: [{ id: 'obs-1', observedAt: new Date().toISOString(), threadId: 'fixture-source' }],
    evidenceItems: [{ id: 'evidence-1', observationId: 'obs-1', summary: 'Retain original design bytes.', branch: profile.branch }],
    nodes: [{ id: 'fixture-source', kind: 'thread', evidenceIds: ['evidence-1'] }], relations: [] } };
}
