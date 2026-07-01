import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LESSON_REGISTRY_PATH = path.join(__dirname, '../data/lesson_registry.json');

export function initializeLessonRegistry() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(LESSON_REGISTRY_PATH)) {
        fs.writeFileSync(LESSON_REGISTRY_PATH, JSON.stringify([]));
    }
}

export function recordLesson(lessonData) {
    try {
        initializeLessonRegistry();
        
        const rawData = fs.readFileSync(LESSON_REGISTRY_PATH);
        let registry = JSON.parse(rawData);

        registry.push({
            id: `lesson_${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...lessonData
        });
        
        fs.writeFileSync(LESSON_REGISTRY_PATH, JSON.stringify(registry, null, 2));
    } catch (err) {
        console.error(`[LESSON REGISTRY] Failed to record lesson:`, err.message);
    }
}

export function getAllLessons() {
    try {
        if (!fs.existsSync(LESSON_REGISTRY_PATH)) return [];
        const rawData = fs.readFileSync(LESSON_REGISTRY_PATH);
        return JSON.parse(rawData);
    } catch (err) {
        return [];
    }
}
