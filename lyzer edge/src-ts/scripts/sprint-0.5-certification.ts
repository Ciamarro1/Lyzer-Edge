import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { v7 as uuidv7 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.join(__dirname, '../../src-proto/lyzer.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const lyzerProto = grpc.loadPackageDefinition(packageDefinition).lyzer as any;
const IntentRegistry = lyzerProto.IntentRegistry;
const RiskGateway = lyzerProto.RiskGateway;

const registryClient = new IntentRegistry('localhost:50052', grpc.credentials.createInsecure());
const riskClient = new RiskGateway('localhost:50051', grpc.credentials.createInsecure());

function registerIntent(intent: any): Promise<any> {
    return new Promise((resolve, reject) => {
        registryClient.RegisterIntent({ intent }, (err: any, response: any) => {
            if (err) reject(err);
            else resolve(response);
        });
    });
}

function appendEvent(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
        registryClient.AppendIntentEvent(req, (err: any, response: any) => {
            if (err) reject(err);
            else resolve(response);
        });
    });
}

function auditQuery(intentId: string): Promise<any> {
    return new Promise((resolve, reject) => {
        registryClient.AuditQuery({ execution_intent_id: intentId }, (err: any, response: any) => {
            if (err) reject(err);
            else resolve(response);
        });
    });
}

function authorizeRisk(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
        riskClient.Authorize(req, (err: any, response: any) => {
            if (err) reject(err);
            else resolve(response);
        });
    });
}

async function runTest() {
    console.log("=== SPRINT 0.5.1 CERTIFICATION SUITE ===");

    const intentId = uuidv7();
    const correlationId = uuidv7();
    const causationId = uuidv7();

    const intent = {
        execution_intent_id: intentId,
        correlation_id: correlationId,
        causation_id: causationId,
        action: "BUY",
        symbol: "BTC/USD",
        quantity: 1.5,
        price_limit: 65000.0,
        timestamp_ms: Date.now()
    };

    console.log(`\n[1] Registering Intent: ${intentId}`);
    const regRes = await registerIntent(intent);
    console.log(`    Result: Status=${regRes.status}, Version=${regRes.version}`);

    console.log(`\n[2] Authorizing Risk for Intent: ${intentId}`);
    const authReq = {
        execution_intent_id: intentId,
        correlation_id: correlationId,
        causation_id: intentId, // causation is the intent itself
        intent: intent
    };
    const riskRes = await authorizeRisk(authReq);
    console.log(`    Result: Approved=${riskRes.approved}`);

    const newStatus = riskRes.approved ? "RISK_APPROVED" : "RISK_REJECTED";

    console.log(`\n[3] Appending Event: ${newStatus}`);
    const appendReq = {
        execution_intent_id: intentId,
        correlation_id: correlationId,
        causation_id: riskRes.decision_id || uuidv7(),
        event_type: newStatus,
        payload_json: JSON.stringify(riskRes)
    };
    const appRes = await appendEvent(appendReq);
    console.log(`    Result: New Version=${appRes.new_version}`);

    console.log(`\n[4] Running Audit Query for Intent: ${intentId}`);
    const auditRes = await auditQuery(intentId);
    console.log(`    Found ${auditRes.events.length} events in lineage:`);
    
    auditRes.events.forEach((evt: any) => {
        console.log(`      v${evt.version}: [${evt.event_type}] causation_id=${evt.causation_id}`);
    });

    if (auditRes.events.length === 2 && 
        auditRes.events[0].event_type === "CREATED" && 
        auditRes.events[1].event_type === "RISK_APPROVED") {
        console.log("\n✅ SPRINT 0.5.1 CERTIFICATION PASSED: Intent Registry is the absolute authority.");
    } else {
        console.error("\n❌ CERTIFICATION FAILED: Lineage mismatch.");
        process.exit(1);
    }
}

runTest().catch(console.error);
