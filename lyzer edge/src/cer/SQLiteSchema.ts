export const CER_DDL = `
CREATE TABLE IF NOT EXISTS cer_evidence (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    classification TEXT NOT NULL,
    retention_class TEXT NOT NULL,
    eps REAL NOT NULL,
    ncr REAL NOT NULL,
    ccs REAL NOT NULL,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cer_rollups (
    id TEXT PRIMARY KEY,
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    rollup_type TEXT NOT NULL,
    causal_narrative TEXT,
    aggregated_metrics TEXT NOT NULL,
    rollup_provenance TEXT NOT NULL,
    rollup_confidence REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS epoch_metadata (
    constitution_version TEXT PRIMARY KEY,
    constitution_hash TEXT NOT NULL,
    transition_timestamp INTEGER NOT NULL,
    previous_constitution TEXT,
    structural_changes TEXT
);
`;
