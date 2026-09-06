import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { sha, need, errorCode } from './contracts.mjs';
import { safeFile, readJSON } from './store.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function verifyComponent(name, directory) {
  const lock = readJSON(path.join(root, 'workspace-lock.json')).components[name];
  need(lock && fs.realpathSync(directory) === path.resolve(directory), 'COMPONENT_MISMATCH');
  for (const [relative, expected] of Object.entries(lock.files)) {
    const file = path.join(directory, relative);
    need(fs.existsSync(file), 'COMPONENT_MISMATCH', `${name}: pinned source file missing`);
    need(fs.realpathSync(file) === file && sha(fs.readFileSync(safeFile(file))) === expected, 'COMPONENT_MISMATCH', `${name}: pinned source differs`);
  }
  return lock;
}
export async function loadComponent(name, directory, entry) {
  const lock = verifyComponent(name, directory);
  need(Object.hasOwn(lock.files, entry), 'COMPONENT_MISMATCH');
  return import(pathToFileURL(path.join(directory, entry)).href);
}
export function unavailable(reason, mode = 'production') { return { status: 'unsupported', mode, reason }; }
export function failure(error, mode = 'production') {
  const code = errorCode(error);
  return { status: code === 'PERMISSION_DENIED' ? 'permission_denied' : code === 'COMPONENT_MISMATCH' || code === 'SCHEMA_UNSUPPORTED' ? 'unsupported' : 'disconnected', mode, reason: code };
}

// Avoid GraphRegistry's constructor: it can migrate and chmod the source DB.
// This adapter reads exactly one explicitly mapped published scope, without leases.
export class PublishedGraph {
  constructor(config, profile) { this.config = config; this.profile = profile; }
  read() {
    if (!this.config) return { status: 'not_analyzed', mode: 'production', reason: 'GRAPH_NOT_CONFIGURED' };
    const { database, scopeId, hostId, canonicalProjectId } = this.config;
    need(hostId === this.profile.hostId && canonicalProjectId === this.profile.canonicalProjectId, 'SCOPE_MISMATCH');
    need(fs.realpathSync(database) === path.resolve(database), 'UNSAFE_PATH'); safeFile(database);
    const noSidecars = () => !['-wal', '-shm', '-journal'].some(suffix => fs.existsSync(database + suffix));
    need(noSidecars(), 'GRAPH_SNAPSHOT_REQUIRED', 'Use a quiescent published snapshot without SQLite sidecars; live WAL attach is blocked.');
    const before = sha(fs.readFileSync(database));
    // readOnly alone can create WAL/SHM files. immutable URI never joins the writer.
    const db = new DatabaseSync(pathToFileURL(database).href + '?immutable=1', { readOnly: true });
    try {
      need(db.prepare('PRAGMA user_version').get().user_version === 4, 'SCHEMA_UNSUPPORTED');
      const row = db.prepare('SELECT r.revision_id, r.payload_json FROM scopes s LEFT JOIN graph_revisions r ON r.revision_id=s.current_revision_id AND r.scope_id=s.scope_id WHERE s.scope_id=?').get(scopeId);
      if (!row?.payload_json) return { status: 'not_analyzed', mode: 'production', reason: 'NO_PUBLISHED_REVISION' };
      need(row.payload_json.length <= 8 * 1024 * 1024, 'FILE_TOO_LARGE');
      const revision = JSON.parse(row.payload_json);
      need(revision.scopeId === scopeId && revision.id === row.revision_id && Array.isArray(revision.nodes) && Array.isArray(revision.evidenceItems) && Array.isArray(revision.observations), 'INVALID_GRAPH_REVISION');
      need(Number.isFinite(Date.parse(revision.observationCutoff)), 'INVALID_GRAPH_REVISION');
      return { status: 'available', mode: 'published_readonly', revision };
    } finally {
      db.close();
      need(noSidecars() && sha(fs.readFileSync(safeFile(database))) === before, 'GRAPH_CHANGED_DURING_READ');
    }
  }
}

export async function createComponents(config, profile, directory) {
  const components = { graph: new PublishedGraph(config.graph, profile), fold: null, port: null, diagnostics: {} };
  if (config.foldRoot) {
    try {
      const engine = await loadComponent('fold', config.foldRoot, 'src/engine.js');
      const adapters = await loadComponent('fold', config.foldRoot, 'src/adapters.js');
      const seed = readJSON(path.join(config.foldRoot, 'fixtures/completed-run.json'));
      components.fold = { engine, adapters, seed, directory };
      components.diagnostics.fold = config.mode === 'fixture' ? { status: 'available', mode: 'fixture', reason: 'PINNED_MODULE_SIMULATION_ONLY' } : unavailable('HOST_ATOMICITY_AND_APPROVAL_UNVERIFIED');
    } catch (e) { components.diagnostics.fold = failure(e); }
  }
  if (config.portRoot) {
    try {
      const { Service } = await loadComponent('port', config.portRoot, 'src/service.mjs');
      components.port = new Service(profile.canonicalProjectPath);
      components.diagnostics.port = { status: 'available', mode: 'static_inspection', reason: 'SYNTHETIC_FORMAT_ONLY_NATIVE_TRANSFER_BLOCKED' };
    } catch (e) { components.diagnostics.port = failure(e); }
  }
  return components;
}
