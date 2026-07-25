use crate::allocator::MmapAllocator;
use crate::registry::{RingRegistry, RingDescriptor, LockPolicy};
use crate::manager::RingManager;

pub struct BootstrapEngine {
    allocator: MmapAllocator,
    registry: RingRegistry,
}

impl BootstrapEngine {
    pub fn new(mmap_dir: &str) -> Self {
        Self {
            allocator: MmapAllocator::new(mmap_dir),
            registry: RingRegistry::new(),
        }
    }

    /// Executed on system startup. Fail-fast rules apply.
    pub fn ignite_spine(&mut self) -> Result<Vec<RingManager>, String> {
        println!("[SPINE] Initiating Big Bang Sequence...");
        
        let mut managers = Vec::new();
        
        // Config: BTC (Crypto=1), SPX (Eq=2)
        let assets = vec![
            (1001, 1, "btc_1m", 10, 86400), // 10 events/sec, 1 day retention
            (2001, 2, "spx_1m", 5,  86400),
        ];

        for (asset_id, asset_class, identifier, eps, ret) in assets {
            println!("[SPINE] Allocating Physical Fabric for {}...", identifier);
            
            // 1. Allocate Physical Ring
            let element_size = std::mem::size_of::<crate::CausalBar>();
            if element_size != 128 {
                return Err(format!("FATAL: CausalBar ABI Alignment Failed. Size is {}", element_size));
            }
            
            let region = self.allocator.allocate_ring(identifier, "main", eps, ret, element_size);
            
            // 2. Register Reality
            let descriptor = RingDescriptor {
                asset_id,
                asset_class,
                timeframe_ms: 60000,
                mmap_path: region.file_path.to_str().unwrap().to_string(),
                schema_version: 0x0100,
                lock_policy: LockPolicy::SeqlockWriter,
            };
            self.registry.register_ring(descriptor, &region);
            
            // 3. Expose Manager Handle
            let manager = RingManager::new(region, eps * ret, element_size);
            managers.push(manager);
        }

        println!("[SPINE] Valid Reality Fabric Estabilished. System Bootstrap Complete.");
        Ok(managers)
    }
}
