import subprocess
import time
import os
import re
import signal
import sys

# Set encoding for Windows console (to support emojis)
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def get_tunnel_url(port, subdomain):
    print(f"📡 Starting tunnel for port {port} (subdomain: {subdomain})...")
    # Run localtunnel with a fixed subdomain
    cmd = f"npx localtunnel --port {port} --subdomain {subdomain}"
    process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    
    # Wait for the URL to appear in the output
    url = None
    start_time = time.time()
    while time.time() - start_time < 15:
        line = process.stdout.readline()
        if not line:
            break
        print(f"  [LT {port}] {line.strip()}")
        if "your url is:" in line:
            url = line.split("your url is:")[1].strip()
            break
    return url, process

def update_env_file(file_path, key, value):
    if not os.path.exists(file_path):
        with open(file_path, "w") as f:
            f.write(f"{key}={value}\n")
        return

    with open(file_path, "r") as f:
        lines = f.readlines()
    
    updated = False
    with open(file_path, "w") as f:
        for line in lines:
            if line.startswith(f"{key}="):
                f.write(f"{key}={value}\n")
                updated = True
            else:
                f.write(line)
        if not updated:
            f.write(f"\n{key}={value}\n")

def main():
    print("🚀 --- WealthAI Terminal Unified Orchestrator ---")
    
    # 1. Start a Single Unified Tunnel (Port 8001 now serves both)
    suffix = "wealthai-v3-" + os.urandom(2).hex()
    subdomain = f"terminal-{suffix}"
    
    public_url, tunnel_proc = get_tunnel_url(8001, subdomain)
    
    if not public_url:
        print("❌ Failed to get tunnel URL. Check your internet or npx installation.")
        return

    print(f"\n✅ SUCCESS! Unified Public URL generated:")
    print(f"🔗 APP: {public_url}")

    # 2. Update Env Files (Both point to the same host)
    print("\n📝 Syncing environment variables...")
    update_env_file(".env", "FRONTEND_URL", public_url)
    update_env_file("frontend/.env", "VITE_API_URL", public_url)
    print("✅ Sync Complete.")

    # 3. Start Unified Backend
    print("\n🏗️ Starting Unified Full-Stack Backend...")
    # Make sure we use the same python that is running this script
    cmd = f"\"{sys.executable}\" -m uvicorn main:app --port 8001 --workers 1"
    
    # Run in background
    app_proc = subprocess.Popen(cmd, shell=True)
    
    print("\n🔥 TERMINAL IS HOT! Visit the APP link above.")
    print("Press Ctrl+C to shut down.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        tunnel_proc.terminate()
        app_proc.terminate()

if __name__ == "__main__":
    main()
