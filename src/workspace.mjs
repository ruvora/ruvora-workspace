import path from 'node:path';
import fs from 'node:fs';
import { Store, readJSON, privateDirectory } from './store.mjs';
import { need, id, digest, same, validate, object, token, text, choice, errorCode } from './contracts.mjs';
import { createComponents, unavailable, failure } from './components.mjs';
import { FixtureHub, fixtureGraph } from './fixture.mjs';

const profileSchema = object({ hostId: token, canonicalProjectId: token, canonicalProjectPath: text, displayName: token, branch: token });
const graphSchema = object({ database: text, scopeId: token, hostId: token, canonicalProjectId: token });
const configSchema = object({ mode: choice('production', 'fixture'), profile: profileSchema, graph: graphSchema, foldRoot: text, portRoot: text }, ['mode', 'profile']);
export function initialize(project, input) {
  const canonicalProjectPath = fs.realpathSync(project);
  need(fs.statSync(canonicalProjectPath).isDirectory(), 'INVALID_PROJECT');
  const config = { ...input, profile: { ...input.profile, canonicalProjectPath } };
  validate(configSchema, config);
  const directory = path.join(canonicalProjectPath, '.ruvora-workspace');
  privateDirectory(directory);
  const file = path.join(directory, 'config.json');
  // Initialization is not an implicit migration, identity change or fixture promotion.
  if (fs.existsSync(file)) { need(same(readJSON(file), config), 'PROJECT_RECONNECT_REQUIRED'); return config; }
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return config;
}
export async function openWorkspace(project) {
  const canonicalProjectPath = fs.realpathSync(project);
  const directory = path.join(canonicalProjectPath, '.ruvora-workspace');
  const file = path.join(directory, 'config.json');
  if (!fs.existsSync(file)) return new Workspace({ mode: 'production', profile: { hostId: 'unselected', canonicalProjectId: 'unselected', canonicalProjectPath, displayName: path.basename(project), branch: 'unknown' } }, directory, {}, false);
  need(fs.realpathSync(directory) === directory, 'UNSAFE_PATH');
  const config = readJSON(file); validate(configSchema, config);
  need(config.profile.canonicalProjectPath === canonicalProjectPath, 'PROJECT_RECONNECT_REQUIRED');
  return new Workspace(config, directory, await createComponents(config, config.profile, directory));
}

export class Workspace {
  constructor(config, directory, components = {}, selected = true) {
    this.config = config; this.profile = config.profile; this.directory = directory; this.selected = selected;
    this.scope = { hostId: this.profile.hostId, canonicalProjectId: this.profile.canonicalProjectId };
    this.store = new Store(directory, { ...this.profile, mode: config.mode }); this.components = components;
    this.hub = config.mode === 'fixture' ? new FixtureHub(directory, this.store.profile) : null;
    this.foldInstances = new Map();
    // Fixed per process observation. Reading never refreshes semantic content.
    this.fixtureRevision = config.mode === 'fixture' ? fixtureGraph(this.profile) : null;
  }
  capabilities() {
    return { contractVersion: 'ruvora.interop/1', mode: this.config.mode, selected: this.selected, scope: this.scope,
      observedAt: new Date().toISOString(), host: { panel: false, navigation: false, trustedApproval: false, scheduledFollowup: false },
      components: {
        hub: this.hub ? { status: 'available', mode: 'fixture', reason: 'CONTRACT_DOUBLE_NO_NATIVE_EXECUTION' } : unavailable('AUTHENTICATED_REUSE_AND_CONTEXT_DISPATCH_UNVERIFIED'),
        graph: this.graph(), fold: this.components.diagnostics?.fold ?? unavailable('FOLD_NOT_CONFIGURED'),
        port: this.components.diagnostics?.port ?? unavailable('PORT_NOT_CONFIGURED') },
      effects: { hubDispatch: this.hub ? 'fixture_only' : 'blocked', graphRefresh: 'blocked', foldApply: this.hub && this.components.fold ? 'fixture_only_with_receipt' : 'blocked', portExport: 'blocked', portImport: 'blocked' },
      migration: 'read_only_attach_only', uninstall: 'Disconnect gateway; retain all product and Workspace data; do not stop Hub.' };
  }
  graph() {
    try {
      const value = this.fixtureRevision ?? this.components.graph?.read() ?? { status: 'not_analyzed', mode: 'production', reason: 'GRAPH_NOT_CONFIGURED' };
      if (!value.revision) return value;
      const age = Date.now() - Date.parse(value.revision.observationCutoff);
      return { ...value, freshness: age < 0 || age > 300000 ? 'stale' : 'current', observedAt: new Date().toISOString(), evidenceObservedAt: value.revision.observationCutoff };
    } catch (e) { return failure(e); }
  }
  inspect() {
    const s = this.store.read();
    const work = Object.values(s.tickets).map(t => this.projectTicket(t));
    const graph = this.graph();
    return { profile: this.profile, capabilities: this.capabilities(), observedAt: new Date().toISOString(),
      attention: work.filter(t => ['waiting_user', 'attention', 'partial'].includes(t.status)), work,
      context: { ...graph, selections: Object.values(s.selections) }, reviews: Object.values(s.reviews),
      nextAction: this.selected ? 'Choose context or prepare a workflow; refresh and execution are separate actions.' : 'Select a project using CLI init.',
      navigation: { status: 'unsupported', reason: 'No verified host navigation adapter; no links fabricated.' } };
  }
  requireSelected() { need(this.selected, 'PROJECT_NOT_SELECTED'); }
  selectContext({ expectedRevision, evidenceIds, reason, acceptStale = false }) {
    this.requireSelected(); const graph = this.graph();
    need(graph.status === 'available', 'CONTEXT_UNAVAILABLE');
    need(graph.revision.id === expectedRevision, 'STALE_REVISION');
    need(graph.freshness === 'current' || acceptStale, 'STALE_CONTEXT');
    need(evidenceIds.length > 0 && new Set(evidenceIds).size === evidenceIds.length, 'INVALID_EVIDENCE');
    const references = evidenceIds.map(evidenceId => {
      const e = graph.revision.evidenceItems.find(e => e.id === evidenceId); need(e, 'EVIDENCE_NOT_FOUND');
      const observation = graph.revision.observations.find(o => o.id === e.observationId); need(observation, 'SOURCE_UNAVAILABLE');
      need(e.branch === this.profile.branch || e.applicability?.branch === this.profile.branch, 'BRANCH_APPLICABILITY_UNVERIFIED');
      const conflicts = (graph.revision.relations ?? []).filter(r => r.kind === 'contradicts' && r.evidenceIds?.includes(evidenceId));
      need(conflicts.length === 0, 'CONTEXT_CONFLICT', 'Resolve conflicting source evidence before selection.');
      return { evidenceId, observationId: e.observationId, threadRef: observation.threadId ? { hostId: this.profile.hostId, threadId: observation.threadId } : null, observedAt: observation.observedAt ?? graph.evidenceObservedAt, evidenceDigest: digest(e), authority: false };
    });
    const selection = { id: id('context'), scope: this.scope, branch: this.profile.branch, revision: expectedRevision, reason, references,
      evidenceObservedAt: graph.evidenceObservedAt, observedAt: new Date().toISOString(), acceptStale, mode: graph.mode };
    selection.digest = digest(selection);
    return this.store.transaction(s => { s.selections[selection.id] = selection; return selection; });
  }
  prepare({ intent, request, requestId, contextId = null, followupCleanup = false }) {
    this.requireSelected();
    need(intent === 'work' || (!contextId && !followupCleanup), 'INVALID_WORKFLOW');
    const binding = digest({ intent, request, contextId, followupCleanup, scope: this.scope, branch: this.profile.branch });
    return this.store.transaction(s => {
      const key = digest(requestId); const prior = s.requests[key];
      if (prior) { need(prior.binding === binding, 'IDEMPOTENCY_CONFLICT'); return s.tickets[prior.id]; }
      if (contextId) need(s.selections[contextId], 'CONTEXT_NOT_FOUND');
      const ticket = { id: id('workflow'), createdAt: new Date().toISOString(), scope: this.scope, branch: this.profile.branch, mode: this.config.mode,
        requestId, request, intent, contextId, followupCleanup, followupCancelled: false, status: 'prepared', dispatch: null, reviewId: null,
        steps: intent === 'work' ? ['hub.dispatch', ...(followupCleanup ? ['fold.preview', 'fold.review'] : [])] : [intent === 'cleanup' ? 'fold.preview' : 'port.preview'],
        effects: intent === 'work' ? { nativeThreads: 'unknown_until_host_preview', archive: 0, localMetadata: true } : { nativeThreads: 0, archive: 0, localMetadata: true },
        nextAction: intent === 'work' ? 'Dispatch explicitly; implementation intent authorizes its scope.' : intent === 'cleanup' ? 'Choose one completed work item and request its cleanup preview.' : 'Inspect one selected local package; native transfer is blocked.' };
      s.tickets[ticket.id] = ticket; s.requests[key] = { binding, id: ticket.id }; return ticket;
    });
  }
  dispatch({ workflowId }) {
    this.requireSelected(); need(this.hub, 'HUB_DISPATCH_UNSUPPORTED');
    return this.store.transaction((s, save) => {
      const t = s.tickets[workflowId]; need(t?.intent === 'work', 'WORKFLOW_NOT_FOUND');
      need(t.status !== 'cancelled', 'WORKFLOW_CANCELLED');
      if (t.dispatch) {
        const existing = this.hub.find(t.dispatch.idempotencyKey);
        if (existing) { this.acceptOperation(t, existing); return this.projectTicket(t); }
        t.status = 'attention'; t.nextAction = 'Reconcile the recorded request; automatic dispatch retry is blocked.'; return t;
      }
      const context = t.contextId ? s.selections[t.contextId] : null;
      if (context) {
        const graph = this.graph(); need(graph.status === 'available' && graph.revision.id === context.revision, 'STALE_REVISION');
        need(graph.freshness === 'current' || context.acceptStale, 'STALE_CONTEXT');
        for (const ref of context.references) need(digest(graph.revision.evidenceItems.find(e => e.id === ref.evidenceId) ?? null) === ref.evidenceDigest, 'CONTEXT_CHANGED');
      }
      const request = { contractVersion: 'ruvora.interop/1', requestId: t.requestId, operationKind: 'hub.dispatch', scope: this.scope,
        expectedRevision: context?.revision ?? null, idempotencyKey: `workspace:${t.id}`, payload: { objective: t.request, canonicalProjectPath: this.profile.canonicalProjectPath, branch: t.branch, contextSnapshot: context } };
      t.dispatch = { idempotencyKey: request.idempotencyKey, requestDigest: digest(request), operationId: null }; t.status = 'attention'; save();
      try { this.acceptOperation(t, this.hub.dispatch(request)); }
      catch (e) { t.lastError = errorCode(e); t.nextAction = 'Read this workflow again to reconcile; do not create a new request.'; }
      return this.projectTicket(t);
    });
  }
  acceptOperation(t, op) {
    need(op.mode === this.config.mode && same(op.scope, t.scope), 'OPERATION_SCOPE_MISMATCH');
    need(!t.dispatch.operationId || t.dispatch.operationId === op.id, 'OPERATION_ID_MISMATCH');
    need(Number.isSafeInteger(op.sequence) && op.sequence >= (t.observation?.sequence ?? 0), 'OUT_OF_ORDER_OBSERVATION');
    need(['running', 'completed', 'partial', 'failed', 'cancelled'].includes(op.status), 'INVALID_OPERATION');
    t.dispatch.operationId = op.id;
    t.observation = { operationId: op.id, sequence: op.sequence, status: op.status, observedAt: new Date().toISOString(), representative: null, result: op.result };
    t.status = op.status === 'failed' ? 'attention' : op.status;
    if (op.status === 'completed' && t.followupCleanup && !t.followupCancelled) t.status = 'waiting_user';
    t.nextAction = t.status === 'waiting_user' ? 'Request cleanup preview manually; no host scheduler is available.' : op.status === 'running' ? 'Observe the product operation.' : 'Review the product result.';
    delete t.lastError;
  }
  projectTicket(ticket) {
    const t = structuredClone(ticket);
    let workObservationFailed = false;
    if (t.dispatch) {
      try { need(this.hub, 'HUB_DISCONNECTED'); const op = this.hub.find(t.dispatch.idempotencyKey); need(op, 'RECONCILIATION_REQUIRED'); this.acceptOperation(t, op); }
      catch (e) { workObservationFailed = true; t.status = 'attention'; t.lastError = errorCode(e); t.observation = { ...t.observation, connection: 'disconnected' }; }
    }
    if (t.reviewId) {
      const r = this.store.read().reviews[t.reviewId];
      if (r?.kind === 'port.inspection') { if (t.status !== 'cancelled') t.status = 'attention'; }
      else if (r?.operationId) {
        try {
          const engine = this.fold(t).engine, op = engine.getOperation({ operationId: r.operationId });
          t.status = op.status === 'applied' ? 'completed' : op.status === 'partial' ? 'partial' : 'attention'; t.cleanup = { operationId: op.operationId, status: op.status };
          t.nextAction = op.status === 'applied' ? 'Review completed cleanup; restore requires a separate review and approval.' : 'Inspect per-item cleanup results and reconcile incomplete changes.';
          const restore = r.restoreReviewId ? this.store.read().reviews[r.restoreReviewId] : null;
          if (restore?.operationId) {
            const result = engine.getOperation({ operationId: restore.operationId }); t.cleanup.restore = { operationId: result.operationId, status: result.status };
            t.status = result.status === 'applied' ? 'completed' : result.status === 'partial' ? 'partial' : 'attention';
            t.nextAction = result.status === 'applied' ? 'Restore completed; review the retained work and cleanup history.' : 'Inspect per-item restore results; completed work is retained.';
          }
        }
        catch (e) { t.status = 'attention'; t.lastError = errorCode(e); }
      } else if (r?.applyIntent) {
        t.status = 'attention'; t.nextAction = 'Reconcile the saved Fold apply with the same idempotency key.';
      } else if (!t.followupCancelled) t.status = 'waiting_user';
    }
    if (workObservationFailed) {
      t.status = 'attention';
      t.nextAction = 'Reconnect and reconcile the work observation; retained cleanup results do not confirm its current state.';
    }
    return t;
  }
  getWorkflow({ workflowId }) { const t = this.store.read().tickets[workflowId]; need(t, 'WORKFLOW_NOT_FOUND'); return this.projectTicket(t); }
  cancel({ workflowId, target }) {
    return this.store.transaction(s => {
      const t = s.tickets[workflowId]; need(t, 'WORKFLOW_NOT_FOUND');
      if (target === 'followup') { t.followupCancelled = true; if (!t.dispatch) { t.status = 'cancelled'; t.nextAction = 'Future stages cancelled; retained inspections and product results remain available.'; } }
      else { need(this.hub && t.dispatch?.operationId, 'HUB_INTERRUPT_UNSUPPORTED'); this.acceptOperation(t, this.hub.interrupt(t.dispatch.operationId)); }
      return this.projectTicket(t);
    });
  }
  fold(ticket, { create = false } = {}) {
    need(this.config.mode === 'fixture' && this.components.fold, 'FOLD_PREVIEW_UNSUPPORTED');
    const runId = ticket.dispatch?.operationId; need(runId, 'WORK_NOT_DISPATCHED');
    if (this.foldInstances.has(runId)) return this.foldInstances.get(runId);
    const { engine: { ThreadFold }, adapters: { FixtureHub: FoldHub, FixtureApproval }, seed: original } = this.components.fold;
    const seed = structuredClone(original);
    seed.hostId = this.profile.hostId; seed.canonicalProjectId = this.profile.canonicalProjectId; seed.canonicalProjectPath = this.profile.canonicalProjectPath; seed.branch = this.profile.branch; seed.runId = runId;
    seed.runs.forEach(r => { r.runId = runId; });
    for (const thread of seed.threads) {
      thread.ref.hostId = seed.hostId; thread.projectId = seed.canonicalProjectId; thread.runRefs = [runId]; thread.effectRefs.forEach(r => { r.hostId = seed.hostId; });
      for (const claim of thread.claims) { claim.applicability.projectId = seed.canonicalProjectId; claim.applicability.branch = seed.branch; claim.evidenceRefs.forEach(e => { e.threadRef.hostId = seed.hostId; }); }
    }
    const directory = path.join(this.directory, 'fixture-fold', digest(runId));
    if (create) { privateDirectory(path.join(directory, 'hub')); privateDirectory(path.join(directory, 'records')); }
    else {
      for (const part of ['hub', 'records']) {
        const p = path.join(directory, part);
        need(fs.existsSync(p) && fs.realpathSync(p) === p && fs.readdirSync(p).some(f => /^\d{12}\.json$/.test(f)), 'PRODUCT_DATA_UNAVAILABLE');
      }
    }
    const hub = new FoldHub(path.join(directory, 'hub'), seed), approval = new FixtureApproval();
    const value = { hub, approval, engine: new ThreadFold({ directory: path.join(directory, 'records'), hub, approval }) };
    this.foldInstances.set(runId, value); return value;
  }
  previewCleanup({ workflowId }) {
    this.requireSelected();
    return this.store.transaction((s, save) => {
      const t = s.tickets[workflowId]; need(t, 'WORKFLOW_NOT_FOUND'); need(!t.followupCancelled, 'FOLLOWUP_CANCELLED');
      const current = this.projectTicket(t); need(current.observation?.status === 'completed' && !current.lastError, 'RUN_NOT_COMPLETED');
      t.dispatch = current.dispatch;
      // Persist an intent before Fold's non-idempotent preview API. Unknown outcomes never replay.
      if (t.reviewId) return this.readReview({ reviewId: t.reviewId });
      need(!t.previewPending, 'PREVIEW_RECONCILIATION_REQUIRED');
      const product = this.fold(t, { create: true }); t.previewPending = true; save();
      const { snapshot } = product.engine.inspect({ projectId: this.profile.canonicalProjectId, runId: t.dispatch.operationId });
      const { plan } = product.engine.prepare({ snapshotId: snapshot.snapshotId });
      const review = this.reviewRef(t, plan); s.reviews[review.id] = review; t.reviewId = review.id; t.previewPending = false; t.status = 'waiting_user';
      return { review, ...product.engine.readPlan({ planId: plan.planId, revision: plan.revision }) };
    });
  }
  reviewRef(t, plan) { return { id: id('review'), workflowId: t.id, mode: 'fixture', kind: plan.kind, planId: plan.planId, revision: plan.revision, planDigest: plan.digest, effects: plan.effects, expiresAt: plan.expiresAt, operationId: null, createdAt: new Date().toISOString() }; }
  readReview({ reviewId }) {
    const s = this.store.read(), review = s.reviews[reviewId]; need(review, 'REVIEW_NOT_FOUND');
    if (review.kind === 'port.inspection') return { review, report: review.report, nativeExecutable: false };
    return { review, ...this.fold(s.tickets[review.workflowId]).engine.readPlan({ planId: review.planId, revision: review.revision }) };
  }
  reviewCoverage({ reviewId, expectedDigest }) {
    return this.store.transaction(s => {
      const review = s.reviews[reviewId]; need(review && review.planDigest === expectedDigest, 'STALE_REVIEW');
      const { plan } = this.fold(s.tickets[review.workflowId]).engine.revise({ planId: review.planId, expectedRevision: review.revision, edits: { coverageReviewed: true } });
      review.revision = plan.revision; review.planDigest = plan.digest; review.effects = plan.effects; review.expiresAt = plan.expiresAt;
      return { review, plan, approvalGranted: false };
    });
  }
  applyReview({ reviewId, expectedDigest, approvalReceipt, idempotencyKey }) {
    need(this.config.mode === 'fixture', 'TRUSTED_APPROVAL_UNAVAILABLE');
    return this.store.transaction((s, save) => {
      const r = s.reviews[reviewId]; need(r && r.planDigest === expectedDigest, 'STALE_REVIEW');
      need(['archive', 'restore'].includes(r.kind), 'OPERATION_KIND_MISMATCH');
      const t = s.tickets[r.workflowId]; need(!t.followupCancelled, 'FOLLOWUP_CANCELLED');
      if (r.applyIntent) need(r.applyIntent.idempotencyKey === idempotencyKey && r.applyIntent.planDigest === expectedDigest, 'IDEMPOTENCY_CONFLICT');
      r.applyIntent = { idempotencyKey, planDigest: expectedDigest }; save();
      const result = this.fold(t).engine.apply({ planId: r.planId, revision: r.revision, approvalReceipt, idempotencyKey });
      r.operationId = result.operationId; return { review: r, operation: result };
    });
  }
  previewRestore({ reviewId }) {
    return this.store.transaction((s, save) => {
      const r = s.reviews[reviewId]; need(r?.kind === 'archive' && r.operationId, 'RESTORE_UNAVAILABLE');
      if (r.restoreReviewId) return s.reviews[r.restoreReviewId];
      need(!r.restorePending, 'PREVIEW_RECONCILIATION_REQUIRED');
      r.restorePending = true; save();
      const t = s.tickets[r.workflowId]; const { plan } = this.fold(t).engine.prepareRestore({ operationId: r.operationId });
      const review = this.reviewRef(t, plan); s.reviews[review.id] = review; r.restoreReviewId = review.id; r.restorePending = false; return review;
    });
  }
  portPreview({ localPath, workflowId = null }) {
    need(this.components.port, 'PORT_NOT_CONFIGURED');
    if (!workflowId) return this.components.port.call('port_inspect_package', { localPath });
    this.requireSelected();
    return this.store.transaction(s => {
      const t = s.tickets[workflowId]; need(t?.intent === 'transfer' && t.status !== 'cancelled', 'WORKFLOW_NOT_FOUND');
      const report = this.components.port.call('port_inspect_package', { localPath });
      if (t.reviewId) { const prior = s.reviews[t.reviewId]; need(prior.planDigest === report.packageDigest, 'STALE_REVIEW'); return { review: prior, report }; }
      const review = { id: id('review'), workflowId, scope: this.scope, kind: 'port.inspection', mode: 'static_inspection', planDigest: report.packageDigest, report, createdAt: new Date().toISOString(), nativeExecutable: false };
      s.reviews[review.id] = review; t.reviewId = review.id; t.status = 'attention'; t.nextAction = 'Inspect the compatibility report. Native export/import remains blocked by G0/G3.';
      return { review, report };
    });
  }
  block(kind) { need(false, { graphRefresh: 'GRAPH_REFRESH_HOST_UNVERIFIED', portExport: 'PORT_G0_G3_UNVERIFIED', portImport: 'PORT_G0_G3_UNVERIFIED', navigate: 'HOST_NAVIGATION_UNSUPPORTED' }[kind] ?? 'UNSUPPORTED'); }
}
