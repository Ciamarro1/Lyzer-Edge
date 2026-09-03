import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

describe('H012 Confirmatory Contract & Cryptographic Lock Tests', () => {
  const baseDir = path.resolve(process.cwd(), 'research/alpha_confirmation/H012_FUNDING_SQUEEZE');
  const v8Path = path.resolve(process.cwd(), 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');

  it('G-LOCK-01: Engine V8 SHA-256 matches production invariant', () => {
    const buf = fs.readFileSync(v8Path);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    expect(sha).toBe('fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1');
  });

  it('G-LOCK-02: Preregistration Lock exists and is LOCKED', () => {
    const lockPath = path.join(baseDir, 'preregistration/H012_PREREGISTRATION_LOCK.json');
    expect(fs.existsSync(lockPath)).toBe(true);

    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    expect(lock.hypothesisId).toBe('H012');
    expect(lock.status).toBe('LOCKED_AWAITING_EXECUTIVE_UNLOCK');
    expect(lock.executiveUnlockToken).toBeNull();
  });

  it('G-LOCK-03: Frozen files match their recorded SHA-256 hashes bit-for-bit', () => {
    const lockPath = path.join(baseDir, 'preregistration/H012_PREREGISTRATION_LOCK.json');
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

    for (const [relPath, meta] of Object.entries(lock.fileHashes)) {
      const fullPath = path.join(baseDir, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const buf = fs.readFileSync(fullPath);
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      expect(sha).toBe(meta.sha256);
      expect(buf.length).toBe(meta.sizeBytes);
    }
  });

  it('G-LOCK-04: Confirmatory Charter specifies non-adaptive single-hypothesis protocol (M=1)', () => {
    const charterPath = path.join(baseDir, 'charter/H012_CONFIRMATORY_CHARTER.md');
    const content = fs.readFileSync(charterPath, 'utf8');
    expect(content).toContain('M = 1');
    expect(content).toContain('p_block < 0.0500');
    expect(content).toContain('N_confirmatory >= 100');
    expect(content).toContain('E[R]_net >= +0.150R');
  });
});
