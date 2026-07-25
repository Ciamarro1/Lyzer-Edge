use async_nats::jetstream::{self, consumer::PullConsumer};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::File;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time::sleep;
use sha2::{Sha256, Digest};

pub mod lyzer {
    tonic::include_proto!("lyzer");
}

use lyzer::intent_registry_client::IntentRegistryClient;
use lyzer::{AuditQuerySinceVersionRequest, GetMaxVersionRequest};

#[derive(Serialize, Deserialize, Clone, Debug)]
struct OrderState {
    execution_intent_id: String,
    status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct OmsState {
    last_global_version: i64,
    orders: BTreeMap<String, OrderState>,
}

impl OmsState {
    fn hash(&self) -> String {
        let canonical_json = serde_json::to_string(self).unwrap();
        let mut hasher = Sha256::new();
        hasher.update(canonical_json.as_bytes());
        hex::encode(hasher.finalize())
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct OmsSnapshotEnvelope {
    snapshot_hash: String,
    state: OmsState,
}

async fn hydrate_state(
    registry_client: &mut IntentRegistryClient<tonic::transport::Channel>,
    snapshot: &mut OmsState,
    start_version: i64,
) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
    let query_req = tonic::Request::new(AuditQuerySinceVersionRequest {
        last_global_version: start_version,
    });
    
    let query_res = registry_client.audit_query_since_version(query_req).await?.into_inner();
    
    let mut hydrated_count = 0;
    for ev in query_res.events {
        apply_event_to_state(snapshot, &ev.execution_intent_id, &ev.event_type, ev.global_version);
        hydrated_count += 1;
    }
    
    Ok(hydrated_count)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    println!("Starting Lyzer OMS...");

    let args: Vec<String> = std::env::args().collect();
    let verify_integrity = args.contains(&"--verify-integrity".to_string());

    let snapshot_file = "oms_snapshot.json";
    let mut snapshot = OmsState {
        last_global_version: 0,
        orders: BTreeMap::new(),
    };

    let mut loaded_from_file = false;
    let mut registry_client = IntentRegistryClient::connect("http://[::1]:50052").await?;
    println!("Connected to Intent Registry gRPC");

    if let Ok(mut file) = File::open(snapshot_file) {
        let mut contents = String::new();
        if file.read_to_string(&mut contents).is_ok() {
            match serde_json::from_str::<OmsSnapshotEnvelope>(&contents) {
                Ok(envelope) => {
                    if envelope.snapshot_hash != envelope.state.hash() {
                        println!("CRITICAL: SNAPSHOT_TAMPERING detected! Discarding snapshot and forcing full replay.");
                    } else {
                        // Check for FUTURE_TIMELINE_DETECTED
                        let req = tonic::Request::new(GetMaxVersionRequest {});
                        if let Ok(res) = registry_client.get_max_version(req).await {
                            let max_v = res.into_inner().max_global_version;
                            if envelope.state.last_global_version > max_v {
                                println!("CRITICAL: FUTURE_TIMELINE_DETECTED! Snapshot version {} > Event Store version {}. Rejecting snapshot.", envelope.state.last_global_version, max_v);
                            } else {
                                snapshot = envelope.state;
                                println!("Loaded snapshot with last_global_version = {}", snapshot.last_global_version);
                                loaded_from_file = true;
                            }
                        } else {
                            println!("Warning: Could not fetch max_global_version. Rejecting snapshot to be safe.");
                        }
                    }
                }
                Err(_) => {
                    println!("CRITICAL: Snapshot parse failure (Corrupted or Truncated). Rejecting snapshot and forcing full replay.");
                }
            }
        }
    }

    let mut snapshot_a = snapshot.clone();
    let hydrated_count = hydrate_state(&mut registry_client, &mut snapshot_a, snapshot.last_global_version).await?;
    
    if loaded_from_file {
        println!("Hydrated {} events from AuditQuerySinceVersion (Fast Recovery Mode)", hydrated_count);
    }

    if verify_integrity && loaded_from_file {
        println!("Deep Integrity Mode: Verifying Snapshot Hash...");
        let hash_a = snapshot_a.hash();
        
        let mut snapshot_b = OmsState {
            last_global_version: 0,
            orders: BTreeMap::new(),
        };
        hydrate_state(&mut registry_client, &mut snapshot_b, 0).await?;
        let hash_b = snapshot_b.hash();
        
        if hash_a == hash_b {
            println!("✅ Projection Integrity Certification PASSED: Hash(State_A) == Hash(State_B)");
        } else {
            println!("❌ SNAPSHOT_DIVERGENCE DETECTED!");
            println!("Hash A (Snapshot+Partial): {}", hash_a);
            println!("Hash B (Full Replay): {}", hash_b);
            println!("Discarding snapshot and using State_B (Full Replay)!");
            let _ = std::fs::remove_file(snapshot_file);
            snapshot_a = snapshot_b;
        }
    }

    snapshot = snapshot_a;

    if hydrated_count > 0 && (!verify_integrity || loaded_from_file) {
        save_snapshot(&snapshot, snapshot_file);
    }

    let shared_state = Arc::new(Mutex::new(snapshot));

    let lag_monitor_state = Arc::clone(&shared_state);
    let mut lag_monitor_client = IntentRegistryClient::connect("http://[::1]:50052").await?;
    tokio::spawn(async move {
        loop {
            sleep(Duration::from_secs(2)).await;
            let req = tonic::Request::new(GetMaxVersionRequest {});
            if let Ok(res) = lag_monitor_client.get_max_version(req).await {
                let registry_version = res.into_inner().max_global_version;
                let projection_version = lag_monitor_state.lock().unwrap().last_global_version;
                
                let lag = registry_version - projection_version;
                if lag > 10 { // 10 versions lag threshold
                    println!("[DEGRADED] Projection Lag is {} versions. Registry: {}, Projection: {}", lag, registry_version, projection_version);
                }
            }
        }
    });

    let nats_client = async_nats::connect("127.0.0.1:4222").await?;
    let js = jetstream::new(nats_client.clone());

    let consumer = js
        .get_stream("execution_stream")
        .await?
        .get_or_create_consumer("oms_processor", jetstream::consumer::pull::Config {
            durable_name: Some("oms_processor".to_string()),
            filter_subject: "execution.committed.>".to_string(),
            ..Default::default()
        })
        .await?;

    let mut messages = consumer.messages().await?;
    let mut events_since_snapshot = 0;

    println!("OMS Stateful Projection Engine running...");

    while let Some(msg_res) = messages.next().await {
        if let Ok(msg) = msg_res {
            let payload = String::from_utf8_lossy(&msg.payload);
            
            match serde_json::from_str::<lyzer::IntentEventRecord>(&payload) {
                Ok(record) => {
                    let mut state = shared_state.lock().unwrap();
                    
                    if record.global_version > state.last_global_version {
                        apply_event_to_state(&mut state, &record.execution_intent_id, &record.event_type, record.global_version);
                        events_since_snapshot += 1;

                        if events_since_snapshot >= 10 {
                            save_snapshot(&state, snapshot_file);
                            events_since_snapshot = 0;
                        }

                        if record.event_type == "CREATED" {
                            let ack_payload = serde_json::json!({
                                "event_type": "ORDER_ACK"
                            }).to_string();

                            let pending_req = lyzer::AppendIntentEventRequest {
                                execution_intent_id: record.execution_intent_id.clone(),
                                correlation_id: record.correlation_id.clone(),
                                causation_id: record.event_id.clone(),
                                event_type: "ORDER_ACK".to_string(),
                                event_schema_version: 1,
                                expected_version: record.version + 1,
                                payload_json: ack_payload,
                            };

                            let pending_json = serde_json::to_string(&pending_req).unwrap();
                            nats_client.publish("execution.pending.order_ack", bytes::Bytes::from(pending_json)).await?;
                            println!("Emitted execution.pending.order_ack for Intent {}", record.execution_intent_id);
                        }
                    } else {
                        println!("Skipped old event for Intent {}, g_version {}", record.execution_intent_id, record.global_version);
                    }
                }
                Err(e) => {
                    println!("Failed to deserialize IntentEventRecord: {}. Payload: {}", e, payload);
                }
            }
            
            msg.ack().await?;
        }
    }

    Ok(())
}

fn apply_event_to_state(snapshot: &mut OmsState, execution_intent_id: &str, event_type: &str, global_version: i64) {
    let status = match event_type {
        "CREATED" => "PENDING",
        "ORDER_ACK" => "ACK",
        "ORDER_PARTIAL" => "PARTIAL",
        "ORDER_FILLED" => "FILLED",
        "ORDER_REJECTED" => "REJECTED",
        "ORDER_CANCELLED" => "CANCELLED",
        "ORDER_ZOMBIE" => "ZOMBIE",
        _ => return, 
    };

    snapshot.orders.insert(execution_intent_id.to_string(), OrderState {
        execution_intent_id: execution_intent_id.to_string(),
        status: status.to_string(),
    });

    snapshot.last_global_version = global_version;
    println!("Projection updated: Intent {} -> {}", execution_intent_id, status);
}

fn save_snapshot(state: &OmsState, file_path: &str) {
    if let Ok(mut file) = File::create(file_path) {
        let envelope = OmsSnapshotEnvelope {
            snapshot_hash: state.hash(),
            state: state.clone(),
        };
        if let Ok(json) = serde_json::to_string(&envelope) {
            let _ = file.write_all(json.as_bytes());
            println!("Saved Projection Snapshot at global_version {}", state.last_global_version);
        }
    }
}
