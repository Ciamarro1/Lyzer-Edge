/**
 * Safe JSON Deserialization & Prototype Pollution Protection Utilities
 * (Shared package re-export / standalone module)
 */

export {
  sanitizeObject,
  safeJsonParse,
  safeMerge,
  safeClone,
  sanitizeBodyMiddleware
} from '../../../../lyzer edge/backend/utils/safeJson.js';
