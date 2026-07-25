use crate::allocator::MappedRegion;
use crate::{CausalBar, RingBufferHeader};
use std::sync::atomic::{fence, Ordering};

pub struct RingManager {
    region: MappedRegion,
    capacity: usize,
    element_size: usize,
}

impl RingManager {
    pub fn new(mut region: MappedRegion, capacity: usize, element_size: usize) -> Self {
        // Initialize header if empty
        let head: [u8; 8] = region.mmap[0..8].try_into().unwrap();
        if u64::from_le_bytes(head) == 0 {
            // Write capacity and element_size
            region.mmap[16..24].copy_from_slice(&(capacity as u64).to_le_bytes());
            region.mmap[24..32].copy_from_slice(&(element_size as u64).to_le_bytes());
        }
        
        Self {
            region,
            capacity,
            element_size,
        }
    }

    fn calculate_checksum(payload: &[u8]) -> u64 {
        let mut chk: u64 = 0;
        for chunk in payload.chunks_exact(8) {
            let val = u64::from_le_bytes(chunk.try_into().unwrap());
            chk ^= val;
        }
        chk
    }

    /// Appends a CausalBar using the Drop Oldest backpressure policy and Seqlock atomic boundary.
    pub fn write_bar(&mut self, mut bar: CausalBar) {
        let head_bytes: [u8; 8] = self.region.mmap[0..8].try_into().unwrap();
        let head = u64::from_le_bytes(head_bytes) as usize;
        
        let next_head = (head + 1) % self.capacity; // Overwrite oldest natively
        let offset = 32 + (head * self.element_size);
        
        // 1. Read current seq_lock
        let seq_lock_bytes: [u8; 4] = self.region.mmap[offset..offset+4].try_into().unwrap();
        let mut seq_lock = u32::from_le_bytes(seq_lock_bytes);
        
        // 2. Increment seq_lock (Odd -> Write in progress)
        seq_lock = seq_lock.wrapping_add(1);
        self.region.mmap[offset..offset+4].copy_from_slice(&seq_lock.to_le_bytes());
        fence(Ordering::Release); // Memory Barrier
        
        // 3. Prepare Payload (Convert CausalBar to bytes)
        bar.seq_lock = seq_lock; 
        
        // Unsafe cast struct to slice
        let bar_ptr: *const u8 = &bar as *const CausalBar as *const u8;
        let bar_bytes = unsafe { std::slice::from_raw_parts(bar_ptr, self.element_size) };
        
        // 4. Calculate Checksum (Excluding seq_lock and pad/checksum themselves logically, but we XOR fold bytes 8 to 88)
        let chk = Self::calculate_checksum(&bar_bytes[8..88]);
        bar.checksum = chk;
        
        // Re-get bytes after checksum update
        let bar_bytes = unsafe { std::slice::from_raw_parts(bar_ptr, self.element_size) };
        
        // 5. Write Payload
        self.region.mmap[offset+4 .. offset+self.element_size].copy_from_slice(&bar_bytes[4..self.element_size]);
        fence(Ordering::Release); // Full Memory Barrier
        
        // 6. Finalize seq_lock (Even -> Stable)
        seq_lock = seq_lock.wrapping_add(1);
        self.region.mmap[offset..offset+4].copy_from_slice(&seq_lock.to_le_bytes());
        
        // Update head
        self.region.mmap[0..8].copy_from_slice(&(next_head as u64).to_le_bytes());
    }
}
