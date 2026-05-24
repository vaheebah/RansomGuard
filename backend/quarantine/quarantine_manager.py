"""
quarantine_manager.py  —  Moves suspicious files to an encrypted quarantine vault.
Uses AES-256-like XOR obfuscation (no real decryption needed for demo).
"""

import os, shutil, json, hashlib, base64
from datetime import datetime
from threading import Lock

QUARANTINE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "quarantine_vault")

class QuarantineManager:
    def __init__(self):
        os.makedirs(QUARANTINE_DIR, exist_ok=True)
        self._lock    = Lock()
        self._log_path = os.path.join(QUARANTINE_DIR, "quarantine_log.json")
        self._entries  = self._load_log()

    def quarantine(self, src_path: str, reason: str = "ML Detection") -> dict:
        """Move file to quarantine vault and log it."""
        if not os.path.exists(src_path):
            return {"error": f"File not found: {src_path}"}

        fname    = os.path.basename(src_path)
        file_hash = self._hash_file(src_path)
        ts        = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_name = f"{ts}_{file_hash[:8]}_{fname}.quarantined"
        dest_path = os.path.join(QUARANTINE_DIR, dest_name)

        try:
            shutil.move(src_path, dest_path)
            self._obfuscate(dest_path)
            entry = {
                "id":           len(self._entries) + 1,
                "original":     src_path,
                "quarantined":  dest_path,
                "filename":     fname,
                "hash_sha256":  file_hash,
                "reason":       reason,
                "timestamp":    datetime.now().isoformat(),
                "restored":     False,
            }
            with self._lock:
                self._entries.append(entry)
                self._save_log()
            return {"ok": True, **entry}
        except Exception as e:
            return {"error": str(e)}

    def list_quarantined(self):
        return self._entries

    def _hash_file(self, path):
        h = hashlib.sha256()
        try:
            with open(path,"rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    h.update(chunk)
        except Exception:
            pass
        return h.hexdigest()

    def _obfuscate(self, path):
        """Simple XOR obfuscation — sufficient for demo purposes."""
        try:
            with open(path,"rb") as f: data = f.read()
            obf = bytes(b ^ 0xAA for b in data)
            with open(path,"wb") as f: f.write(obf)
        except Exception:
            pass

    def _load_log(self):
        try:
            with open(self._log_path) as f:
                return json.load(f)
        except Exception:
            return []

    def _save_log(self):
        with open(self._log_path,"w") as f:
            json.dump(self._entries, f, indent=2)

quarantine_manager = QuarantineManager()