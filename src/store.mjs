import fs from 'node:fs';
import path from 'node:path';
import { need, id, same } from './contracts.mjs';

export function safeFile(file) {
  const stat = fs.lstatSync(file);
  need(stat.isFile() && stat.nlink === 1 && !stat.isSymbolicLink(), 'UNSAFE_PATH');
  need(stat.size <= 16 * 1024 * 1024, 'FILE_TOO_LARGE');
  return file;
}
export function readJSON(file) { return JSON.parse(fs.readFileSync(safeFile(file), 'utf8')); }
export function privateDirectory(directory) {
  const absolute = path.resolve(directory);
  let current = path.parse(absolute).root;
  for (const segment of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) fs.mkdirSync(current, { mode: 0o700 });
    const stat = fs.lstatSync(current);
    need(stat.isDirectory() && !stat.isSymbolicLink(), 'UNSAFE_PATH');
  }
}
export function atomicJSON(file, data) {
  if (fs.existsSync(file)) safeFile(file);
  const tmp = `${file}.${id('tmp')}`;
  let fd;
  try {
    fd = fs.openSync(tmp, 'wx', 0o600);
    fs.writeFileSync(fd, JSON.stringify(data, null, 2) + '\n'); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    fs.renameSync(tmp, file);
    const directory = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
  } finally { if (fd !== undefined) fs.closeSync(fd); if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
}
// Only Workspace metadata is written here. Product task status is never owned here.
export class Store {
  constructor(directory, profile) { this.directory = directory; this.profile = profile; this.file = path.join(directory, 'state.json'); }
  read() {
    if (!fs.existsSync(this.file)) return { schemaVersion: 1, profile: this.profile, selections: {}, tickets: {}, requests: {}, reviews: {} };
    const state = readJSON(this.file);
    need(state.schemaVersion === 1, 'STATE_VERSION_UNSUPPORTED');
    need(same(state.profile, this.profile), 'PROJECT_RECONNECT_REQUIRED');
    return state;
  }
  transaction(fn) {
    privateDirectory(this.directory);
    const lock = path.join(this.directory, 'writer.lock');
    let fd;
    try { fd = fs.openSync(lock, 'wx', 0o600); }
    catch (e) { if (e.code === 'EEXIST') need(false, 'WORKSPACE_BUSY', 'Existing writer lock; inspect its process before manual recovery.'); throw e; }
    try {
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })); fs.fsyncSync(fd);
      const state = this.read();
      const save = () => atomicJSON(this.file, state);
      const result = fn(state, save);
      need(!(result instanceof Promise), 'ASYNC_TRANSACTION_FORBIDDEN');
      save(); return structuredClone(result ?? null);
    } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
}
