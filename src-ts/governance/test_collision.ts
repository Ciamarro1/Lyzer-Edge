import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

const PROTO_PATH = path.resolve(__dirname, './protos/eca_jurisdiction.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const eca = protoDescriptor.lyzer.governance.eca;

function main() {
    console.log("[Execution Layer] Establishing Empirical Contact with ECA Kernel...");
    
    const client = new eca.EcaAuthority('localhost:50051', grpc.credentials.createInsecure());

    const mutationRequest = {
        proposal_id: "MUT-2026-06-EMPIRICAL",
        mutated_binary: Buffer.from("0xINVALID_LOGIC_INJECTION"),
        previous_state_hash: "0xCURRENT_STABLE_STATE",
        necessity_proof: {
            deficiency_proven: false, // Intentionally false to trigger failure
            counterfactual_superior: false,
            preservation_assured: false,
            teleological_alignment_score: 0.0,
            proof_signature: "NO_SIGNATURE"
        }
    };

    console.log("[Execution Layer] Injecting mutation request MUT-2026-06-EMPIRICAL...");

    client.RequestMutation(mutationRequest, (err: any, response: any) => {
        if (err) {
            console.error("\n[REALITY ATTRITION DETECTED]");
            console.error(`Code: ${err.code}`);
            console.error(`Details: ${err.details}`);
            console.log("\n[Execution Layer] 🟢 SUCCESS: The architecture correctly blocked the invalid mutation.");
            console.log("Check the Rust Kernel logs for the CML/AUR record.");
        } else {
            console.error("\n[FATAL] The mutation was accepted! This implies a catastrophic failure in ECA.");
            console.log(response);
        }
    });
}

main();
