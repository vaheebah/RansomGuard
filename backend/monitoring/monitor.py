"""
monitor.py  —  Advanced real-time folder monitor
Features: Watchdog events, entropy calculation, extension whitelist checking,
          honeypot detection, quarantine integration, rate limiting alerts.
"""

import os, time, math, threading, hashlib, struct
from collections import defaultdict, deque
from datetime import datetime

import psutil
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

SUSPICIOUS_EXTENSIONS = {
    ".locked",".encrypted",".enc",".crypto",".crypt",".zepto",
    ".cerber",".locky",".wnry",".wncry",".wcry",".zzzzz",
    ".cryptolocker",".crypz",".cryp1",".darkness",".kimcilware",
}

HONEYPOT_NAMES = {
    "00_HONEYPOT_DO_NOT_TOUCH.txt",
    "aaa_BAIT_FILE.docx",
    "zzz_MONITOR_FILE.pdf",
    "_CANARY_TOKEN_.txt",
}

class EntropyAnalyzer:
    @staticmethod
    def shannon(data: bytes) -> float:
        if not data:
            return 0.0
        freq = [0]*256
        for b in data:
            freq[b] += 1
        n = len(data)
        h = 0.0
        for f in freq:
            if f:
                p = f / n
                h -= p * math.log2(p)
        return round(h, 4)

    @staticmethod
    def file_entropy(path: str, sample_bytes: int = 4096) -> float:
        try:
            with open(path, "rb") as f:
                data = f.read(sample_bytes)
            return EntropyAnalyzer.shannon(data)
        except Exception:
            return 0.0


class BehaviorWindow:
    WINDOW_SEC = 15

    def __init__(self):
        self._lock          = threading.Lock()
        self.events         = deque()
        self.modified       = set()
        self.renamed        = set()
        self.deleted        = set()
        self.ext_changes    = set()
        self.entropies      = deque(maxlen=50)
        self.honeypot_hit   = False
        self.shadow_deleted = False
        self.proc_injection = False
        self.net_bytes_out  = 0.0
        self._net_counter   = psutil.net_io_counters()

    def add(self, etype: str, path: str, entropy: float = 0.0):
        now = time.time()
        with self._lock:
            self.events.append((now, etype, path))
            if etype == "modified":
                self.modified.add(path)
                if entropy > 0:
                    self.entropies.append(entropy)
            elif etype in ("renamed","moved"):
                self.renamed.add(path)
                ext = os.path.splitext(path)[1].lower()
                if ext in SUSPICIOUS_EXTENSIONS:
                    self.ext_changes.add(path)
            elif etype == "deleted":
                self.deleted.add(path)
            if os.path.basename(path) in HONEYPOT_NAMES:
                self.honeypot_hit = True
            self._purge(now)

    def _purge(self, now):
        cutoff = now - self.WINDOW_SEC
        while self.events and self.events[0][0] < cutoff:
            self.events.popleft()

    def extract_features(self) -> dict:
        now = time.time()
        with self._lock:
            self._purge(now)
            files_modified     = len(self.modified)
            files_renamed      = len(self.renamed)
            files_deleted      = len(self.deleted)
            ext_changes        = len(self.ext_changes)
            write_events       = sum(1 for _,e,_ in self.events if e=="modified")
            entropy_vals       = list(self.entropies)
            honeypot           = int(self.honeypot_hit)
            shadow_del         = int(self.shadow_deleted)
            proc_inj           = int(self.proc_injection)

            # Reset accumulators
            self.modified.clear(); self.renamed.clear()
            self.deleted.clear();  self.ext_changes.clear()
            self.honeypot_hit   = False
            self.shadow_deleted = False

        cpu_usage  = psutil.cpu_percent(interval=0.3)
        mem_usage  = psutil.virtual_memory().percent
        susp_procs = _count_suspicious_processes()
        net_out    = _net_bytes_out()
        net_conns  = len(psutil.net_connections())

        read_write_ratio = max(0.01, files_modified / max(write_events, 1))

        return {
            "files_modified":        files_modified,
            "files_renamed":         files_renamed,
            "files_deleted":         files_deleted,
            "cpu_usage":             round(cpu_usage, 1),
            "memory_usage":          round(mem_usage, 1),
            "entropy_mean":          round(sum(entropy_vals)/len(entropy_vals), 3) if entropy_vals else 0.0,
            "entropy_max":           round(max(entropy_vals), 3) if entropy_vals else 0.0,
            "extension_changes":     ext_changes,
            "write_frequency":       float(write_events),
            "read_write_ratio":      round(read_write_ratio, 3),
            "suspicious_processes":  susp_procs,
            "network_out_bytes":     net_out,
            "network_connections":   net_conns,
            "registry_modifications":0,
            "shadow_copy_deleted":   shadow_del,
            "process_injection":     proc_inj,
            "honeypot_touched":      honeypot,
            "unique_extensions":     ext_changes,
        }


def _count_suspicious_processes():
    SUSPECT = {"vssadmin","bcdedit","wbadmin","cipher","rar","7z","taskkill","wmic"}
    count = 0
    try:
        for p in psutil.process_iter(["name"]):
            if p.info["name"] and p.info["name"].lower().split(".")[0] in SUSPECT:
                count += 1
    except Exception:
        pass
    return count

_prev_net = None
def _net_bytes_out():
    global _prev_net
    try:
        cur = psutil.net_io_counters()
        if _prev_net is None:
            _prev_net = cur
            return 0.0
        sent = float(cur.bytes_sent - _prev_net.bytes_sent)
        _prev_net = cur
        return max(0.0, sent)
    except Exception:
        return 0.0


class RansomwareEventHandler(FileSystemEventHandler):
    def __init__(self, window: BehaviorWindow, log_fn):
        self.window = window
        self.log    = log_fn
        self.analyzer = EntropyAnalyzer()

    def on_modified(self, event):
        if event.is_directory: return
        ent = self.analyzer.file_entropy(event.src_path)
        self.window.add("modified", event.src_path, ent)
        severity = "HIGH" if ent > 7.0 else "INFO"
        self.log("MODIFIED", event.src_path, severity=severity,
                 extra={"entropy": round(ent,3)})

    def on_created(self, event):
        if event.is_directory: return
        self.window.add("created", event.src_path)
        self.log("CREATED", event.src_path)

    def on_deleted(self, event):
        if event.is_directory: return
        self.window.add("deleted", event.src_path)
        self.log("DELETED", event.src_path, severity="WARN")

    def on_moved(self, event):
        if event.is_directory: return
        dest = event.dest_path
        ext  = os.path.splitext(dest)[1].lower()
        sev  = "CRITICAL" if ext in SUSPICIOUS_EXTENSIONS else "WARN"
        self.window.add("renamed", dest)
        self.log("RENAMED", f"{event.src_path} → {dest}", severity=sev,
                 extra={"new_ext": ext})


class FolderMonitor:
    MAX_LOGS = 500

    def __init__(self):
        self.window   = BehaviorWindow()
        self.observer = None
        self.running  = False
        self.folder   = None
        self.logs     = deque(maxlen=self.MAX_LOGS)
        self._lock    = threading.Lock()
        self._honeypot_paths = []

    def start(self, folder: str):
        if self.running: self.stop()
        os.makedirs(folder, exist_ok=True)
        self.folder = folder
        self._deploy_honeypots(folder)
        handler       = RansomwareEventHandler(self.window, self._add_log)
        self.observer = Observer()
        self.observer.schedule(handler, folder, recursive=True)
        self.observer.start()
        self.running = True
        self._add_log("SYSTEM", f"Monitoring started → {folder}", severity="INFO")

    def stop(self):
        self._remove_honeypots()
        if self.observer:
            self.observer.stop(); self.observer.join(); self.observer = None
        self.running = False
        self._add_log("SYSTEM", "Monitoring stopped", severity="INFO")

    def get_features(self):
        return self.window.extract_features()

    def get_logs(self, limit=80):
        with self._lock:
            return list(reversed(list(self.logs)))[:limit]

    def get_status(self):
        return {"running": self.running, "folder": self.folder or ""}

    def _add_log(self, etype, message, severity="INFO", extra=None):
        entry = {
            "timestamp":  datetime.now().strftime("%H:%M:%S"),
            "event_type": etype,
            "message":    message,
            "severity":   severity,
            "extra":      extra or {},
        }
        with self._lock:
            self.logs.append(entry)

    def _deploy_honeypots(self, folder):
        """Plant bait files. Any access = immediate ransomware indicator."""
        self._honeypot_paths = []
        for name in list(HONEYPOT_NAMES)[:3]:
            p = os.path.join(folder, name)
            try:
                with open(p, "w") as f:
                    f.write("HONEYPOT — DO NOT MODIFY — Monitored by RansomGuard\n")
                self._honeypot_paths.append(p)
            except Exception:
                pass
        if self._honeypot_paths:
            self._add_log("SYSTEM",
                f"Deployed {len(self._honeypot_paths)} honeypot files", severity="INFO")

    def _remove_honeypots(self):
        for p in self._honeypot_paths:
            try:
                os.remove(p)
            except Exception:
                pass
        self._honeypot_paths = []


monitor = FolderMonitor()