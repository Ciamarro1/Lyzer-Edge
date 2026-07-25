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
const IntentRegistry = lyzerProto.IntentRegistry;

const registryClient = new IntentRegistry('localhost:50052', grpc.credentials.createInsecure());

function registerIntent(intent: any): Promise<any> {
    return new Promise((resolve, reject) => {
        registryClient.RegisterIntent({ intent }, (err: any, response: any) => {
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

async function runCCPTest() {
    console.log("=== SPRINT 0.6 CERTIFICATION SUITE (CCP + Outbox + Version Lock + Schema Registry) ===");

    const nc = await connect({ servers: 'nats://localhost:4222' });
    const sc = StringCodec();

    const intentId = uuidv7();
    const correlationId = uuidv7();
    const causationId = uuidv7();

    const intent = {
        execution_intent_id: intentId,
        correlation_id: correlationId,
        causation_id: causationId,
        strategy_id: 'strat-ccp',
        cluster_id: 'cluster-ccp',
        symbol: 'BTC/USD',
        side: 'BUY',
        quantity: 1.5,
        order_type: 'MARKET',
        price: 0,
        timestamp_ms: Date.now()
    };

    console.log(`\n[1] Registering Intent (gRPC)`);
    const regRes = await registerIntent(intent);
    console.log(`    Status: ${regRes.status}, Version: ${regRes.version}`);

    // Wait for the OUTBOX to publish 'execution.committed.created'
    let subCreated = nc.subscribe('execution.committed.created');
    let msgCreated = await (async () => {
        for await (const m of subCreated) return sc.decode(m.data);
    })();
    console.log(`    ✅ OUTBOX Published: execution.committed.created`);

    console.log(`\n[2] Emitting execution.pending.order_ack via NATS`);
    const pendingEvent = {
        execution_intent_id: intentId,
        correlation_id: correlationId,
        causation_id: causationId,
        event_type: 'ORDER_ACK',
        event_schema_version: 1, // Valid schema
        expected_version: 2,     // Valid next version
        payload_json: JSON.stringify({ note: "Order Acked by Exchange" })
    };

    let subCommittedAck = nc.subscribe('execution.committed.order_ack');
    nc.publish('execution.pending.order_ack', sc.encode(JSON.stringify(pendingEvent)));

    let msgAck = await (async () => {
        for await (const m of subCommittedAck) return sc.decode(m.data);
    })();
    console.log(`    ✅ OUTBOX Published: execution.committed.order_ack`);

    console.log(`\n[3] Testing CAUSAL_VERSION_LOCK (VERSION RACE)`);
    const conflictEvent = {
        execution_intent_id: intentId,
        correlation_id: correlationId,
        causation_id: causationId,
        event_type: 'ORDER_FILLED',
        event_schema_version: 1, // Valid schema
        expected_version: 2,     // INVALID! We are at v2 now, so expected_version should be 3
        payload_json: JSON.stringify({ note: "Fake fill" })
    };

    let subRejectedVersion = nc.subscribe('execution.rejected.version_conflict');
    nc.publish('execution.pending.order_filled', sc.encode(JSON.stringify(conflictEvent)));

    let msgRejV = await (async () => {
        for await (const m of subRejectedVersion) return sc.decode(m.data);
    })();
    console.log(`    ✅ NATS Rejected: execution.rejected.version_conflict`);

    console.log(`\n[4] Testing EVENT_SCHEMA_DRIFT (Schema Validation)`);
    const invalidSchemaEvent = {
        execution_intent_id: intentId,
        correlation_id: correlationId,
        causation_id: causationId,
        event_type: 'ORDER_FILLED',
        event_schema_version: 7, // INVALID SCHEMA! We only know v1
        expected_version: 3,     // Valid version
        payload_json: JSON.stringify({ note: "Schema drift fill" })
    };

    let subRejectedSchema = nc.subscribe('execution.rejected.schema_conflict');
    nc.publish('execution.pending.order_filled', sc.encode(JSON.stringify(invalidSchemaEvent)));

    let msgRejS = await (async () => {
        for await (const m of subRejectedSchema) return sc.decode(m.data);
    })();
    console.log(`    ✅ NATS Rejected: execution.rejected.schema_conflict`);

    console.log(`\n[5] Final Audit Query`);
    const auditRes = await auditQuery(intentId);
    console.log(`    Lineage Length: ${auditRes.events.length}`);
    for (const evt of auditRes.events) {
        console.log(`      v${evt.version}: [${evt.event_type}] schema_v=${evt.event_schema_version}`);
    }

    if (auditRes.events.length === 2 && auditRes.events[1].event_type === 'ORDER_ACK') {
        console.log(`\n✅ SPRINT 0.6 CERTIFICATION PASSED: CCP, Outbox, Version Lock, and Schema Registry are functional.`);
    } else {
        console.error(`\n❌ SPRINT 0.6 CERTIFICATION FAILED! State was tainted.`);
    }

    await nc.close();
}

runCCPTest().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
