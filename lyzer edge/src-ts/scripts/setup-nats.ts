import { connect, StringCodec } from 'nats';

/**
 * NATS Foundation - Sprint 0
 * Establishes the core Event Plane namespaces for Lyzer Labs Execution Program.
 * 
 * Allowed namespaces:
 * - market.*
 * - execution.*
 * - risk.*
 * - position.*
 * - ledger.*
 */

const sc = StringCodec();

async function setupNatsFoundation() {
  console.log('Connecting to NATS Server...');
  // Ensure NATS is running on localhost:4222
  const nc = await connect({ servers: 'nats://localhost:4222' });
  const jsm = await nc.jetstreamManager();

  console.log('Establishing NATS JetStream Streams...');

  const streams = [
    { name: 'market_stream', subjects: ['market.*'] },
    { name: 'execution_stream', subjects: ['execution.*'] },
    { name: 'risk_stream', subjects: ['risk.*'] },
    { name: 'position_stream', subjects: ['position.*'] },
    { name: 'ledger_stream', subjects: ['ledger.*'] },
    { name: 'audit_stream', subjects: ['audit.*'] }
  ];

  for (const streamConfig of streams) {
    try {
      await jsm.streams.add(streamConfig);
      console.log(`Stream ${streamConfig.name} created for subjects: ${streamConfig.subjects.join(', ')}`);
    } catch (err: any) {
      if (err.message.includes('stream name already in use')) {
        console.log(`Stream ${streamConfig.name} already exists. Updating subjects...`);
        await jsm.streams.update(streamConfig.name, streamConfig);
      } else {
        console.error(`Failed to create stream ${streamConfig.name}:`, err);
      }
    }
  }

  console.log('NATS Foundation established successfully. No other namespaces allowed.');
  await nc.close();
}

setupNatsFoundation().catch(console.error);
