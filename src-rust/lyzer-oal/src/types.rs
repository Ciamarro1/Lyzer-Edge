use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ObservationContext {
    Normal,
    Degraded(String), // Reason for degradation (e.g. Depth fractured)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageHeader {
    pub ingress_timestamp_ns: u64,
    pub feed_version: String,
    pub oal_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObservationRecord {
    pub observation_id: String, // Hash(Symbol + Exchange_Event_ID + Exchange_Timestamp + Payload_Hash)
    pub lineage: LineageHeader,
    pub symbol: String,
    pub context: ObservationContext,
    pub exchange_event_id: u64, // e.g. Binance 'u' or 'a'
    pub exchange_timestamp: u64,
    pub payload_hash: String,
    pub payload: serde_json::Value, // Raw, uninterpreted data
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ObservationType {
    AggTrade(ObservationRecord),
    DiffDepth(ObservationRecord),
    Snapshot(ObservationRecord),
    Fracture { 
        timestamp: u64,
        reason: String,
    },
}
