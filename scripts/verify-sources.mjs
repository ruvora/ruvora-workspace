import fs from 'node:fs';
import path from 'node:path';
import { root, verifyComponent } from '../src/components.mjs';
import { sha, need } from '../src/contracts.mjs';
const lock = JSON.parse(fs.readFileSync(path.join(root, 'workspace-lock.json'), 'utf8'));
for (const [file, expected] of Object.entries(lock.sourceDesigns)) {
  const actual = sha(fs.readFileSync(path.join(root, file))); need(actual === expected, 'SOURCE_DESIGN_CHANGED'); console.log(`${actual}  ${file}`);
}
for (const [name, component] of Object.entries(lock.components)) {
  verifyComponent(name, component.source); console.log(`${name}: ${Object.keys(component.files).length} pinned source files match; ${component.commit || 'no commit'}`);
}
