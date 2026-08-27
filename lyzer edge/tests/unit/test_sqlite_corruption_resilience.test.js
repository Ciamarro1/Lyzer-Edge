import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { CausalMemoryDB } from '../../backend/db.js';

describe('SQLite Corruption Resilience & Self-Healing', () => {
    const testDir = path.join(process.cwd(), 'temp_test_corrupt');
    const testDbPath = path.join(testDir, 'test_corrupted_causal.db');

    afterEach(async () => {
        if (fs.existsSync(testDir)) {
            try {
                fs.rmSync(testDir, { recursive: true, force: true });
            } catch (_) {}
        }
    });

    it('successfully detects invalid file header, quarantines it, and recreates a healthy database', async () => {
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

        fs.writeFileSync(testDbPath, 'CORRUPTED_DISK_IMAGE_HEADER_BYTES_RANDOM_GARBAGE_1234567890');

        const dbInstance = new CausalMemoryDB(testDbPath);
        await dbInstance.ensureReady();

        const newEvent = {
            event_id: 'CORRUPT_TEST_EVENT_001',
            timestamp: Date.now(),
            event_type: 'RESILIENCE_TEST',
            source: 'TEST_RUNNER',
            correlation_id: 'CORR_TEST_001',
            payload: { recovered: true },
            context: { status: 'healthy' }
        };

        await dbInstance.insertCausalEvent(newEvent);
        await dbInstance.flushCausalEvents();

        const events = await dbInstance.getCausalEventsByCorrelation('CORR_TEST_001');
        expect(events).toBeDefined();
        expect(events.length).toBe(1);
        expect(events[0].event_id).toBe('CORRUPT_TEST_EVENT_001');

        const files = fs.readdirSync(testDir);
        const quarantineFiles = files.filter(f => f.includes('.corrupted.'));
        expect(quarantineFiles.length).toBeGreaterThanOrEqual(1);

        await dbInstance.close();
    });

    it('successfully recovers from malformed disk image (SQLITE_CORRUPT)', async () => {
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

        // Create real database and corrupt mid-file
        await new Promise((resolve) => {
            const rawDb = new sqlite3.Database(testDbPath, () => {
                rawDb.run('CREATE TABLE temp_t (id INT);', () => {
                    rawDb.run('INSERT INTO temp_t VALUES (100);', () => {
                        rawDb.close(() => resolve());
                    });
                });
            });
        });

        // Corrupt internal bytes to trigger SQLITE_CORRUPT
        const buf = fs.readFileSync(testDbPath);
        buf.fill(0xAA, 100, 300);
        fs.writeFileSync(testDbPath, buf);

        const dbInstance = new CausalMemoryDB(testDbPath);
        await dbInstance.ensureReady();

        const events = await dbInstance.getRecentCausalEvents(10);
        expect(Array.isArray(events)).toBe(true);

        await dbInstance.close();
    });
});