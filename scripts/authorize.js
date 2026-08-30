#!/usr/bin/env node
/**
 * LYZER EDGE — Capital Authorization Ceremony (Ed25519)
 *
 * USO:
 *   node scripts/authorize.js generate-keys       → Gera par de chaves Ed25519
 *   node scripts/authorize.js sign                → Assina payload de autorização
 *
 * FLUXO:
 *   1. Rode "generate-keys" UMA VEZ → salva private_key.pem e public_key.pem
 *   2. Rode "sign" com os parâmetros desejados → gera CAPITAL_AUTHORIZATION_SIGNATURE
 *   3. Coloque no Railway:
 *      GOVERNANCE_PUBLIC_KEY = conteúdo de public_key.pem (em uma linha, sem quebras)
 *      CAPITAL_AUTHORIZATION_SIGNATURE = output do "sign"
 *
 * SEGURANÇA:
 *   - private_key.pem NUNCA vai para o Git nem para o Railway
 *   - public_key.pem pode ser pública (só valida, não assina)
 *   - Guarde private_key.pem em local seguro (offline se possível)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_DIR = path.join(__dirname, '..', '.keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private_key.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public_key.pem');

const command = process.argv[2];

// ─── GENERATE KEYS ────────────────────────────────────────────────────────────
if (command === 'generate-keys') {
  console.log('\n🔑 LYZER EDGE — Gerando par de chaves Ed25519...\n');

  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('❌ Chaves já existem em .keys/. Delete manualmente para regenerar.');
    console.error('   AVISO: Regenerar invalida qualquer assinatura existente no Railway.');
    process.exit(1);
  }

  fs.mkdirSync(KEYS_DIR, { recursive: true });

  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

  console.log('✅ Chaves geradas:');
  console.log(`   Private Key: ${PRIVATE_KEY_PATH}  ← NUNCA commite este arquivo`);
  console.log(`   Public Key:  ${PUBLIC_KEY_PATH}`);

  console.log('\n📋 GOVERNANCE_PUBLIC_KEY (cole no Railway):');
  // Colocar em uma linha para variável de ambiente
  const pubKeyOneLine = publicKey.replace(/\n/g, '\\n');
  console.log(`\n${pubKeyOneLine}\n`);

  console.log('⚠️  Guarde private_key.pem em local seguro. Sem ela não é possível autorizar capital.');

// ─── SIGN ─────────────────────────────────────────────────────────────────────
} else if (command === 'sign') {

  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('❌ private_key.pem não encontrado. Rode primeiro: node scripts/authorize.js generate-keys');
    process.exit(1);
  }

  // ── Parâmetros da autorização ──────────────────────────────────────────────
  // Edite estes valores antes de rodar para Testnet ou Live
  const payload = {
    schema: 'LYZER_CAPITAL_AUTH_V1',
    provider: 'REC_COMP_INSTITUTIONAL_v1',
    environment: 'TESTNET',              // 'TESTNET' ou 'LIVE'
    tier: 'T1',                          // 'T1' | 'T2' | 'T3'
    authorized_capacity: 500,            // USD — valor máximo de capital
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h
    nonce: crypto.randomUUID(),
    authorization_id: crypto.randomUUID(),
    emergency_recovery: 'HALT_ALL',
  };

  console.log('\n🏛️  LYZER EDGE — Capital Authorization Ceremony\n');
  console.log('Payload sendo assinado:');
  console.log(JSON.stringify(payload, null, 2));

  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8');
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.sign(null, Buffer.from(payloadBase64), privateKey);
  const signatureBase64 = signature.toString('base64');

  const token = `${payloadBase64}.${signatureBase64}`;

  console.log('\n✅ Assinatura gerada com sucesso.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Cole estas variáveis no Railway:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf-8');
  const pubKeyOneLine = publicKey.replace(/\n/g, '\\n');

  console.log(`GOVERNANCE_PUBLIC_KEY=${pubKeyOneLine}\n`);
  console.log(`CAPITAL_AUTHORIZATION_SIGNATURE=${token}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Ambiente  : ${payload.environment}`);
  console.log(`Tier      : ${payload.tier}`);
  console.log(`Capital   : $${payload.authorized_capacity}`);
  console.log(`Expira em : ${payload.expires_at}`);
  console.log(`Nonce     : ${payload.nonce}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('⚠️  Após inserir no Railway, o sistema reiniciará e validará a assinatura.');
  console.log('   O boot log deve exibir: 🟢 [BOOT] CAPITAL_AUTHORIZATION_SIGNATURE Verified.\n');

// ─── HELP ─────────────────────────────────────────────────────────────────────
} else {
  console.log(`
LYZER EDGE — Capital Authorization Ceremony

Uso:
  node scripts/authorize.js generate-keys   Gera par de chaves Ed25519 (faça uma vez)
  node scripts/authorize.js sign            Assina payload de autorização de capital

Antes de rodar "sign", edite os parâmetros no próprio script:
  - environment: 'TESTNET' ou 'LIVE'
  - authorized_capacity: valor em USD
  - tier: 'T1' | 'T2' | 'T3'
  - expires_at: duração da autorização
`);
}
