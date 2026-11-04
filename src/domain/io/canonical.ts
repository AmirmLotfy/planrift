import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/**
 * Deterministic JSON: object keys sorted, no whitespace. Two structurally equal values always
 * serialise to the same string, which makes fingerprints stable across sessions and machines.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = (value as Record<string, unknown>)[key];
      if (child !== undefined) out[key] = sortValue(child);
    }
    return out;
  }
  return value;
}

/** SHA-256 of the canonical JSON, lowercase hex. */
export function fingerprint(value: unknown): string {
  return bytesToHex(sha256(utf8ToBytes(canonicalJson(value))));
}

export function shortFingerprint(hex: string): string {
  return hex.slice(0, 12);
}
