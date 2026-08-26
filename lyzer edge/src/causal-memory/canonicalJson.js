/**
 * Canonical JSON serialization (deterministic RFC 8785 style).
 * Produces identical string representation regardless of object key insertion order.
 *
 * @param {*} value - Value to serialize
 * @returns {string} Deterministic canonical JSON string
 */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  // If object has a custom toJSON method (like Date), use its serialized representation
  if (typeof value.toJSON === 'function') {
    return canonicalJson(value.toJSON());
  }

  if (Array.isArray(value)) {
    const items = value.map(item => {
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol') {
        return 'null';
      }
      return canonicalJson(item);
    });
    return '[' + items.join(',') + ']';
  }

  const keys = Object.keys(value).sort();
  const entries = [];

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = value[k];

    // Omit undefined, functions, and symbols from object serialization
    if (v !== undefined && typeof v !== 'function' && typeof v !== 'symbol') {
      entries.push(JSON.stringify(k) + ':' + canonicalJson(v));
    }
  }

  return '{' + entries.join(',') + '}';
}

export default canonicalJson;
