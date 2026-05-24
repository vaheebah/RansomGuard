
"""
network_monitor.py  —  Passive network traffic analysis for ransomware C2 detection.
Uses psutil (no raw packet capture needed) to detect suspicious outbound patterns.
"""

import psutil, time, threading
from collections import defaultdict, deque
from datetime import datetime

SUSPICIOUS_PORTS = {
    445: "SMB (EternalBlue vector)",
    3389: "RDP brute force vector",
    4444: "Metasploit default",
    6881: "BitTorrent / P2P C2",
    9001: "Tor relay",
    9050: "Tor SOCKS proxy",
}

TOR_RANGES = ["10.0.0.0", "192.168.0.0"]  # Placeholder; real Tor exit node list would go here

class NetworkMonitor:
    """Monitors active connections and traffic volume for ransomware indicators."""

    def __init__(self):
        self._lock       = threading.Lock()
        self._history    = deque(maxlen=200)
        self._prev_io    = psutil.net_io_counters()
        self._running    = False
        self._thread     = None

    def start(self):
        self._running = True
        self._thread  = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _loop(self):
        while self._running:
            snap = self._snapshot()
            with self._lock:
                self._history.appendleft(snap)
            time.sleep(5)

    def _snapshot(self) -> dict:
        conns   = self._get_connections()
        io_curr = psutil.net_io_counters()
        sent_kb = max(0.0, (io_curr.bytes_sent - self._prev_io.bytes_sent) / 1024)
        recv_kb = max(0.0, (io_curr.bytes_recv - self._prev_io.bytes_recv) / 1024)
        self._prev_io = io_curr

        susp_conns = [c for c in conns if c.get("suspicious")]

        return {
            "timestamp":          datetime.now().strftime("%H:%M:%S"),
            "total_connections":  len(conns),
            "suspicious_conns":   len(susp_conns),
            "bytes_sent_kb":      round(sent_kb, 2),
            "bytes_recv_kb":      round(recv_kb, 2),
            "connections":        conns[:20],
            "susp_details":       susp_conns,
            "high_traffic":       sent_kb > 512,
        }

    def _get_connections(self):
        result = []
        try:
            for conn in psutil.net_connections(kind="inet"):
                if conn.status != "ESTABLISHED":
                    continue
                raddr = conn.raddr
                if not raddr:
                    continue
                port  = raddr.port
                susp_reason = SUSPICIOUS_PORTS.get(port)
                entry = {
                    "remote_ip":   raddr.ip,
                    "remote_port": port,
                    "local_port":  conn.laddr.port if conn.laddr else 0,
                    "suspicious":  susp_reason is not None,
                    "reason":      susp_reason or "",
                }
                result.append(entry)
        except (psutil.AccessDenied, PermissionError):
            pass
        return result

    def get_latest(self):
        with self._lock:
            return self._history[0] if self._history else {}

    def get_history(self, n=20):
        with self._lock:
            return list(self._history)[:n]

    def get_summary(self):
        snaps = self.get_history(10)
        if not snaps:
            return {"status": "no_data"}
        total_susp = sum(s["suspicious_conns"] for s in snaps)
        avg_sent   = sum(s["bytes_sent_kb"] for s in snaps) / len(snaps)
        return {
            "recent_suspicious_connections": total_susp,
            "avg_bytes_sent_kb":             round(avg_sent, 2),
            "high_traffic_detected":         any(s["high_traffic"] for s in snaps),
            "snapshots":                     len(snaps),
        }

network_monitor = NetworkMonitor()
