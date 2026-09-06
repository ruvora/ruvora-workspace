import { createHash, randomUUID } from 'node:crypto';
export class WorkspaceError extends Error {
  constructor(code, message = code) { super(message); this.code = code; }
}
export function need(condition, code, message) { if (!condition) throw new WorkspaceError(code, message); }
export const id = prefix => `${prefix}_${randomUUID()}`;
export const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  need(value !== undefined && (typeof value !== 'number' || Number.isFinite(value)), 'INVALID_JSON');
  return JSON.stringify(value);
};
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const digest = value => sha(canonical(value));
export const same = (a, b) => canonical(a) === canonical(b);
export const text = { type: 'string', minLength: 1, maxLength: 4000 };
export const token = { ...text, maxLength: 200 };
export const bool = { type: 'boolean' };
export const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
export const choice = (...values) => ({ type: 'string', enum: values });
export function validate(schema, value) {
  if (schema.type === 'object') {
    need(value && typeof value === 'object' && !Array.isArray(value), 'INVALID_ARGUMENTS');
    for (const k of schema.required ?? []) need(Object.hasOwn(value, k), 'INVALID_ARGUMENTS', `Missing ${k}`);
    need(schema.additionalProperties !== false || Object.keys(value).every(k => Object.hasOwn(schema.properties, k)), 'INVALID_ARGUMENTS', 'Unknown argument');
    for (const [k, v] of Object.entries(value)) if (schema.properties?.[k]) validate(schema.properties[k], v);
  } else if (schema.type === 'array') {
    need(Array.isArray(value) && value.length <= (schema.maxItems ?? 100), 'INVALID_ARGUMENTS');
    value.forEach(v => validate(schema.items, v));
  } else {
    need(typeof value === schema.type, 'INVALID_ARGUMENTS');
    if (schema.type === 'string') need(value.length >= (schema.minLength ?? 0) && value.length <= (schema.maxLength ?? 4000), 'INVALID_ARGUMENTS');
  }
  if (schema.enum) need(schema.enum.includes(value), 'INVALID_ARGUMENTS');
}
export const scopeSchema = object({ hostId: token, canonicalProjectId: token });
export const errorCode = error => ['EACCES', 'EPERM'].includes(error.code) ? 'PERMISSION_DENIED' : error.code ?? 'CONNECTION_FAILED';
