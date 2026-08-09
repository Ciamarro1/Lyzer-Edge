import os
import sys

# Get token and bucket name from environment (leave HF_BUCKET_NAME empty to disable cloud backup/restore)
token = os.environ.get("HF_TOKEN")
bucket_name = os.environ.get("HF_BUCKET_NAME", "")

if not token or not bucket_name:
    print("[BACKUP] Cloud backup/restore disabled (HF_TOKEN or HF_BUCKET_NAME not set). Operating in local mode.")
    sys.exit(0)

try:
    from huggingface_hub import create_bucket, sync_bucket
except ImportError:
    print("[BACKUP] huggingface_hub package not installed. Operating in local mode.")
    sys.exit(0)

username = os.environ.get("HF_USERNAME", "jonatanciamarro")
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
