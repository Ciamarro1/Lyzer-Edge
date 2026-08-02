import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, '../src-proto/lyzer.proto');

let client = null;
let isConnected = false;

try {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  const lyzerProto = grpc.loadPackageDefinition(packageDefinition).lyzer;
  // Rust RiskGateway server runs on localhost:50051
  client = new lyzerProto.RiskGateway('localhost:50051', grpc.credentials.createInsecure());
  isConnected = true;
  console.log('🔌 [gRPC Client] RiskGateway loaded and pointing to localhost:50051');
} catch (err) {
  console.warn('⚠️ [gRPC Client] Failed to load RiskGateway proto: ' + err.message);
}

export function authorizeOrder(intent) {
  return new Promise((resolve) => {
    if (!client || !isConnected) {
      // Offline fallback: log warning and approve (resilient baseline)
      console.warn('⚠️ [gRPC Client] RiskGateway offline. Fallback to local approval.');
      return resolve({ approved: true, rejection_reason: '' });
    }

    const authorizeRequest = {
      execution_intent_id: intent.execution_intent_id,
      correlation_id: intent.correlation_id,
      causation_id: intent.causation_id,
      intent: {
        execution_intent_id: intent.execution_intent_id,
        correlation_id: intent.correlation_id,
        causation_id: intent.causation_id,
        strategy_id: intent.strategy_id || 'strat-alpha',
        cluster_id: intent.cluster_id || 'cluster-01',
        symbol: intent.symbol,
        side: intent.side,
        quantity: intent.quantity,
        order_type: intent.order_type || 'MARKET',
        price: intent.price || 0,
        timestamp_ms: Date.now()
      },
      request_timestamp_ms: Date.now()
    };

    client.Authorize(authorizeRequest, (error, response) => {
      if (error) {
        console.warn('⚠️ [gRPC Client] Authorize call failed: ' + error.message + '. Fallback to local approval.');
        return resolve({ approved: true, rejection_reason: '' });
      }
      console.log(`[gRPC Client] RiskDecision received: approved=${response.approved}, reason="${response.rejection_reason}"`);
      resolve(response);
    });
  });
}
