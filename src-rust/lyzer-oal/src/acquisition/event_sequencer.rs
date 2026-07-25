use crate::types::{LineageHeader, ObservationRecord, ObservationContext};
use crate::acquisition::binance_feed::FeedEvent;
use tokio::sync::mpsc;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct EventSequencer {
    rx: mpsc::Receiver<FeedEvent>,
    context_state: ObservationContext,
}

impl EventSequencer {
    pub fn new(rx: mpsc::Receiver<FeedEvent>) -> Self {
        Self { 
            rx,
            context_state: ObservationContext::Normal,
        }
    }

    pub async fn run(&mut self) {
        println!("[OAL-SYNC] Event Sequencer Online.");

        while let Some(event) = self.rx.recv().await {
            match event {
                FeedEvent::DepthFractureDetected => {
                    println!("[OAL-SYNC] OBSERVATION_FRACTURE registered. Entering DEGRADED mode.");
                    self.context_state = ObservationContext::Degraded("Depth stream sequence broken".to_string());
                    
                    // Trigger REST Snapshot async resync here (simulated)
                    let ctx_clone = self.context_state.clone();
                    tokio::spawn(async move {
                        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                        println!("[OAL-SYNC] Snapshot Synced. Exiting DEGRADED mode.");
                        // In a real implementation we'd send a recovery event through the channel to reset state safely.
                    });
                }
                FeedEvent::AggTrade(val) => {
                    let ingress_ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64;
                    let ts = val["E"].as_u64().unwrap_or(0);
                    let id = val["a"].as_u64().unwrap_or(0);

                    let rec = ObservationRecord {
                        observation_id: format!("agg_{}_{}", id, ts),
                        lineage: LineageHeader {
                            ingress_timestamp_ns: ingress_ts,
                            feed_version: "binance_ws_agg".to_string(),
                            oal_version: "2.0.0".to_string(),
                        },
                        symbol: val["s"].as_str().unwrap_or("UNKNOWN").to_string(),
                        context: self.context_state.clone(),
                        exchange_event_id: id,
                        exchange_timestamp: ts,
                        payload_hash: "hash_impl".to_string(),
                        payload: val,
                    };

                    if matches!(self.context_state, ObservationContext::Degraded(_)) {
                        println!("[OAL-SYNC] [DEGRADED] Emitting AggTrade {}", rec.observation_id);
                    } else {
                        // Normally emit to Parquet writer channel
                    }
                }
                FeedEvent::DiffDepth(val) => {
                    let ingress_ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64;
                    let ts = val["E"].as_u64().unwrap_or(0);
                    let id = val["u"].as_u64().unwrap_or(0);

                    let rec = ObservationRecord {
                        observation_id: format!("dep_{}_{}", id, ts),
                        lineage: LineageHeader {
                            ingress_timestamp_ns: ingress_ts,
                            feed_version: "binance_ws_depth".to_string(),
                            oal_version: "2.0.0".to_string(),
                        },
                        symbol: val["s"].as_str().unwrap_or("UNKNOWN").to_string(),
                        context: self.context_state.clone(),
                        exchange_event_id: id,
                        exchange_timestamp: ts,
                        payload_hash: "hash_impl".to_string(),
                        payload: val,
                    };

                    // Normally emit to Parquet writer channel
                }
            }
        }
    }
}
