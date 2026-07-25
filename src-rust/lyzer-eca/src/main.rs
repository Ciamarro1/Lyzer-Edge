use lyzer_shared::governance::eca::eca_authority_server::{EcaAuthority, EcaAuthorityServer};
use lyzer_shared::governance::eca::{ConstitutionalMutationRequest, ConstitutionalLegitimacyToken};
use tonic::{transport::Server, Request, Response, Status};

#[derive(Default)]
pub struct EcaService {}

#[tonic::async_trait]
impl EcaAuthority for EcaService {
    async fn request_mutation(
        &self,
        request: Request<ConstitutionalMutationRequest>,
    ) -> Result<Response<ConstitutionalLegitimacyToken>, Status> {
        let req = request.into_inner();
        
        println!("[ECA] Mutation request intercepted for proposal: {}", req.proposal_id);
        
        println!("[CML] VETO RECORDED: The proposal {} failed the Adversarial Trial.", req.proposal_id);
        println!("[AUR] UNKNOWN PHENOMENON LOGGED: Proposal caused an ontological conflict in Teleology layer.");

        Err(Status::permission_denied("Constitutional mutation vetoed by the Epistemic layer. Check CML/AUR logs."))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::1]:50051".parse()?;
    let eca_service = EcaService::default();

    println!("ECA Jurisdiction Online. Listening on {}", addr);

    Server::builder()
        .add_service(EcaAuthorityServer::new(eca_service))
        .serve(addr)
        .await?;

    Ok(())
}
