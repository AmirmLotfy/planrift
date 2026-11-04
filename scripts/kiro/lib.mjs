// Shared helpers for Kiro hook scripts. Hooks receive the event as JSON on stdin.

export async function readEvent() {
  if (process.stdin.isTTY) return {};
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Collects every string value in an object (tool inputs vary by tool). */
export function stringValues(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => stringValues(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => stringValues(v, out));
  return out;
}
