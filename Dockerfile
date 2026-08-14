# --- STAGE 1: Build Rust Hub, Node.js packages and download NATS ---
FROM rust:1.78-bookworm as builder

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs unzip

# Create app directory
WORKDIR /app

# Copy project files
COPY . .

# Build Rust lyzer-core-hub
RUN cargo build --release --manifest-path lyzer-workspace/lyzer-core-hub/Cargo.toml

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

# Install process manager utilities, curl, Node.js, pip and huggingface_hub library
RUN apt-get update && apt-get install -y curl procps python3-pip && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    pip install --break-system-packages huggingface_hub && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy NATS from builder
COPY --from=builder /usr/local/bin/nats-server /usr/local/bin/nats-server

# Copy Rust compiled hub
COPY --from=builder /app/lyzer-workspace/target/release/lyzer-core-hub /usr/local/bin/lyzer-core-hub

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
    ARL_MODE=TESTNET \
    LIVE_TRADING_ENABLED=false \
    MAX_DAILY_CAPITAL=1000 \
    NODE_OPTIONS="--max-old-space-size=2048"

WORKDIR "/app/lyzer edge"

# Expose port 7860
EXPOSE 7860

# Start NATS, Rust IPC Hub and Node.js server concurrently, after restoring database from Hugging Face Bucket
CMD ["sh", "-c", "python3 backup_restore.py restore; (nats-server -js 2>&1 | grep -v 'Client parser ERROR' &) ; lyzer-core-hub & node --max-old-space-size=2048 backend/server.js"]
