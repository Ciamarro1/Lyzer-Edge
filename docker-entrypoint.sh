#!/bin/sh
set -e

echo "🚀 [LYZER BOOT] Initializing container runtime on Railway/PaaS..."

# 1. Start NATS JetStream Server in background
echo "📡 [NATS] Spawning NATS JetStream server..."
(nats-server -js > /dev/null 2>&1 &)

# 2. Spawning Rust IPC Hub and Edge Services if available
if command -v lyzer-core-hub >/dev/null 2>&1; then
    echo "⚡ [RUST HUB] Starting lyzer-core-hub..."
    (lyzer-core-hub > /dev/null 2>&1 &)
fi

if command -v lyzer-risk-gateway >/dev/null 2>&1; then
    echo "🛡️  [RISK GATEWAY] Starting lyzer-risk-gateway..."
    (lyzer-risk-gateway > /dev/null 2>&1 &)
fi

if command -v lyzer-intent-registry >/dev/null 2>&1; then
    echo "📜 [INTENT REGISTRY] Starting lyzer-intent-registry..."
    (lyzer-intent-registry > /dev/null 2>&1 &)
fi

# 3. Seed initial Causal Memory from repository if missing, empty or corrupted
mkdir -p /tmp/data
if [ -f "/tmp/data/historical_causal_memory.db" ] && [ -s "/tmp/data/historical_causal_memory.db" ]; then
    # Verify existing DB integrity if python3 is available
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "import sqlite3; con = sqlite3.connect('/tmp/data/historical_causal_memory.db'); cur = con.cursor(); cur.execute('PRAGMA quick_check;'); res = cur.fetchone(); exit(0 if res and res[0] == 'ok' else 1)" 2>/dev/null || {
            echo "⚠️ [SEED] Existing database in /tmp/data is corrupted! Resetting from bundled seed..."
            rm -f /tmp/data/historical_causal_memory.db* 2>/dev/null || true
            if [ -f "historical_causal_memory.db" ]; then
                cp "historical_causal_memory.db" "/tmp/data/historical_causal_memory.db"
            fi
        }
    fi
elif [ -f "historical_causal_memory.db" ]; then
    echo "🌱 [SEED] Seeding bundled Causal Memory to /tmp/data..."
    rm -f /tmp/data/historical_causal_memory.db* 2>/dev/null || true
    cp "historical_causal_memory.db" "/tmp/data/historical_causal_memory.db"
fi

# 4. Non-blocking cloud restore (backgrounded with error trapping so /healthz is never blocked)
(
    if [ -f "backup_restore.py" ]; then
        echo "☁️ [BACKUP] Attempting non-blocking background restore..."
        python3 backup_restore.py restore || echo "⚠️ [BACKUP] Restore skipped or failed, operating in local mode."
    fi
) &

# 4. Spawning shadow microstructure recorder in background if present
if [ -f "../recovery/oos11_microstructure_discovery.mjs" ]; then
    echo "🔬 [OOS-11] Starting shadow microstructure recorder..."
    (node ../recovery/oos11_microstructure_discovery.mjs > /dev/null 2>&1 &)
fi

# 5. Hand over to Node.js backend as PID 1 immediately
echo "🔥 [BACKEND] Starting Lyzer Edge server on port ${PORT:-7860}..."
exec node --max-old-space-size=384 backend/server.js
