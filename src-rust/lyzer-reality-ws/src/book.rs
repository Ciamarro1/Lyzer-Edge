use std::collections::BTreeMap;
use std::cmp::Reverse;

#[derive(Debug, Clone)]
pub struct LocalOrderBook {
    pub symbol: String,
    pub last_update_id: u64,
    // Bids: decrescente de preço (Reverse ordenado pelo preço)
    pub bids: BTreeMap<Reverse<u64>, f64>, 
    // Asks: crescente de preço
    pub asks: BTreeMap<u64, f64>,
}

impl LocalOrderBook {
    pub fn new(symbol: &str) -> Self {
        Self {
            symbol: symbol.to_string(),
            last_update_id: 0,
            bids: BTreeMap::new(),
            asks: BTreeMap::new(),
        }
    }

    // Convert string price (e.g. "60000.50") to a discrete u64 (e.g. ticks of 0.01 = 6000050)
    pub fn parse_price(price_str: &str) -> u64 {
        // Simple mock parser: assume price is f64, multiply by 100 or 10000 based on tick size
        // For simplicity in this mock, we just use f64 parsing and scale by 10000
        if let Ok(p) = price_str.parse::<f64>() {
            return (p * 10000.0) as u64;
        }
        0
    }

    pub fn apply_bids(&mut self, updates: &[[String; 2]]) {
        for update in updates {
            let price = Self::parse_price(&update[0]);
            let qty = update[1].parse::<f64>().unwrap_or(0.0);
            if qty == 0.0 {
                self.bids.remove(&Reverse(price));
            } else {
                self.bids.insert(Reverse(price), qty);
            }
        }
    }

    pub fn apply_asks(&mut self, updates: &[[String; 2]]) {
        for update in updates {
            let price = Self::parse_price(&update[0]);
            let qty = update[1].parse::<f64>().unwrap_or(0.0);
            if qty == 0.0 {
                self.asks.remove(&price);
            } else {
                self.asks.insert(price, qty);
            }
        }
    }
}
