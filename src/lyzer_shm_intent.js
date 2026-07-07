const fs = require('fs');

// C-compatible struct format for IntentEvent (24 bytes)
// u64 timestamp (8 bytes)
// u32 asset_id (4 bytes)
// u8 action (1 byte)
// u8 eal_decision (1 byte)
// f64 quantity (8 bytes)
// [u8; 2] pad (2 bytes)

const INTENT_SIZE = 24;
const HEADER_SIZE = 32;

class ShmIntentWriter {
    constructor(filename = 'lyzer_intent_ring.mmap', capacity = 1024) {
        this.filename = filename;
        this.capacity = capacity;
        this.fileSize = HEADER_SIZE + (INTENT_SIZE * capacity);
        
        if (!fs.existsSync(this.filename)) {
            const buf = Buffer.alloc(this.fileSize, 0);
            fs.writeFileSync(this.filename, buf);
        }
        
        this.fd = fs.openSync(this.filename, 'r+');
        this.buffer = Buffer.alloc(this.fileSize);
        fs.readSync(this.fd, this.buffer, 0, this.fileSize, 0);
        
        // Initialize header if empty
        const cap = this.buffer.readBigUInt64LE(16);
        if (cap === 0n) {
            this.buffer.writeBigUInt64LE(0n, 0); // head
            this.buffer.writeBigUInt64LE(0n, 8); // tail
            this.buffer.writeBigUInt64LE(BigInt(capacity), 16); // capacity
            this.buffer.writeBigUInt64LE(BigInt(INTENT_SIZE), 24); // element_size
            fs.writeSync(this.fd, this.buffer, 0, HEADER_SIZE, 0);
        }
    }

    writeIntent(asset_id, action, eal_decision, quantity) {
        const head = this.buffer.readBigUInt64LE(0);
        const tail = this.buffer.readBigUInt64LE(8);
        const cap = this.buffer.readBigUInt64LE(16);
        
        const next_head = (head + 1n) % cap;
        if (next_head === tail) {
            return false; // Ring buffer full
        }
        
        const offset = HEADER_SIZE + Number(head) * INTENT_SIZE;
        const timestamp = BigInt(Date.now());
        
        this.buffer.writeBigUInt64LE(timestamp, offset);
        this.buffer.writeUInt32LE(asset_id, offset + 8);
        this.buffer.writeUInt8(action, offset + 12);
        this.buffer.writeUInt8(eal_decision, offset + 13);
        this.buffer.writeDoubleLE(quantity, offset + 14);
        this.buffer.writeUInt16LE(0, offset + 22); // pad
        
        // Update head
        this.buffer.writeBigUInt64LE(next_head, 0);
        
        // Flush specific areas to disk (in real HFT, we'd use native mmap binding like 'mmap-io')
        fs.writeSync(this.fd, this.buffer, offset, INTENT_SIZE, offset);
        fs.writeSync(this.fd, this.buffer, 0, 8, 0);
        return true;
    }

    close() {
        fs.closeSync(this.fd);
    }
}

module.exports = { ShmIntentWriter };
