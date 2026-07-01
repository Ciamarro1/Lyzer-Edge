import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { connect, StringCodec } from 'nats';
import { v7 as uuidv7 } from 'uuid'; // Requires 'uuid' package

const PROTO_PATH = '../src-proto/lyzer.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const lyzerProto = grpc.loadPackageDefinition(packageDefinition).lyzer as any;

async function runBoundaryTest0() {
    const intentId = uuidv7();
    const correlationId = uuidv7();
    const causationId = uuidv7();

    console.log('\n======================================================');
    console.log('[TS Log] BOUNDARY TEST 0 INITIATED');
    console.log(`[TS Log] Intent: ${intentId}`);
    console.log(`[TS Log] Correlation: ${correlationId}`);
    console.log(`[TS Log] Causation: ${causationId}`);
    console.log('======================================================\n');

    // 1. Setup gRPC Client
    const client = new lyzerProto.RiskGateway('localhost:50051', grpc.credentials.createInsecure());

    const authorizeRequest = {
        execution_intent_id: intentId,
        correlation_id: correlationId,
        causation_id: causationId,
        intent: {
            execution_intent_id: intentId,
            correlation_id: correlationId,
            causation_id: causationId,
            strategy_id: 'strat-alpha',
            cluster_id: 'cluster-01',
            symbol: 'BTCUSDT',
            side: 'BUY',
            quantity: 1.5,
            order_type: 'MARKET',
            price: 0,
            timestamp_ms: Date.now()
        },
        request_timestamp_ms: Date.now()
    };

    console.log('[TS Log] Sending AuthorizeOrder via gRPC to Rust Risk Gateway...');

    // 2. Call Rust Risk Gateway
    client.Authorize(authorizeRequest, async (error: any, response: any) => {
        if (error) {
            console.error('[TS Log] gRPC Error:', error);
            return;
        }

        console.log('[TS Log] Received RiskDecision from Rust:');
        console.log(`[TS Log] -> Intent: ${response.execution_intent_id}`);
        console.log(`[TS Log] -> Approved: ${response.approved}`);

        // 3. Register to NATS
        try {
            console.log('[TS Log] Connecting to NATS JetStream...');
            const nc = await connect({ servers: 'nats://localhost:4222' });
            const sc = StringCodec();

            const eventPayload = JSON.stringify({
                event_type: 'RiskDecision',
                ...response
            });

            console.log(`[TS Log] Publishing to NATS subject 'risk.approved'...`);
            nc.publish('risk.approved', sc.encode(eventPayload));
            
            console.log('\n======================================================');
            console.log(`[NATS Event Published]`);
            console.log(`Subject: risk.approved`);
            console.log(`Payload: ${eventPayload}`);
            console.log('======================================================\n');
            
            await nc.close();
        } catch (natsError) {
            console.error('[TS Log] NATS Error:', natsError);
        }
    });
}

runBoundaryTest0().catch(console.error);
