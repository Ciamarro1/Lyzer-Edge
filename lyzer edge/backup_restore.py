import os
import sys
from huggingface_hub import create_bucket, sync_bucket

# Get token from environment
token = os.environ.get("HF_TOKEN")
if not token:
    print("[BACKUP] HF_TOKEN environment variable not set. Skipping backup/restore.")
    sys.exit(0)

bucket_name = "lyzer-edge-storage"
username = "jonatanciamarro"
bucket_uri = f"hf://buckets/{username}/{bucket_name}"
local_dir = "/tmp/data"

# Ensure local dir exists
os.makedirs(local_dir, exist_ok=True)

action = sys.argv[1] if len(sys.argv) > 1 else "backup"

try:
    # Try to create bucket if it doesn't exist (failsafe)
    try:
        create_bucket(bucket_name, private=True, token=token, exist_ok=True)
    except Exception:
        pass

    if action == "restore":
        print(f"[BACKUP] Restoring database from {bucket_uri} to {local_dir}...")
        sync_bucket(bucket_uri, local_dir, token=token)
        print("[BACKUP] Restore completed successfully.")
    else:
        print(f"[BACKUP] Backing up database from {local_dir} to {bucket_uri}...")
        sync_bucket(local_dir, bucket_uri, token=token)
        print("[BACKUP] Backup completed successfully.")
except Exception as e:
    print(f"[BACKUP] Error during {action}: {e}")
