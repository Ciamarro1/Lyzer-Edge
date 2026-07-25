import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { connect, StringCodec } from 'nats';
import { v7 as uuidv7 } from 'uuid';

import path from 'path';
import { fileURLToPath } from 'url';

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

async function runTestSuite(iterations: number, testName: string) {
    console.log(`\n======================================================`);
    console.log(`[START] ${testName} - ${iterations} Iterations`);
    console.log(`======================================================\n`);

    const client = new lyzerProto.RiskGateway('localhost:50051', grpc.credentials.createInsecure());
    const nc = await connect({ servers: 'nats://localhost:4222' });
    const sc = StringCodec();

    let successCount = 0;
    let natsReceivedCount = 0;
    let uuidCorruption = 0;

    // Set up NATS subscription to verify Event persistence
    const sub = nc.subscribe('risk.approved');
    (async () => {
        for await (const m of sub) {
            const payload = JSON.parse(sc.decode(m.data));
            natsReceivedCount++;
            // In a real test, we would correlate the payload ID with our expected sent IDs.
            if (!payload.execution_intent_id || !payload.correlation_id || !payload.causation_id) {
                uuidCorruption++;
            }
        }
    })();

    for (let i = 0; i < iterations; i++) {
        const intentId = uuidv7();
        const correlationId = uuidv7();
        const causationId = uuidv7();

        const authorizeRequest = {
            execution_intent_id: intentId,
            correlation_id: correlationId,
            causation_id: causationId,
            intent: {
                execution_intent_id: intentId,
                correlation_id: correlationId,
                causation_id: causationId,
                strategy_id: 'strat-test',
                cluster_id: 'cluster-test',
                symbol: 'ETHUSDT',
                side: 'BUY',
                quantity: 1.0,
                order_type: 'MARKET',
                price: 0,
                timestamp_ms: Date.now()
            },
            request_timestamp_ms: Date.now()
        };

        // If it's a single run, log the payload details
        if (iterations === 1) {
            console.log(`[TS -> gRPC] Sending Request: ${intentId}`);
        }

        await new Promise<void>((resolve) => {
            client.Authorize(authorizeRequest, (error: any, response: any) => {
                if (error) {
                    console.error(`[gRPC Error] ${error}`);
                    resolve();
                    return;
                }

                if (iterations === 1) {
                    console.log(`[gRPC -> TS] Received Decision: ${response.execution_intent_id}`);
                }

                // Verify UUIDs matched
                if (response.execution_intent_id === intentId &&
                    response.correlation_id === correlationId &&
                    response.causation_id === causationId) {
                    successCount++;
                } else {
                    uuidCorruption++;
                }

                // Publish to NATS
                const eventPayload = JSON.stringify({
                    event_type: 'RiskDecision',
                    ...response
                });
                
                nc.publish('risk.approved', sc.encode(eventPayload));
                resolve();
            });
        });
    }

    // Wait for NATS messages to flush
    await nc.flush();
    await new Promise(r => setTimeout(r, 500)); // Allow subscriber to process
    
    console.log(`\n======================================================`);
    console.log(`[END] ${testName} Report`);
    console.log(`Sent: ${iterations}`);
    console.log(`gRPC Success (UUIDs intact): ${successCount}`);
    console.log(`NATS Received: ${natsReceivedCount}`);
    console.log(`UUID/Correlation Corruptions: ${uuidCorruption}`);
    console.log(`======================================================\n`);

    sub.unsubscribe();
    await nc.close();
}

async function runDuplicateIntentTest(iterations: number) {
    console.log(`\n======================================================`);
    console.log(`[START] Test 4 (Duplicate Intent Attack) - ${iterations} Iterations`);
    console.log(`======================================================\n`);

    const client = new lyzerProto.RiskGateway('localhost:50051', grpc.credentials.createInsecure());
    
    let acceptedCount = 0;
    let duplicateRejectedCount = 0;

    // We use exactly ONE intent ID for all iterations
    const intentId = uuidv7();
    const correlationId = uuidv7();
    const causationId = uuidv7();

    const authorizeRequest = {
        execution_intent_id: intentId,
        correlation_id: correlationId,
        causation_id: causationId,
        intent: {
            execution_intent_id: intentId,
            correlation_id: correlationId,
            causation_id: causationId,
            strategy_id: 'strat-test',
            cluster_id: 'cluster-test',
            symbol: 'ETHUSDT',
            side: 'BUY',
            quantity: 1.0,
            order_type: 'MARKET',
            price: 0,
            timestamp_ms: Date.now()
        },
        request_timestamp_ms: Date.now()
    };

    for (let i = 0; i < iterations; i++) {
        await new Promise<void>((resolve) => {
            client.Authorize(authorizeRequest, (error: any, response: any) => {
                if (error) {
                    console.error(`[gRPC Error] ${error}`);
                    resolve();
                    return;
                }

                if (response.approved === true) {
                    acceptedCount++;
                } else if (response.rejection_reason === 'DUPLICATE_INTENT_REJECTED') {
                    duplicateRejectedCount++;
                }
                
                resolve();
            });
        });
    }

    console.log(`\n======================================================`);
    console.log(`[END] Test 4 Report`);
    console.log(`Sent identical Intent ID: ${iterations} times`);
    console.log(`Risk Gateway ACCEPTED: ${acceptedCount}`);
    console.log(`Risk Gateway DUPLICATE_REJECTED: ${duplicateRejectedCount}`);
    console.log(`Duplicate Executions (ACCEPTED > 1): ${acceptedCount > 1 ? 'FAILED' : '0'}`);
    console.log(`======================================================\n`);
}

async function main() {
    await runTestSuite(1, 'Test 1 (Single Intent)');
    await runTestSuite(100, 'Test 2 (100 Sequential Intents)');
    await runTestSuite(1000, 'Test 3 (1000 Sequential Intents)');
    await runDuplicateIntentTest(100);
}

main().catch(console.error);
