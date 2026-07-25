import mmap
import struct
import time
import os

def fnv1a_hash(data: bytes) -> int:
    hash_val = 0xcbf29ce484222325
    for b in data:
        hash_val ^= b
        hash_val = (hash_val * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return hash_val

def main():
    file_path = "signal_ring.mmap"
    print(f"Bootstrap Execution Spine v0.1 - Python Reader")
    print(f"Waiting for {file_path}...")
    
    while not os.path.exists(file_path):
        time.sleep(0.5)

    with open(file_path, "r+b") as f:
        mm = mmap.mmap(f.fileno(), 0)
        
        last_seq = -1
        reads = 0
        while True:
            # Struct format: 
            # I (seq_lock) H (schema) B (mode) B (phase) 16s (uuid) Q (seq_id) Q (time) H (asset) B (regime) B (pad) f (pressure) f (entropy) f (sga) Q (checksum)
            fmt = "<IHBB16sQQHBBfffQ"
            size = struct.calcsize(fmt)
            
            # Read atomically from mmap (in real life we use fences here)
            data = mm[0:size]
            unpacked = struct.unpack(fmt, data)
            seq_lock = unpacked[0]
            
            if seq_lock % 2 != 0:
                # Writer is active
                continue
                
            if seq_lock != last_seq and seq_lock != 0:
                # Payload is from byte 8 to byte 56
                payload = data[8:56]
                expected_checksum = fnv1a_hash(payload)
                read_checksum = unpacked[13]
                
                # Check seqlock again (basic tearing defense)
                # re-read the first 4 bytes
                seq_lock_after = struct.unpack("<I", mm[0:4])[0]
                if seq_lock_after != seq_lock:
                    print("Tearing detected, discarding...")
                    continue
                
                if read_checksum != expected_checksum:
                    print(f"FATAL: Checksum mismatch! Read {read_checksum}, Expected {expected_checksum}")
                else:
                    print(f"[OK] Python Read Event #{unpacked[5]} at {unpacked[6]}")
                    print(f"     SystemMode: {unpacked[2]}, Phase: {unpacked[3]}")
                    print(f"     Causal: {unpacked[10]:.2f}, Entropy: {unpacked[11]:.2f}, SGA: {unpacked[12]:.2f}")
                    print(f"     Checksum Validated: {read_checksum}")
                last_seq = seq_lock
                reads += 1
                if reads >= 3:
                    print("Successfully read 3 events. Exiting.")
                    return
            time.sleep(0.01)

if __name__ == "__main__":
    main()
