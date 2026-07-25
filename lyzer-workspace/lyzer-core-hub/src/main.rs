use std::net::{TcpListener, TcpStream};
use std::io::{Read, Write};
use lyzer_core_models::*;
use lyzer_core_arbitration::{Arbitrator, ArbitrationOutcome};
use lyzer_core_memory::ConstitutionalMemory;
use lyzer_core_governance::TruthAssessmentEngine;

fn handle_client(mut stream: TcpStream) -> Option<InterpretationRecord> {
    let mut buffer = [0; 8192];
    if let Ok(bytes_read) = stream.read(&mut buffer) {
        let request = String::from_utf8_lossy(&buffer[..bytes_read]);
        if let Some(body_start) = request.find("\r\n\r\n") {
            let body = &request[body_start + 4..];
            let body = body.trim_end_matches(char::from(0)).trim();
            if let Ok(record) = serde_json::from_str::<InterpretationRecord>(body) {
                if record.justification.trim().len() < 10 {
                    let response = "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\n\r\n{\"error\":\"REJECTED: Decision Trace Pipeline requires explicit justification (>10 chars).\"}";
                    stream.write_all(response.as_bytes()).ok();
                    println!("[HUB] REJECTED Payload: Missing or insufficient justification.");
                    return None;
                }
                
                let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"received\"}";
                stream.write_all(response.as_bytes()).ok();
                return Some(record);
            } else {
                println!("[HUB] Failed to parse JSON body: {}", body);
            }
        }
    }
    let response = "HTTP/1.1 400 Bad Request\r\n\r\n";
    stream.write_all(response.as_bytes()).ok();
    None
}

fn main() {
    println!("--- LYZER LABS: INSTITUTIONAL COGNITION FRAMEWORK ---");
    println!("Starting IPC Hub on 127.0.0.1:8080...");
    let listener = TcpListener::bind("127.0.0.1:8080").unwrap();
    
    let mut cer = ConstitutionalMemory::new();
    let mut buffer = Vec::new();
    let mut collision_count = 0;

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                if let Some(interp) = handle_client(stream) {
                    println!("[HUB] Received Interpretation from: {:?}", interp.observer);
                    buffer.push(interp);

                    // Arbitrate when we have at least 2 competing records
                    if buffer.len() >= 2 {
                        collision_count += 1;
                        let meaning_id = format!("MEANING-REAL-{}", collision_count);
                        println!("\n[PHASE 1] Arbitrating Real Collision {}...", meaning_id);
                        
                        let payload = std::mem::take(&mut buffer); // Clear buffer
                        let outcome = Arbitrator::arbitrate(meaning_id, payload);

                        match outcome {
                            ArbitrationOutcome::Authorized(auth, rejs) => {
                                println!("RESULT: AUTHORIZED");
                                println!("  Winner: {:?}", auth.interpretation.observer);
                                println!("  Legitimacy Score: {:.2}", auth.legitimacy_score);
                                cer.insert_authorized(auth.clone());
                                for r in rejs { cer.insert_rejected(r); }

                                // EMPIRICAL VALIDATION: Wait for real data outcome
                                println!("\n[PHASE 2] Fetching Reality (Empirical)...");
                                
                                // Simulating the reception of empirical reality payload
                                let empirical_observed = "Price closed lower against V1 hypothesis".to_string();
                                let prediction_error = 0.85; // Massive empirical error

                                let surprise = SurpriseRecord {
                                    meaning_id: auth.meaning_id.clone(),
                                    expected_outcome: auth.interpretation.interpretation.clone(),
                                    observed_outcome: empirical_observed.clone(),
                                    prediction_error,
                                    surprise_score: prediction_error * auth.legitimacy_score, // The higher the legitimacy, the harder the surprise
                                };

                                println!("  [SURPRISE RECORDED] Expected: {}, Observed: {}", surprise.expected_outcome, surprise.observed_outcome);
                                println!("  Prediction Error: {:.2}, Surprise Score: {:.2}", surprise.prediction_error, surprise.surprise_score);

                                let assessment = TruthAssessmentEngine::assess_truth(&auth, empirical_observed, prediction_error);
                                
                                println!("  Truth Score: {:.2}", assessment.truth_score);
                                println!("  Legitimacy-Truth Delta: {:.2}", assessment.divergence_score);

                                let mut triggered_adaptation = None;
                                if let Some(adaptation) = TruthAssessmentEngine::evaluate_drift(&assessment) {
                                    println!("  [ADAPTATION TRIGGERED] {}", adaptation.trigger_reason);
                                    triggered_adaptation = Some(adaptation);
                                }

                                // Extract action from interpretation
                                let action = if auth.interpretation.interpretation.contains("+") || auth.interpretation.interpretation.to_uppercase().contains("BUY") {
                                    "BUY"
                                } else {
                                    "SELL"
                                };

                                // Print JSON artifact to stdout so we can capture it
                                let artifact = serde_json::json!({
                                    "epoch": "Empirical Observation",
                                    "meaning": auth,
                                    "surprise": surprise,
                                    "truth": assessment,
                                    "adaptation": triggered_adaptation,
                                    "execution": {
                                        "action": action,
                                        "symbol": "BTCUSDT",
                                        "quantity": 0.001
                                    }
                                });
                                println!("\n--- BEGIN ARTIFACT JSON ---\n{}\n--- END ARTIFACT JSON ---\n", serde_json::to_string_pretty(&artifact).unwrap());

                                // The system will now continue looping, capturing the next set of events continuously.
                            },
                            ArbitrationOutcome::Contested(cont, rejs) => {
                                println!("RESULT: CONTESTED. Tie between {} observers.", cont.tied_interpretations.len());
                                cer.insert_contested(cont);
                                for r in rejs { cer.insert_rejected(r); }
                            },
                            ArbitrationOutcome::RejectedAll(rejs) => {
                                println!("RESULT: REJECTED ALL.");
                                for r in rejs { cer.insert_rejected(r); }
                            },
                            ArbitrationOutcome::EvidenceRequest(req) => {
                                println!("RESULT: EVIDENCE REQUEST: {}", req);
                            }
                        }
                        println!("--------------------------------------------------");
                    }
                }
            }
            Err(e) => {
                println!("Connection failed: {}", e);
            }
        }
    }
}
