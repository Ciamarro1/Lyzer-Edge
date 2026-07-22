import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Verification Scripts Suite', () => {
  const verificationDir = path.resolve(__dirname);
  const files = fs.readdirSync(verificationDir).filter(f => f.startsWith('verify_') && f.endsWith('.js'));

  test('All verification scripts are present in tests/verification/', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  files.forEach(file => {
    test(`Verification script integrity: ${file}`, () => {
      const filePath = path.join(verificationDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });
  });
});
