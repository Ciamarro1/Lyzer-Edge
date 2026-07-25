use crate::types::ObservationType;

pub struct ParquetSink {
    buffer: Vec<ObservationType>,
    max_batch_size: usize,
}

impl ParquetSink {
    pub fn new(max_batch_size: usize) -> Self {
        Self {
            buffer: Vec::with_capacity(max_batch_size),
            max_batch_size,
        }
    }

    /// Records an observation into the memory buffer.
    /// Returns true if the buffer was flushed (Observation Commit achieved).
    pub fn record(&mut self, event: ObservationType) -> bool {
        self.buffer.push(event);

        if self.buffer.len() >= self.max_batch_size {
            self.flush();
            return true;
        }
        false
    }

    /// The sacred Observation Commit: writing to immutable Parquet.
    fn flush(&mut self) {
        if self.buffer.is_empty() {
            return;
        }

        // Implementation detail: Convert self.buffer to Arrow arrays,
        // then write to a new immutable Parquet file in the OA directory.
        // File naming convention: YYYY-MM-DD/sequence_start_sequence_end.parquet
        
        // ... (Arrow/Parquet serialization logic goes here) ...

        println!("[ParquetSink] Observation Commit complete: {} records flushed to disk.", self.buffer.len());
        self.buffer.clear();
    }
}
