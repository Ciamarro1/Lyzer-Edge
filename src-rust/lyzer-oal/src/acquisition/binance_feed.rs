use futures_util::StreamExt;
use reqwest;
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use crate::types::{ObservationRecord, LineageHeader, ObservationContext};

#[derive(Debug)]
pub enum FeedEvent {
    AggTrade(Value),
    DiffDepth(Value),
    DepthFractureDetected,
}

pub struct BinanceFeed {
    symbol: String,
    tx: mpsc::Sender<FeedEvent>,
}

impl BinanceFeed {
    pub fn new(symbol: String, tx: mpsc::Sender<FeedEvent>) -> Self {
        Self { symbol, tx }
    }

    pub async fn start(&self) {
        let agg_tx = self.tx.clone();
        let dep_tx = self.tx.clone();
        
        let sym_lower = self.symbol.to_lowercase();
        let agg_url = format!("wss://stream.binance.com:9443/ws/{}@aggTrade", sym_lower);
        let dep_url = format!("wss://stream.binance.com:9443/ws/{}@depth@100ms", sym_lower);

        println!("[OAL-A] Initiating connection to: {}", agg_url);
        println!("[OAL-A] Initiating connection to: {}", dep_url);

        // Spawn AggTrade Stream
        tokio::spawn(async move {
            match connect_async(agg_url).await {
                Ok((ws_stream, _)) => {
                    println!("[OAL-A] AggTrade Connected.");
                    let (_, mut read) = ws_stream.split();
                    while let Some(msg) = read.next().await {
                        if let Ok(Message::Text(text)) = msg {
                            if let Ok(value) = serde_json::from_str::<Value>(&text) {
                                let _ = agg_tx.send(FeedEvent::AggTrade(value)).await;
                            }
                        }
                    }
                }
                Err(e) => println!("[OAL-A] AggTrade Connect Error: {:?}", e),
            }
        });

        // Spawn DiffDepth Stream
        tokio::spawn(async move {
            match connect_async(dep_url).await {
                Ok((ws_stream, _)) => {
                    println!("[OAL-A] DiffDepth Connected.");
                    let (_, mut read) = ws_stream.split();
                    
                    let mut expected_update_id = 0;

                    while let Some(msg) = read.next().await {
                        if let Ok(Message::Text(text)) = msg {
                            if let Ok(value) = serde_json::from_str::<Value>(&text) {
                                // Simulate Fracture Detection via Sequence break
                                let current_u = value["u"].as_u64().unwrap_or(0);
                                let previous_u = value["U"].as_u64().unwrap_or(0);

                                if expected_update_id > 0 && previous_u != expected_update_id + 1 {
                                    println!("[OAL-A] Depth Fracture! Expected: {}, Got: {}", expected_update_id + 1, previous_u);
                                    let _ = dep_tx.send(FeedEvent::DepthFractureDetected).await;
                                    // Normally we would pause and resync REST snapshot here.
                                }
                                expected_update_id = current_u;

                                let _ = dep_tx.send(FeedEvent::DiffDepth(value)).await;
                            }
                        }
                    }
                }
                Err(e) => println!("[OAL-A] DiffDepth Connect Error: {:?}", e),
            }
        });
    }
}
