import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { recordRiskGatewayLatency } from '../src/observability/index.js';
import { recordSystemError } from '../src/observability/index.js';

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
  recordSystemError('RiskGatewayClient', 'PROTO_LOAD_ERROR');
  console.warn('⚠️ [gRPC Client] Failed to load RiskGateway proto: ' + err.message);
}

export function authorizeOrder(intent) {
  return new Promise((resolve) => {
    if (process.env.ARL_MODE === 'SIMULATION') {
      return resolve({ approved: true, rejection_reason: '' });
    }
    
    if (!client || !isConnected) {
      console.error('🛑 [gRPC Client] RiskGateway offline. FAIL-CLOSED enforcement active.');
      return resolve({ approved: false, rejection_reason: 'RISK_GATEWAY_UNAVAILABLE' });
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

    const startTime = performance.now();
    client.Authorize(authorizeRequest, (error, response) => {
      const durationSec = (performance.now() - startTime) / 1000;
      if (error) {
        recordRiskGatewayLatency('AuthorizeOrder', 'error', durationSec);
        console.error('🛑 [gRPC Client] Authorize call failed: ' + error.message + '. FAIL-CLOSED enforcement active.');
        return resolve({ approved: false, rejection_reason: `RISK_GATEWAY_ERROR: ${error.message}` });
      }
      recordRiskGatewayLatency('AuthorizeOrder', 'success', durationSec);
      console.log(`[gRPC Client] RiskDecision received: approved=${response.approved}, reason="${response.rejection_reason}"`);
      resolve(response);
    });
  });
}
