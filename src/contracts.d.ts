/** Draft host contract. There is no live implementation or auto-discovery transport. */
export type Scope = { hostId: string; canonicalProjectId: string };
export type Envelope<T> = { contractVersion: 'ruvora.interop/1'; requestId: string; operationKind: string; scope: Scope; expectedRevision: string | null; payload: T };
export type Handshake = { componentId: 'hub' | 'graph' | 'fold' | 'port'; instanceId: string; protocolVersion: 'ruvora.interop/1'; binaryDigest: string; dataSchemaVersion: number; capabilities: string[] };
export type ApprovalReceipt = { issuer: string; actorRef: string; operationKind: 'archive' | 'restore' | 'port.export' | 'port.import'; planDigest: string; approvedEffects: unknown[]; expiresAt: number; signature: string };
export interface HostHubAdapter {
  /** Peer authentication must be performed outside model-controlled tool input. */
  handshake(): Promise<Handshake>;
  dispatch(request: Envelope<{ objective: string; canonicalProjectPath: string; branch: string; contextSnapshot: unknown }> & { idempotencyKey: string }): Promise<ProductOperation>;
  findByIdempotencyKey(scope: Scope, key: string): Promise<ProductOperation | null>;
  readOperation(scope: Scope, operationId: string): Promise<ProductOperation>;
  requestInterrupt(scope: Scope, operationId: string): Promise<ProductOperation>;
}
export type ProductOperation = { id: string; scope: Scope; sequence: number; status: 'running' | 'completed' | 'partial' | 'failed' | 'cancelled'; observedAt: string; contextSnapshotDigest: string | null; representative: { hostId: string; threadId: string } | null };
/** Workspace never issues receipts and never owns archive atomicity or Turn exclusion. */
export interface TrustedHostApproval { verify(receipt: ApprovalReceipt, planDigest: string, effects: unknown[], operationKind: string): Promise<boolean> }
