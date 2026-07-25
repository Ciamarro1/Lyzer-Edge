use lyzer_ocr::candidates::liquidity_vacuum::LiquidityVacuum;
use lyzer_ocr::falsification_engine::FalsificationEngine;
use lyzer_oal::types::{ObservationRecord, LineageHeader};

fn main() {
    println!("[OCR] Starting Single Candidate Stress Test (Shadow Mode)...\n");

    // 1. Mocking the Observation Archive (OA) historical slice
    let mock_lineage = LineageHeader {
        ingress_timestamp_ns: 123456789,
        feed_version: "mock".to_string(),
        oal_version: "mock".to_string(),
    };

    let agg_trade = ObservationRecord {
        observation_id: "obs_agg_01".to_string(),
        lineage: mock_lineage.clone(),
        symbol: "BTCUSDT".to_string(),
        context: lyzer_oal::types::ObservationContext::Normal,
        exchange_event_id: 1001,
        exchange_timestamp: 1600000000,
        payload_hash: "hash_a".to_string(),
        payload: serde_json::json!({ "qty": 50.0 }),
    };

    let diff_depth = ObservationRecord {
        observation_id: "obs_depth_01".to_string(),
        lineage: mock_lineage,
        symbol: "BTCUSDT".to_string(),
        context: lyzer_oal::types::ObservationContext::Normal,
        exchange_event_id: 1002,
        exchange_timestamp: 1600000000, // Same event-time
        payload_hash: "hash_b".to_string(),
        payload: serde_json::json!({ "top_bid_qty": 100.0 }), // Liquidity was NOT depleted
    };

    // 2. Initialize Candidate
    let candidate = LiquidityVacuum;

    // 3. Run Falsification Engine
    let trace = FalsificationEngine::run_shadow_test(&candidate, &agg_trade, &diff_depth);

    // 4. Output the strictly controlled Falsification Trace
    println!("=== FALSIFICATION TRACE ===");
    println!("Candidate ID: {}", trace.candidate_id);
    println!("Event Time:   {}", trace.event_timestamp);
    println!("OCM Posture:  {:?}", trace.posture);
    println!("Survived:     {}", trace.survived);
    
    if let Some(reason) = trace.failure_mode {
        println!("Failure Mode: {}", reason);
    }
    
    println!("===========================");
    println!("\n[OCR] Test Complete. No Evidence was written. System learned nothing, failed perfectly.");
}
