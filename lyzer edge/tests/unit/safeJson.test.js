import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  safeJsonParse,
  sanitizeObject,
  safeMerge,
  safeClone,
  sanitizeBodyMiddleware
} from '../../backend/utils/safeJson.js';

describe('Safe JSON & Prototype Pollution Defense Utilities', () => {
  beforeEach(() => {
    // Ensure Object.prototype is clean before each test
    delete Object.prototype.polluted;
    delete Object.prototype.isAdmin;
    delete Object.prototype.evil;
  });

  afterEach(() => {
    // Clean up Object.prototype after each test
    delete Object.prototype.polluted;
    delete Object.prototype.isAdmin;
    delete Object.prototype.evil;
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON correctly', () => {
      const json = '{"name": "Lyzer", "value": 42, "active": true}';
      const result = safeJsonParse(json);
      expect(result).toEqual({ name: 'Lyzer', value: 42, active: true });
    });

    it('should strip __proto__ and prevent prototype pollution', () => {
      const maliciousJson = '{"__proto__": {"polluted": true, "isAdmin": true}, "normal": "ok"}';
      const result = safeJsonParse(maliciousJson);

      expect(result.normal).toBe('ok');
      expect(result.__proto__).not.toEqual({ polluted: true, isAdmin: true });
      expect(Object.prototype.polluted).toBeUndefined();
      expect(Object.prototype.isAdmin).toBeUndefined();
    });

    it('should strip constructor and prototype keys', () => {
      const maliciousJson = '{"constructor": {"prototype": {"evil": true}}, "valid": 123}';
      const result = safeJsonParse(maliciousJson);

      expect(result.valid).toBe(123);
      expect(result.constructor).toBe(Object);
      expect(Object.prototype.evil).toBeUndefined();
    });

    it('should strip prototype pollution vectors deeply inside nested objects and arrays', () => {
      const payload = JSON.stringify({
        level1: {
          __proto__: { polluted: true },
          arr: [
            { constructor: { prototype: { evil: true } } },
            "safe"
          ]
        }
      });

      const result = safeJsonParse(payload);
      expect(result.level1.arr[1]).toBe("safe");
      expect(Object.prototype.polluted).toBeUndefined();
      expect(Object.prototype.evil).toBeUndefined();
    });

    it('should return fallback when JSON is invalid or input is not a string', () => {
      expect(safeJsonParse('{invalid json}', { error: true })).toEqual({ error: true });
      expect(safeJsonParse(null, 'default')).toBe('default');
      expect(safeJsonParse(123, null)).toBeNull();
      expect(safeJsonParse(undefined)).toBeNull();
    });
  });

  describe('sanitizeObject', () => {
    it('should recursively remove __proto__, constructor, and prototype properties', () => {
      const obj = {
        name: 'test',
        __proto__: { polluted: true },
        nested: {
          constructor: { prototype: { evil: true } },
          value: 100
        }
      };

      const sanitized = sanitizeObject(obj);
      expect(sanitized.name).toBe('test');
      expect(sanitized.nested.value).toBe(100);
      expect(Object.prototype.polluted).toBeUndefined();
      expect(Object.prototype.evil).toBeUndefined();
    });

    it('should handle arrays correctly', () => {
      const arr = [
        { __proto__: { polluted: true }, val: 1 },
        { normal: 2 }
      ];

      const sanitized = sanitizeObject(arr);
      expect(sanitized[0].val).toBe(1);
      expect(sanitized[1].normal).toBe(2);
      expect(Object.prototype.polluted).toBeUndefined();
    });

    it('should handle circular references without infinite loop', () => {
      const obj = { name: 'circular' };
      obj.self = obj;

      const sanitized = sanitizeObject(obj);
      expect(sanitized.name).toBe('circular');
      expect(sanitized.self).toBe(sanitized);
    });

    it('should return non-object inputs untouched', () => {
      expect(sanitizeObject(null)).toBeNull();
      expect(sanitizeObject('str')).toBe('str');
      expect(sanitizeObject(42)).toBe(42);
      expect(sanitizeObject(true)).toBe(true);
    });
  });

  describe('safeMerge', () => {
    it('should safely merge multiple objects', () => {
      const target = { a: 1 };
      const src1 = { b: 2 };
      const src2 = { c: { d: 3 } };

      const result = safeMerge(target, src1, src2);
      expect(result).toEqual({ a: 1, b: 2, c: { d: 3 } });
    });

    it('should reject prototype pollution attempts during deep merge', () => {
      const target = {};
      const maliciousSource = JSON.parse('{"__proto__": {"polluted": true}, "a": {"b": 1}}');

      safeMerge(target, maliciousSource);

      expect(target.a).toEqual({ b: 1 });
      expect(Object.prototype.polluted).toBeUndefined();
    });

    it('should handle constructor and prototype keys safely', () => {
      const target = {};
      const maliciousSource = JSON.parse('{"constructor": {"prototype": {"isAdmin": true}}}');

      safeMerge(target, maliciousSource);

      expect(Object.prototype.isAdmin).toBeUndefined();
    });

    it('should handle non-object target or sources gracefully', () => {
      expect(safeMerge(null, { a: 1 })).toEqual({ a: 1 });
      expect(safeMerge({ a: 1 }, null, undefined, 42)).toEqual({ a: 1 });
    });
  });

  describe('safeClone', () => {
    it('should deep clone objects and arrays', () => {
      const original = { a: 1, b: [2, 3], c: { d: 4 } };
      const cloned = safeClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.c).not.toBe(original.c);
    });

    it('should strip prototype pollution keys when cloning', () => {
      const malicious = JSON.parse('{"__proto__": {"polluted": true}, "data": [1, 2]}');
      const cloned = safeClone(malicious);

      expect(cloned.data).toEqual([1, 2]);
      expect(Object.prototype.polluted).toBeUndefined();
    });

    it('should return primitive values unchanged', () => {
      expect(safeClone(null)).toBeNull();
      expect(safeClone(123)).toBe(123);
      expect(safeClone('hello')).toBe('hello');
    });
  });

  describe('sanitizeBodyMiddleware', () => {
    it('should sanitize req.body, req.query, and req.params and call next()', () => {
      const req = {
        body: JSON.parse('{"__proto__": {"polluted": true}, "username": "alice"}'),
        query: JSON.parse('{"constructor": {"prototype": {"evil": true}}, "search": "test"}'),
        params: { id: '123' }
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      sanitizeBodyMiddleware(req, {}, next);

      expect(nextCalled).toBe(true);
      expect(req.body.username).toBe('alice');
      expect(req.query.search).toBe('test');
      expect(req.params.id).toBe('123');
      expect(Object.prototype.polluted).toBeUndefined();
      expect(Object.prototype.evil).toBeUndefined();
    });

    it('should handle missing body, query, or params gracefully', () => {
      const req = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      expect(() => sanitizeBodyMiddleware(req, {}, next)).not.toThrow();
      expect(nextCalled).toBe(true);
    });
  });
});
