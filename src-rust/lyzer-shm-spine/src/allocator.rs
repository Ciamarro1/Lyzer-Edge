use memmap2::MmapMut;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};

pub struct MappedRegion {
    pub mmap: MmapMut,
    pub size: usize,
    pub file_path: PathBuf,
}

pub struct MmapAllocator {
    pub base_dir: PathBuf,
}

impl MmapAllocator {
    pub fn new<P: AsRef<Path>>(base_dir: P) -> Self {
        std::fs::create_dir_all(&base_dir).expect("Failed to create mmap directory");
        Self {
            base_dir: base_dir.as_ref().to_path_buf(),
        }
    }

    /// Creates or opens a pre-allocated deterministic sized ring.
    pub fn allocate_ring(&self, asset_class: &str, identifier: &str, events_per_second: usize, retention_window_secs: usize, element_size: usize) -> MappedRegion {
        let capacity = events_per_second * retention_window_secs;
        // 32 bytes header + elements. Round up to page boundary (4KB).
        let raw_size = 32 + (capacity * element_size);
        let aligned_size = (raw_size + 4095) & !4095; // 4KB align
        
        let file_name = format!("{}_{}.ring", asset_class, identifier);
        let file_path = self.base_dir.join(file_name);
        
        let mut file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(&file_path)
            .expect("Failed to open mmap ring file");
            
        let meta = file.metadata().expect("Failed to get file metadata");
        if meta.len() == 0 {
            // Pre-allocate full size deterministically (Zero Growth Runtime)
            file.set_len(aligned_size as u64).expect("Failed to pre-allocate ring size");
            // Ensure data is zeroed and written to disk
            let mut zeros = vec![0u8; 4096];
            let mut written = 0;
            while written < aligned_size {
                file.write_all(&zeros).unwrap();
                written += 4096;
            }
        } else if meta.len() != aligned_size as u64 {
            panic!("FATAL: Ring file exists but size mismatch! Expected {}, Found {}. Reality Desync Event.", aligned_size, meta.len());
        }
        
        let mmap = unsafe { MmapMut::map_mut(&file).expect("Failed to mmap region") };
        
        MappedRegion {
            mmap,
            size: aligned_size,
            file_path,
        }
    }
}
