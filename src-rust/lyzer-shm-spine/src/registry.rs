use crate::allocator::MappedRegion;
use std::collections::HashMap;

#[derive(Debug, Clone, Copy)]
pub enum LockPolicy {
    SeqlockReader,
    SeqlockWriter,
}

pub struct RingDescriptor {
    pub asset_id: u32,
    pub asset_class: u8,
    pub timeframe_ms: u64,
    pub mmap_path: String,
    pub schema_version: u16,
    pub lock_policy: LockPolicy,
}

pub struct RingRegistry {
    rings: HashMap<u32, RingDescriptor>, // asset_id -> Descriptor
}

impl RingRegistry {
    pub fn new() -> Self {
        Self {
            rings: HashMap::new(),
        }
    }

    pub fn register_ring(&mut self, descriptor: RingDescriptor, region: &MappedRegion) {
        // Enforce Schema Version locally 
        if descriptor.schema_version != 0x0100 {
            panic!("FATAL: Schema Version Mismatch. Cannot bind reality.");
        }
        
        // Single Writer Guarantee enforced implicitly (only one Rust bootstrap logic)
        // Here we just map the descriptor. In a full app, we would validate writer handles.
        self.rings.insert(descriptor.asset_id, descriptor);
        println!("Registered Ring for Asset ID {} at {}", self.rings.get(&descriptor.asset_id).unwrap().asset_id, region.file_path.display());
    }

    pub fn get_descriptor(&self, asset_id: u32) -> Option<&RingDescriptor> {
        self.rings.get(&asset_id)
    }
}
