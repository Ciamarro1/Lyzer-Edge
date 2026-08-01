/**
 * Safe JSON Deserialization & Prototype Pollution Protection Utilities
 * Provides prototype-safe JSON parsing, object sanitization, merging, cloning, and Express middleware.
 */

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Checks if a value is a plain object (not null, not array, not Date/RegExp/Buffer, etc.)
 */
function isPlainObject(val) {
  return (
    val !== null &&
    typeof val === 'object' &&
    !Array.isArray(val) &&
    !(val instanceof Date) &&
    !(val instanceof RegExp)
  );
}

/**
 * Recursively deletes __proto__, constructor, prototype properties from an object.
 * Safe against circular references using a WeakSet.
 *
 * @param {any} obj - Target object or primitive to sanitize.
 * @param {WeakSet} [seen] - WeakSet tracking visited objects.
 * @returns {any} Sanitized object or original primitive value.
 */
export function sanitizeObject(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return obj;
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitizeObject(obj[i], seen);
    }
    return obj;
  }

  // Explicitly remove dangerous properties from own properties or prototype pollution attempts
  for (const key of DANGEROUS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      try {
        delete obj[key];
      } catch (e) {
        // Fallback if property is non-configurable
      }
    }
  }

  const keys = Object.getOwnPropertyNames(obj);
  for (const key of keys) {
    if (DANGEROUS_KEYS.has(key)) {
      try {
        delete obj[key];
      } catch (e) {
        // Ignore non-deletable properties
      }
    } else {
      obj[key] = sanitizeObject(obj[key], seen);
    }
  }

  return obj;
}

/**
 * Custom JSON.parse reviver filtering out __proto__, constructor, and prototype keys.
 * Returns fallback if jsonString is invalid or not a string.
 *
 * @param {string} jsonString - The JSON string to parse.
 * @param {any} [fallback=null] - Fallback value if parsing fails or input is invalid.
 * @returns {any} Parsed and sanitized object/primitive, or fallback.
 */
export function safeJsonParse(jsonString, fallback = null) {
  if (typeof jsonString !== 'string' || jsonString === null || jsonString === undefined) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonString, (key, value) => {
      if (DANGEROUS_KEYS.has(key)) {
        return undefined;
      }
      return value;
    });

    return sanitizeObject(parsed);
  } catch (err) {
    return fallback;
  }
}

/**
 * Prototype-safe shallow/deep merge function.
 * Merges source objects into target while omitting dangerous prototype properties.
 *
 * @param {object} target - Target object to merge into.
 * @param {...object} sources - Source objects to merge from.
 * @returns {object} Merged prototype-safe object.
 */
export function safeMerge(target = {}, ...sources) {
  let result = target;
  if (result === null || typeof result !== 'object') {
    result = {};
  }

  for (const source of sources) {
    if (source === null || typeof source !== 'object') continue;

    const keys = Object.getOwnPropertyNames(source);
    for (const key of keys) {
      if (DANGEROUS_KEYS.has(key)) continue;

      let sourceVal;
      try {
        sourceVal = source[key];
      } catch (e) {
        continue;
      }

      if (isPlainObject(sourceVal)) {
        if (!isPlainObject(result[key])) {
          result[key] = {};
        }
        safeMerge(result[key], sourceVal);
      } else if (Array.isArray(sourceVal)) {
        result[key] = safeClone(sourceVal);
      } else {
        result[key] = sourceVal;
      }
    }
  }

  return result;
}

/**
 * Deep clone helper using structuredClone or prototype-safe fallback.
 *
 * @param {any} obj - Value to clone.
 * @returns {any} Deeply cloned and sanitized value.
 */
export function safeClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Attempt standard structuredClone if available
  if (typeof structuredClone === 'function') {
    try {
      const cloned = structuredClone(obj);
      return sanitizeObject(cloned);
    } catch (e) {
      // Fallback for non-serializable objects (functions, DOM elements, etc.)
    }
  }

  // Fallback via JSON stringification or recursive clone
  try {
    const jsonStr = JSON.stringify(obj);
    if (jsonStr !== undefined) {
      const parsed = safeJsonParse(jsonStr, null);
      if (parsed !== null) return parsed;
    }
  } catch (e) {
    // Stringify failed
  }

  return fallbackDeepClone(obj);
}

/**
 * Fallback deep clone for non-JSON or circular objects.
 */
function fallbackDeepClone(obj, seen = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj)) return seen.get(obj);

  if (Array.isArray(obj)) {
    const copy = [];
    seen.set(obj, copy);
    for (let i = 0; i < obj.length; i++) {
      copy[i] = fallbackDeepClone(obj[i], seen);
    }
    return copy;
  }

  const copy = {};
  seen.set(obj, copy);

  const keys = Object.getOwnPropertyNames(obj);
  for (const key of keys) {
    if (!DANGEROUS_KEYS.has(key)) {
      try {
        copy[key] = fallbackDeepClone(obj[key], seen);
      } catch (e) {
        // Skip uncopyable properties
      }
    }
  }

  return copy;
}

/**
 * Express middleware sanitizing req.body, req.query, and req.params against prototype pollution.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware callback.
 */
export function sanitizeBodyMiddleware(req, res, next) {
  if (req) {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
  }
  if (typeof next === 'function') {
    next();
  }
}
