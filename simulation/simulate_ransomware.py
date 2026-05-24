"""
simulate_ransomware.py  —  Advanced safe ransomware behavior simulator
Simulates 4 attack stages: Reconnaissance, Encryption, Exfiltration, Ransom Note
"""

import os, time, random, string, argparse, sys
from datetime import datetime

FAKE_EXTENSIONS = [".locked",".encrypted",".enc",".crypto",".cerber",".wnry",".crypt"]
RANSOM_NOTE     = """YOUR FILES HAVE BEEN ENCRYPTED
================================
[SIMULATION - THIS IS NOT REAL RANSOMWARE]

All your important files have been encrypted using AES-256.
To recover your files, send 0.5 BTC to: 1SimuLAtedWaLLetAddr3ss

YOUR PERSONAL ID: {uid}
DEADLINE: 72 hours

THIS IS A SAFE SIMULATION FOR ACADEMIC RESEARCH PURPOSES ONLY.
"""

def rnd(n=256): return "".join(random.choices(string.printable, k=n))
def rnd_bytes(n=4096): return bytes(random.randint(0,255) for _ in range(n))

def stage(name, color="\033[96m"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"\n{color}[{ts}] ═══ STAGE: {name} ═══\033[0m")
    time.sleep(0.5)

def simulate(folder, intensity):
    speeds = {"low":{"n":10,"delay":0.4},"medium":{"n":30,"delay":0.15},"high":{"n":80,"delay":0.05}}
    cfg = speeds.get(intensity, speeds["medium"])
    n, delay = cfg["n"], cfg["delay"]
    os.makedirs(folder, exist_ok=True)
    uid = "SIM-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=12))

    print(f"\n\033[93m{'='*60}\033[0m")
    print(f"\033[93m  RansomGuard — Safe Ransomware Simulator (ACADEMIC USE)\033[0m")
    print(f"\033[93m  Intensity: {intensity.upper()}  |  Files: {n}  |  Folder: {folder}\033[0m")
    print(f"\033[93m{'='*60}\033[0m")

    # ── Stage 1: Reconnaissance ──────────────────────────────────────────
    stage("RECONNAISSANCE", "\033[94m")
    exts = [".txt",".docx",".pdf",".xlsx",".jpg",".png",".mp4",".zip"]
    created = []
    print(f"  Creating {n} target files …")
    for i in range(n):
        ext  = random.choice(exts)
        path = os.path.join(folder, f"file_{i:04d}{ext}")
        with open(path, "w") as f:
            f.write(rnd(random.randint(100, 800)))
        created.append(path)
        if i % 10 == 0:
            print(f"  Created {i+1}/{n} files …", end="\r")
        time.sleep(delay * 0.5)
    print(f"  ✓ {n} files created")

    # ── Stage 2: Encryption (simulate with high-entropy write) ───────────
    stage("ENCRYPTION", "\033[91m")
    print(f"  Overwriting files with high-entropy data (simulates encryption) …")
    for i, path in enumerate(created):
        if os.path.exists(path):
            # Write pseudo-random bytes (high entropy = encrypted-looking)
            with open(path, "wb") as f:
                f.write(rnd_bytes(random.randint(512, 2048)))
            if i % 10 == 0:
                print(f"  Encrypted {i+1}/{len(created)} files …", end="\r")
            time.sleep(delay * 0.3)
    print(f"\n  ✓ All files overwritten with high-entropy data")
    time.sleep(0.5)

    # ── Stage 3: Rename with ransomware extensions ────────────────────────
    stage("EXTENSION CHANGE", "\033[91m")
    renamed = []
    for path in created:
        if os.path.exists(path):
            ext      = random.choice(FAKE_EXTENSIONS)
            new_path = os.path.splitext(path)[0] + ext
            os.rename(path, new_path)
            renamed.append(new_path)
            print(f"  {os.path.basename(path):30s} → {os.path.basename(new_path)}")
            time.sleep(delay)
    print(f"\n  ✓ {len(renamed)} files renamed with ransomware extensions")

    # ── Stage 4: Drop ransom note ─────────────────────────────────────────
    stage("RANSOM NOTE DROP", "\033[91m")
    note_path = os.path.join(folder, "README_DECRYPT.txt")
    with open(note_path, "w") as f:
        f.write(RANSOM_NOTE.format(uid=uid))
    print(f"  ✓ Ransom note dropped: {note_path}")
    time.sleep(1)

    # ── Cleanup ───────────────────────────────────────────────────────────
    stage("CLEANUP", "\033[92m")
    for p in renamed:
        try: os.remove(p)
        except: pass
    try: os.remove(note_path)
    except: pass
    print(f"  ✓ Simulation files cleaned up")
    print(f"\n\033[92m  Simulation complete! Check RansomGuard dashboard for alerts.\033[0m\n")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--folder",    default=os.path.join(os.path.expanduser("~"),"TestFolder"))
    p.add_argument("--intensity", choices=["low","medium","high"], default="medium")
    args = p.parse_args()
    simulate(args.folder, args.intensity)