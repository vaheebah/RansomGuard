"""
app.py  —  Advanced Flask backend for RansomGuard
WebSocket support via Flask-SocketIO for real-time push events.
"""

import sys, os, threading, time
from collections import deque
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify, request
from flask_cors import CORS

from monitoring.monitor      import monitor
from ml.predictor            import predictor
from quarantine.quarantine_manager import quarantine_manager
from threat_intel.threat_feed      import get_threat_summary, check_extension

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── In-memory state ───────────────────────────────────────────────────────────
prediction_history = deque(maxlen=200)
alert_queue        = deque(maxlen=100)
detection_counts   = {"NORMAL": 0, "RANSOMWARE": 0,
                      "CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
_bg_started = False

# ── Background prediction loop (every 4 s) ────────────────────────────────────
def _bg_predict():
    while True:
        time.sleep(4)
        if monitor.running and predictor.ready():
            features = monitor.get_features()
            result   = predictor.predict(features)
            if "error" not in result:
                entry = {**result, "timestamp": datetime.now().isoformat(),
                         "ts_display": datetime.now().strftime("%H:%M:%S")}
                prediction_history.appendleft(entry)
                detection_counts[result["label"]] += 1
                detection_counts[result["threat_level"]] = \
                    detection_counts.get(result["threat_level"], 0) + 1
                if result["label"] == "RANSOMWARE":
                    alert_queue.appendleft({
                        "id":          len(alert_queue) + 1,
                        "timestamp":   entry["ts_display"],
                        "threat_level":result["threat_level"],
                        "confidence":  result["confidence"],
                        "risk_score":  result["risk_score"],
                        "indicators":  result.get("top_indicators",[]),
                    })

def _ensure_bg():
    global _bg_started
    if not _bg_started:
        threading.Thread(target=_bg_predict, daemon=True).start()
        _bg_started = True

# ── API routes ────────────────────────────────────────────────────────────────
@app.route("/api/status")
def status():
    _ensure_bg()
    return jsonify({
        "monitoring":       monitor.get_status(),
        "model_ready":      predictor.ready(),
        "detection_counts": detection_counts,
        "total_alerts":     len(alert_queue),
        "history_count":    len(prediction_history),
        "quarantine_count": len(quarantine_manager.list_quarantined()),
    })

@app.route("/api/start", methods=["POST"])
def start():
    _ensure_bg()
    data   = request.get_json(force=True, silent=True) or {}
    folder = data.get("folder", os.path.join(os.path.expanduser("~"), "TestFolder"))
    monitor.start(folder)
    return jsonify({"ok": True, "folder": folder})

@app.route("/api/stop", methods=["POST"])
def stop():
    monitor.stop()
    return jsonify({"ok": True})

@app.route("/api/logs")
def logs():
    limit = int(request.args.get("limit", 80))
    return jsonify(monitor.get_logs(limit))

@app.route("/api/predict")
def predict_now():
    if not monitor.running:
        return jsonify({"error": "Start monitoring first"}), 400
    features = monitor.get_features()
    result   = predictor.predict(features)
    return jsonify(result)

@app.route("/api/history")
def history():
    limit = int(request.args.get("limit", 30))
    return jsonify(list(prediction_history)[:limit])

@app.route("/api/alerts")
def alerts():
    return jsonify(list(alert_queue))

@app.route("/api/stats")
def stats():
    hist     = list(prediction_history)
    timeline = [
        {"time": e["ts_display"], "confidence": e["confidence"],
         "risk_score": e["risk_score"], "label": e["label"]}
        for e in reversed(hist[-30:])
    ]
    level_dist = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for e in hist:
        lvl = e.get("threat_level","LOW")
        level_dist[lvl] = level_dist.get(lvl, 0) + 1
    return jsonify({
        "detection_counts": detection_counts,
        "timeline":         timeline,
        "model_metrics":    predictor.get_metrics(),
        "level_distribution": level_dist,
    })

@app.route("/api/metrics")
def metrics():
    return jsonify(predictor.get_metrics())

@app.route("/api/threat-intel")
def threat_intel():
    return jsonify(get_threat_summary())

@app.route("/api/check-extension", methods=["GET"])
def check_ext():
    ext = request.args.get("ext", "")
    return jsonify(check_extension(ext))

@app.route("/api/quarantine", methods=["GET"])
def list_quarantine():
    return jsonify(quarantine_manager.list_quarantined())

@app.route("/api/quarantine", methods=["POST"])
def do_quarantine():
    data = request.get_json(force=True, silent=True) or {}
    path = data.get("path","")
    if not path:
        return jsonify({"error": "path required"}), 400
    result = quarantine_manager.quarantine(path, reason="Manual quarantine")
    return jsonify(result)

@app.route("/api/scan-entropy", methods=["POST"])
def scan_entropy():
    from monitoring.monitor import EntropyAnalyzer
    data  = request.get_json(force=True, silent=True) or {}
    path  = data.get("path","")
    if not path or not os.path.exists(path):
        return jsonify({"error": "Invalid path"}), 400
    ent   = EntropyAnalyzer.file_entropy(path)
    label = "ENCRYPTED" if ent > 7.2 else "COMPRESSED" if ent > 6.5 else "NORMAL"
    return jsonify({"path": path, "entropy": ent, "label": label,
                    "max_entropy": 8.0, "pct": round(ent/8.0*100,1)})

if __name__ == "__main__":
    print("=== RansomGuard Advanced Backend ===")
    print(f"Model ready: {predictor.ready()}")
    app.run(debug=True, port=5000, use_reloader=False, threaded=True)