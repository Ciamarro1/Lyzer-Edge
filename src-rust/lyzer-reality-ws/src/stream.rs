use futures_util::{StreamExt, SinkExt};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use url::Url;
use crate::models::{DepthUpdateEvent, AggTradeEvent};
use crate::book::LocalOrderBook;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct RealityListener {
    pub order_book: Arc<RwLock<LocalOrderBook>>,
    ws_url: String,
}

impl RealityListener {
    pub fn new(symbol: &str) -> Self {
        // e.g. "wss://fstream.binance.com/ws/btcusdt@depth/@100ms"
        let ws_url = format!("wss://fstream.binance.com/ws/{}@depth", symbol.to_lowercase());
        Self {
            order_book: Arc::new(RwLock::new(LocalOrderBook::new(symbol))),
            ws_url,
        }
    }

    pub async fn start_listening(&self) {
        let url = Url::parse(&self.ws_url).expect("Invalid WS URL");
        println!("Connecting to Reality Stream at {}", self.ws_url);

        let (ws_stream, _) = connect_async(url).await.expect("Failed to connect to WS");
        println!("WebSocket Handshake completed");

        let (_, mut read) = ws_stream.split();

        while let Some(message) = read.next().await {
            match message {
                Ok(Message::Text(text)) => {
                    if let Ok(depth_event) = serde_json::from_str::<DepthUpdateEvent>(&text) {
                        let mut book = self.order_book.write().await;
                        book.apply_bids(&depth_event.bids);
                        book.apply_asks(&depth_event.asks);
                        book.last_update_id = depth_event.final_update_id;
                        // Here we would sync with MAR-I (mmap sequence lock)
                    } else if let Ok(_agg_trade) = serde_json::from_str::<AggTradeEvent>(&text) {
                        // Handle AggTrade
                    }
                }
                Ok(Message::Ping(_)) => {
                    // Tungstenite handles ping/pong automatically if configured, 
                    // but we can log it
                }
                Err(e) => {
                    eprintln!("WS Error: {}", e);
                    break;
                }
                _ => {}
            }
        }
    }
}
