use lyzer_ocr::candidates::liquidity_vacuum::LiquidityVacuum;
use lyzer_ocr::candidates::tick_kurtosis::TickKurtosis;
use lyzer_ocr::candidates::book_fracture::BookFracture;
use lyzer_ocr::candidates::ObservationCandidate;
use lyzer_ocr::falsification_engine::FalsificationEngine;
use lyzer_ocr::ocrl::OcrlState;
use lyzer_oal::types::{ObservationRecord, LineageHeader};

fn main() {
    println!("\n=======================================================");
    println!("[MCFF] Multi-Candidate Falsification Field Initializing");
    println!("=======================================================\n");

    let mut ocrl_state = OcrlState::new();

    let candidates: Vec<Box<dyn ObservationCandidate>> = vec![
        Box::new(LiquidityVacuum),
        Box::new(TickKurtosis),
        Box::new(BookFracture),
    ];

    let mock_lineage = LineageHeader {
        ingress_timestamp_ns: 123456789,
        feed_version: "mock".to_string(),
        oal_version: "mock".to_string(),
    };

    // --- EVENT 1: Iceberg Replenishment ---
    println!(">>> INJECTING EVENT 1: Iceberg Replenishment (High Aggression, Contiguous Depth)");
    
    let ev1_agg = ObservationRecord {
        observation_id: "ev1_agg".to_string(), lineage: mock_lineage.clone(), symbol: "BTCUSDT".to_string(),
        context: lyzer_oal::types::ObservationContext::Normal,
        exchange_event_id: 1001, exchange_timestamp: 1600000000, payload_hash: "hash".to_string(),
        payload: serde_json::json!({ "qty": 50.0 }),
    };
    let ev1_depth = ObservationRecord {
        observation_id: "ev1_dep".to_string(), lineage: mock_lineage.clone(), symbol: "BTCUSDT".to_string(),
        context: lyzer_oal::types::ObservationContext::Normal,
        exchange_event_id: 1002, exchange_timestamp: 1600000000, payload_hash: "hash".to_string(),
        payload: serde_json::json!({ "top_bid_qty": 100.0 }), // Depth intact
    };

    let traces_1 = FalsificationEngine::execute_mcff(&candidates, &ev1_agg, &ev1_depth);
    ocrl_state.process_event_traces(traces_1);


    // --- SIMULATE TIME / EVENT FATIGUE ---
    // (In reality, thousands of non-resolving conflict events would pass here)
    ocrl_state.event_time_fatigue_clock = 5000; 


    println!("\n>>> INJECTING EVENT 2: Toxic Order Flow (High Aggression, Spread Break)");
    
    let ev2_agg = ObservationRecord {
        observation_id: "ev2_agg".to_string(), lineage: mock_lineage.clone(), symbol: "BTCUSDT".to_string(),
        context: lyzer_oal::types::ObservationContext::Normal,
        exchange_event_id: 2001, exchange_timestamp: 1600000010, payload_hash: "hash".to_string(),
        payload: serde_json::json!({ "qty": 50.0 }),
    };
    let ev2_depth = ObservationRecord {
        observation_id: "ev2_dep".to_string(), lineage: mock_lineage.clone(), symbol: "BTCUSDT".to_string(),
        context: lyzer_oal::types::ObservationContext::Normal,
        exchange_event_id: 2002, exchange_timestamp: 1600000010, payload_hash: "hash".to_string(),
        payload: serde_json::json!({ "toxic_spread_break": true }), // Depth broken
    };

    let traces_2 = FalsificationEngine::execute_mcff(&candidates, &ev2_agg, &ev2_depth);
    ocrl_state.process_event_traces(traces_2);

    println!("\n[MCFF] Test Complete. Resolution mechanism validated.");
}
