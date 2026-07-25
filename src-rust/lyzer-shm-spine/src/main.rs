use lyzer_shm_spine::{SignalEvent, RingWriter};
use std::time::{SystemTime, UNIX_EPOCH};
use std::{thread, time::Duration};

fn main() -> std::io::Result<()> {
    println!("Bootstrap Execution Spine v0.1 - Rust Writer");
    let file_path = "signal_ring.mmap";
    let mut writer = RingWriter::new(file_path, 1024)?;

    println!("Mmap initialized at {}", file_path);

    let mut seq_id = 0;
    loop {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64;

        let event = SignalEvent {
            seq_lock: 0,
            schema_version: 1,
            system_mode: 1, // SHADOW
            phase_id: 2,    // WARMUP
            run_id: [0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef], // Dummy UUIDv7
            event_sequence_id: seq_id,
            timestamp_ns: now,
            asset_id: 1, // BTCUSDT
            regime_state: 3, // Correlation Lock
            _pad1: 0,
            causal_pressure: 0.75,
            entropy_gradient: -0.12,
            sga_grounding: 0.98,
            checksum: 0,
        };

        writer.write_event(event);
        println!("Rust Wrote Event #{} at {}", seq_id, now);
        seq_id += 1;

        thread::sleep(Duration::from_millis(500));
    }
}
