use lyzer_oal::acquisition::binance_feed::{BinanceFeed, FeedEvent};
use lyzer_oal::acquisition::event_sequencer::EventSequencer;
use tokio::sync::mpsc;
use std::env;

#[tokio::main]
async fn main() {
    println!("=======================================================");
    println!("[OAL] Release 2.0.0: IGNITION (Live Data Ingestion)");
    println!("=======================================================\n");

    // Phase 1: Single Stream Lock
    let symbol = env::var("OAL_SYMBOL").unwrap_or_else(|_| "BTCUSDT".to_string());
    println!("[OAL] Locked to symbol: {}", symbol);

    // Channel for Event-Time Synchronization
    let (tx, rx) = mpsc::channel::<FeedEvent>(10000);

    // Phase 2: Feed Order
    let feed = BinanceFeed::new(symbol, tx);
    feed.start().await;

    // Start Sequencer & Parquet pipeline
    let mut sequencer = EventSequencer::new(rx);
    
    // Blocking sequencer run
    sequencer.run().await;
}
