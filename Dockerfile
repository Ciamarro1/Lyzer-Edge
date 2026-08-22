# --- STAGE 1: Build Rust Hub, Node.js packages and download NATS ---
FROM rust:latest as builder

# Install Node.js and Protocol Buffers compiler (for Rust gRPC/prost)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs unzip protobuf-compiler

# Create app directory
WORKDIR /app

# Copy project files
COPY . .

# Build Rust lyzer-core-hub
RUN cargo build --release --manifest-path lyzer-workspace/lyzer-core-hub/Cargo.toml

# Build Rust RiskGateway
RUN cargo build --release --manifest-path "lyzer edge/src-rust/lyzer-risk-gateway/Cargo.toml"

# Build Rust IntentRegistry
RUN cargo build --release --manifest-path "lyzer edge/src-rust/lyzer-intent-registry/Cargo.toml"

# Install Node.js dependencies
WORKDIR "/app/lyzer edge"
RUN npm install

# Build Vite frontend assets
RUN npm run build

# Download NATS server
WORKDIR /app
RUN curl -L https://github.com/nats-io/nats-server/releases/download/v2.10.11/nats-server-v2.10.11-linux-amd64.tar.gz -o nats.tar.gz && \
    tar -xzf nats.tar.gz && \
    mv nats-server-v2.10.11-linux-amd64/nats-server /usr/local/bin/ && \
    rm -rf nats.tar.gz nats-server-v2.10.11-linux-amd64

# --- STAGE 2: Lightweight runtime container based on Ubuntu 24.04 ---
FROM ubuntu:24.04

# Install process manager utilities, python3, pip, curl, Node.js
RUN apt-get update && apt-get install -y curl procps python3 python3-pip && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    pip3 install huggingface_hub --break-system-packages && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy NATS from builder
COPY --from=builder /usr/local/bin/nats-server /usr/local/bin/nats-server

# Copy Rust compiled hub
COPY --from=builder /app/lyzer-workspace/target/release/lyzer-core-hub /usr/local/bin/lyzer-core-hub

# Copy Rust RiskGateway and IntentRegistry
COPY --from=builder ["/app/lyzer edge/src-rust/target/release/lyzer-risk-gateway", "/usr/local/bin/lyzer-risk-gateway"]
COPY --from=builder ["/app/lyzer edge/src-rust/target/release/lyzer-intent-registry", "/usr/local/bin/lyzer-intent-registry"]

# Copy the rest of the application files
COPY --from=builder /app /app

# Reinstall Node.js production packages directly on the runtime image.
# Since npm workspaces is used, we clean and reinstall at the root /app level.
WORKDIR /app
RUN rm -rf node_modules "lyzer edge/node_modules" && npm install --omit=dev

# Set permissions for Hugging Face unprivileged user (UID 1000 - which is default "ubuntu" user)
RUN chmod -R 777 /app && \
    chown -R ubuntu:ubuntu /app

USER ubuntu
ENV HOME=/home/ubuntu \
    PATH=/home/ubuntu/.local/bin:$PATH \
    PORT=7860 \
    NODE_OPTIONS="--max-old-space-size=384" \
    ARL_MODE=TESTNET \
    CCLIST_DVF_FLOOR=0.1 \
    CCLIST_LETHAL_ILLUSION_LIMIT=0.9 \
    CCLIST_STRESS_ACCUMULATION=0.002 \
    CCLIST_STRESS_RELEASE=0.1 \
    COURT_SECRET_KEY=lyzer_hf_spaces_default_key \
    ENABLE_24_7_REGIME=true \
    ENABLE_RANGE_SCALP_MODE=true \
    LHDS_VETO_LIMIT=0.995 \
    LIVE_TRADING_ENABLED=true \
    MAX_DAILY_CAPITAL=1000 \
    MFE_TARGET_BE=0.8 \
    MFE_TARGET_SCALE1=1.2 \
    MFE_TARGET_SCALE2=1.8 \
    MOL_SCL_THRESHOLD=3 \
    MOL_STABILIZATION_WINDOW_MS=45000 \
    OFF_PEAK_TRG_FLOOR=0.22 \
    ONTOLOGICAL_COLLAPSE_TRG=0.7 \
    RANGE_SCALP_BE=0.45 \
    RANGE_SCALP_TP=1.0 \
    RESIDUAL_CONSENSUS_LIMIT=0.1 \
    SHADOW_TRADING_ENABLED=false \
    TRG_THRESHOLD=0.35 \
    VECTOR_CONFLUENCE_THRESHOLD=0.018 \
    ENABLE_RISK_NORMALIZATION=true \
    RISK_CAPITAL_BASE=1000 \
    RISK_PCT_PER_TRADE=0.005 \
    MAX_NOTIONAL=1000 \
    ENABLE_RANGE_SCALP_TP=false \
    SCALP_TP_PCT=99.0 \
    ENABLE_TIME_EXIT_ALPHA=true \
    TIME_EXIT_MINUTES=15 \
    ATR_SL_MULTIPLIER=1.40 \
    SCALP_MIN_STOP=0.0015 \
    SCALP_MAX_STOP=0.0045

WORKDIR "/app/lyzer edge"

# Expose port 7860
EXPOSE 7860

# Start restore script, NATS, Rust IPC Hub, RiskGateway, IntentRegistry, and Node.js server concurrently
# Use exec for the main server so it receives SIGTERM as PID 1
CMD ["sh", "-c", "python3 backup_restore.py restore ; (nats-server -js > /dev/null 2>&1 &) ; lyzer-core-hub & lyzer-risk-gateway & lyzer-intent-registry & node ../recovery/oos11_microstructure_discovery.mjs & exec node --max-old-space-size=384 backend/server.js"]
