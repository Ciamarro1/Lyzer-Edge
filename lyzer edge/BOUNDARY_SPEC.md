# Lyzer Labs - Boundary Execution Environment
# ==========================================
# Este arquivo mapeia a infraestrutura física exata e as versões 
# necessárias para executar a arquitetura do Lyzer Labs (TS ⇄ Rust ⇄ NATS) 
# em qualquer host e passar pelos testes de certificação do Sprint 0.

# 1. CORE INFRASTRUCTURE (Sistema Operacional)
# ----------------------------------------------------
# O ambiente deve possuir os seguintes binários globais no PATH:

rustc   == 1.96.0  # Rust Compiler (Toolchain: x86_64-pc-windows-gnu ou nativo Linux)
cargo   == 1.96.0  # Rust Package Manager
node    >= 20.11.1 # Runtime para a camada de Inteligência/TS
npm     >= 10.2.4  # Package Manager do Node
nats-server >= 2.10.11 # NATS JetStream Message Broker
protoc  >= 3.20.3  # (Opcional se gRPC for compilado dinamicamente via ts-proto/tonic, mas obrigatório para builds estáticos)

# 2. INTELLIGENCE PLANE (TypeScript / Node.js)
# ----------------------------------------------------
# Instalar via: npm install
# Estes pacotes devem constar no package.json

@grpc/grpc-js == 1.10.8   # Core gRPC client
@grpc/proto-loader == 0.7.13 # Dynamic Proto parser
nats == 3.8.0             # NATS client + JetStream API
uuid == 10.0.0            # Geração restrita de UUIDv7 (Causal ID, Intent ID)

# 3. EXECUTION PLANE (Rust)
# ----------------------------------------------------
# Instalar via: cargo build
# Estes pacotes devem constar no Cargo.toml do lyzer-risk-gateway

tonic = "0.11.0"          # gRPC Server & Client over HTTP/2
prost = "0.12.6"          # Protobuf serialization
tokio = { version = "1.38.0", features = ["macros", "rt-multi-thread"] } # Async Runtime
async-nats = "0.34.0"     # Rust NATS JetStream client
uuid = { version = "1.8.0", features = ["v7"] } # UUIDv7 gen/parsing

# ----------------------------------------------------
# ORDEM DE INICIALIZAÇÃO PARA TESTES:
# 1. nats-server -js
# 2. cargo run --manifest-path src-rust/lyzer-risk-gateway/Cargo.toml
# 3. ts-node src-ts/scripts/setup-nats.ts
# 4. ts-node src-ts/scripts/boundary-certification-suite.ts
