use std::fs::OpenOptions;
use std::mem;
use std::ptr;
use std::sync::atomic::{AtomicU32, Ordering};
use memmap2::MmapMut;
use std::hash::Hasher;

// FNV-1a hasher simples para o checksum
fn fnv1a_hash(bytes: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for &b in bytes {
        hash ^= b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

#[repr(C, align(64))]
#[derive(Debug, Clone, Copy)]
pub struct SignalEvent {
    // 1. Atomic Safety & Versioning (8 bytes)
    pub seq_lock: u32,
    pub schema_version: u16,
    pub system_mode: u8,    // 0: SAFE_HALT, 1: SHADOW, 2: DEMO
    pub phase_id: u8,

    // 2. Execution Sequencer & Clock Authority (24 bytes)
    pub run_id: [u8; 16],   // UUIDv7
    pub event_sequence_id: u64,
    pub timestamp_ns: u64,  // CLOCK AUTHORITY: Monotonic ns from OS boot

    // 3. Execution Data (16 bytes)
    pub asset_id: u16,
    pub regime_state: u8,
    pub _pad1: u8,
    pub causal_pressure: f32,
    pub entropy_gradient: f32,
    pub sga_grounding: f32,

    // 4. Integridade Estrutural (8 bytes)
    pub checksum: u64, // Checksum do payload (bytes 8 a 56)
}

impl SignalEvent {
    pub fn calculate_checksum(&self) -> u64 {
        // Pega os bytes do payload ignorando seq_lock, schema, system_mode, phase_id (8 bytes) e checksum (8 bytes) no final
        // Total bytes = 64. Payload é do offset 8 ao offset 56.
        let ptr = self as *const _ as *const u8;
        let payload = unsafe { std::slice::from_raw_parts(ptr.add(8), 48) };
        fnv1a_hash(payload)
    }
}

pub struct RingWriter {
    mmap: MmapMut,
    max_events: usize,
    write_idx: usize,
}

impl RingWriter {
    pub fn new(file_path: &str, max_events: usize) -> std::io::Result<Self> {
        let file_size = max_events * mem::size_of::<SignalEvent>();
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(file_path)?;
        
        file.set_len(file_size as u64)?;
        
        let mut mmap = unsafe { MmapMut::map_mut(&file)? };
        
        // Zero init
        mmap.fill(0);
        
        Ok(Self {
            mmap,
            max_events,
            write_idx: 0,
        })
    }

    pub fn write_event(&mut self, mut event: SignalEvent) {
        let offset = self.write_idx * mem::size_of::<SignalEvent>();
        let ptr = unsafe { self.mmap.as_mut_ptr().add(offset) as *mut SignalEvent };
        
        // Pega ref para o seq_lock do arquivo
        let seq_lock_ptr = unsafe { std::ptr::addr_of!((*ptr).seq_lock) } as *const AtomicU32 as *mut AtomicU32;
        let seq_lock = unsafe { &*seq_lock_ptr };
        
        // 1. SeqLock = impar (Writing)
        let current_seq = seq_lock.load(Ordering::Acquire);
        seq_lock.store(current_seq + 1, Ordering::Release);
        
        std::sync::atomic::compiler_fence(Ordering::Release);
        
        // 2. Calcula checksum
        event.checksum = event.calculate_checksum();
        event.seq_lock = current_seq + 1; // Só pra manter coerente na struct
        
        // 3. Copia a struct (pode sobrescrever o seqlock temporariamente, então a gente tem q garantir q ele é impar)
        unsafe {
            ptr::copy_nonoverlapping(&event, ptr, 1);
        }
        
        std::sync::atomic::compiler_fence(Ordering::Release);
        
        // 4. SeqLock = par (Clean)
        seq_lock.store(current_seq + 2, Ordering::Release);
        
        self.write_idx = (self.write_idx + 1) % self.max_events;
    }
}

#[repr(C, align(8))]
#[derive(Debug, Clone, Copy)]
pub struct Level {
    pub price: f32,
    pub quantity: f32,
}

#[repr(C, align(64))]
#[derive(Debug, Clone, Copy)]
pub struct RealityLOBEvent {
    pub seq_lock: u32,
    pub asset_id: u16,
    pub _pad: u16,
    pub timestamp_ns: u64,
    pub bids: [Level; 3],
    pub asks: [Level; 3],
}

#[repr(C, align(64))]
#[derive(Debug, Clone, Copy)]
pub struct ExecutionFeedbackEvent {
    pub timestamp: u64,           // 8 bytes (Epoch ns)
    pub execution_id: u64,        // 8 bytes (Unique execution identifier)
    pub signal_id: u64,           // 8 bytes (Original signal identifier)
    pub provider_id: u32,         // 4 bytes (V1 or V2 provider)
    pub status: u8,               // 1 byte  (Execution status: New, Filled, Rejected, etc.)
    pub direction: u8,            // 1 byte  (Buy=0, Sell=1)
    pub padding1: [u8; 2],        // 2 bytes (Alignment)
    pub fill_price: f64,          // 8 bytes (Average fill price)
    pub filled_qty: f64,          // 8 bytes (Executed quantity)
    pub latency_ms: u32,          // 4 bytes (Execution round-trip latency)
    pub slippage_bps: i32,        // 4 bytes (Slippage in basis points)
    pub error_code: u32,          // 4 bytes (Exchange error code if rejected)
    pub padding2: [u8; 4],        // 4 bytes (Trailing padding to sum exactly 64)
}
