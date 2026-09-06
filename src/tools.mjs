import { object, token, text, bool, choice, validate, need } from './contracts.mjs';
const definitions = [
  ['workspace_get_capabilities', 'capabilities', {}, [], true, 'Inspect capabilities and explicit unsupported integrations.'],
  ['workspace_inspect_workspace', 'inspect', {}, [], true, 'Read project status; never starts work or semantic indexing.'],
  ['workspace_graph_read', 'graph', {}, [], true, 'Read one configured published graph revision without refresh.'],
  ['workspace_select_context', 'selectContext', { expectedRevision: token, evidenceIds: { type: 'array', items: token, maxItems: 100 }, reason: text, acceptStale: bool }, ['expectedRevision', 'evidenceIds', 'reason'], false, 'Pin applicable evidence references; stale acceptance grants no execution permission.'],
  ['workspace_prepare_workflow', 'prepare', { intent: choice('work', 'cleanup', 'transfer'), request: text, requestId: token, contextId: token, followupCleanup: bool }, ['intent', 'request', 'requestId'], false, 'Record requested stages only; no product operation is started.'],
  ['workspace_get_workflow', 'getWorkflow', { workflowId: token }, ['workflowId'], true, 'Reconcile an existing operation without replaying it.'],
  ['workspace_hub_dispatch', 'dispatch', { workflowId: token }, ['workflowId'], false, 'Explicit dispatch; native integration is blocked, fixture mode simulates only.'],
  ['workspace_cancel_workflow', 'cancel', { workflowId: token, target: choice('followup', 'running_work') }, ['workflowId', 'target'], false, 'Cancel future stages or separately request interruption; preserve completed results.'],
  ['workspace_fold_preview', 'previewCleanup', { workflowId: token }, ['workflowId'], false, 'Create one completed-work cleanup review through pinned Fold; fixture only.'],
  ['workspace_read_review', 'readReview', { reviewId: token }, ['reviewId'], true, 'Read exact Fold plan, exclusions, coverage and effects.'],
  ['workspace_review_coverage', 'reviewCoverage', { reviewId: token, expectedDigest: token }, ['reviewId', 'expectedDigest'], false, 'Acknowledge coverage with a new Fold revision; does not issue approval.'],
  ['workspace_fold_apply', 'applyReview', { reviewId: token, expectedDigest: token, approvalReceipt: { type: 'object' }, idempotencyKey: token }, ['reviewId', 'expectedDigest', 'approvalReceipt', 'idempotencyKey'], false, 'Pass a separately trusted receipt to Fold; no issuer is exposed; native mutation is blocked.'],
  ['workspace_fold_restore_preview', 'previewRestore', { reviewId: token }, ['reviewId'], false, 'Prepare a separate restore review for changes owned by an archive operation.'],
  ['workspace_port_preview', 'portPreview', { localPath: text, workflowId: token }, ['localPath'], false, 'Inspect a package inside the selected project using pinned Port; optionally save a transfer review, never extracts or executes.'],
  ['workspace_graph_refresh', 'graphRefresh', {}, [], true, 'Blocked until an authenticated explicit-refresh host adapter exists.'],
  ['workspace_port_export', 'portExport', {}, [], true, 'Blocked: native G0 and G3 are unverified.'],
  ['workspace_port_import', 'portImport', {}, [], true, 'Blocked: native G0 and G3 are unverified.'],
  ['workspace_open_work', 'navigate', { workflowId: token }, ['workflowId'], true, 'Blocked: no verified native navigation adapter; no generated links.']
];
export const tools = definitions.map(([name, method, properties, required, readOnlyHint, description]) => ({ name, method, description, inputSchema: object(properties, required), annotations: { readOnlyHint, destructiveHint: false, idempotentHint: readOnlyHint, openWorldHint: false } }));
export function callTool(workspace, name, args = {}) {
  const tool = tools.find(t => t.name === name); need(tool, 'UNKNOWN_TOOL'); validate(tool.inputSchema, args);
  if (!tool.annotations.readOnlyHint) workspace.requireSelected();
  return typeof workspace[tool.method] === 'function' ? workspace[tool.method](args) : workspace.block(tool.method);
}
