use std::collections::{HashSet, VecDeque};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tonic::{transport::Server, Request, Response, Status};

// Mock lyzer module since we don't have tonic-build generating code in this raw environment yet.
// In a real environment, this would be: tonic::include_proto!("lyzer");
pub mod lyzer {
    tonic::include_proto!("lyzer");
}

use lyzer::risk_gateway_server::{RiskGateway, RiskGatewayServer};
use lyzer::{AuthorizeOrder, RiskDecision};

pub struct LyzerRiskGateway {
    seen_intents_set: Mutex<HashSet<String>>,
    seen_intents_queue: Mutex<VecDeque<String>>,
}

impl Default for LyzerRiskGateway {
    fn default() -> Self {
        Self {
            seen_intents_set: Mutex::new(HashSet::new()),
            seen_intents_queue: Mutex::new(VecDeque::new()),
        }
    }
}

#[tonic::async_trait]
impl RiskGateway for LyzerRiskGateway {
    async fn authorize(
        &self,
        request: Request<AuthorizeOrder>,
    ) -> Result<Response<RiskDecision>, Status> {
        let req = request.into_inner();
        let intent_id = req.execution_intent_id.clone();
        
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        let mut seen_set = self.seen_intents_set.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let mut seen_queue = self.seen_intents_queue.lock().unwrap_or_else(|poisoned| poisoned.into_inner());

        if seen_set.contains(&intent_id) {
            println!("REJECTED Duplicate Intent UUIDv7: {}", intent_id);
            let decision = RiskDecision {
                execution_intent_id: intent_id,
                correlation_id: req.correlation_id,
                causation_id: req.causation_id,
                approved: false,
                rejection_reason: "DUPLICATE_INTENT_REJECTED".to_string(),
                decision_timestamp_ms: now_ms,
            };
            return Ok(Response::new(decision));
        }

        seen_set.insert(intent_id.clone());
        seen_queue.push_back(intent_id.clone());

        // Cap memory to prevent OOM
        if seen_queue.len() > 10_000 {
            if let Some(old_id) = seen_queue.pop_front() {
                seen_set.remove(&old_id);
            }
        }

        println!("Received RequestExecutionIntent UUIDv7: {}", intent_id);

        let decision = RiskDecision {
            execution_intent_id: intent_id,
            correlation_id: req.correlation_id,
            causation_id: req.causation_id,
            approved: true,
            rejection_reason: "".to_string(),
            decision_timestamp_ms: now_ms,
        };

        Ok(Response::new(decision))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "0.0.0.0:50051".parse()?;
    let gateway = LyzerRiskGateway::default();

    println!("Lyzer Risk Gateway (Sprint 0 Skeleton) listening on {}", addr);

    Server::builder()
        .add_service(RiskGatewayServer::new(gateway))
        .serve(addr)
        .await?;

    Ok(())
}
