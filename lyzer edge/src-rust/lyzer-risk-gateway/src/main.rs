use std::collections::HashSet;
use std::sync::Mutex;
use tonic::{transport::Server, Request, Response, Status};

// Mock lyzer module since we don't have tonic-build generating code in this raw environment yet.
// In a real environment, this would be: tonic::include_proto!("lyzer");
pub mod lyzer {
    tonic::include_proto!("lyzer");
}

use lyzer::risk_gateway_server::{RiskGateway, RiskGatewayServer};
use lyzer::{AuthorizeOrder, RiskDecision};

pub struct LyzerRiskGateway {
    seen_intents: Mutex<HashSet<String>>,
}

impl Default for LyzerRiskGateway {
    fn default() -> Self {
        Self {
            seen_intents: Mutex::new(HashSet::new()),
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
        
        let mut seen = self.seen_intents.lock().unwrap();

        if seen.contains(&intent_id) {
            println!("REJECTED Duplicate Intent UUIDv7: {}", intent_id);
            let decision = RiskDecision {
                execution_intent_id: intent_id,
                correlation_id: req.correlation_id,
                causation_id: req.causation_id,
                approved: false,
                rejection_reason: "DUPLICATE_INTENT_REJECTED".to_string(),
                decision_timestamp_ms: 1718000000000,
            };
            return Ok(Response::new(decision));
        }

        seen.insert(intent_id.clone());
        println!("Received RequestExecutionIntent UUIDv7: {}", intent_id);

        let decision = RiskDecision {
            execution_intent_id: intent_id,
            correlation_id: req.correlation_id,
            causation_id: req.causation_id,
            approved: true,
            rejection_reason: "".to_string(),
            decision_timestamp_ms: 1718000000000, // mock timestamp
        };

        Ok(Response::new(decision))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::1]:50051".parse()?;
    let gateway = LyzerRiskGateway::default();

    println!("Lyzer Risk Gateway (Sprint 0 Skeleton) listening on {}", addr);

    Server::builder()
        .add_service(RiskGatewayServer::new(gateway))
        .serve(addr)
        .await?;

    Ok(())
}
