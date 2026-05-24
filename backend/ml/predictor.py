"""
predictor.py  —  Loads all trained models, runs ensemble prediction,
                 computes confidence score, and explains predictions.
"""

import os, json, joblib
import numpy as np

BASE = os.path.join(os.path.dirname(__file__), "..", "dataset")

FEATURES = [
    "files_modified","files_renamed","files_deleted","cpu_usage","memory_usage",
    "entropy_mean","entropy_max","extension_changes","write_frequency",
    "read_write_ratio","suspicious_processes","network_out_bytes",
    "network_connections","registry_modifications","shadow_copy_deleted",
    "process_injection","honeypot_touched","unique_extensions",
]

RISK_WEIGHTS = {
    "honeypot_touched":      3.0,
    "shadow_copy_deleted":   3.0,
    "process_injection":     2.5,
    "entropy_max":           2.0,
    "extension_changes":     2.0,
    "files_renamed":         1.5,
    "write_frequency":       1.5,
    "suspicious_processes":  1.5,
    "files_modified":        1.0,
    "network_out_bytes":     1.0,
}

class Predictor:
    def __init__(self):
        self.model  = None
        self.scaler = None
        self.all_models = {}
        self._load()

    def _load(self):
        try:
            self.model      = joblib.load(f"{BASE}/ransomware_model.pkl")
            self.scaler     = joblib.load(f"{BASE}/scaler.pkl")
            try:
                self.all_models = joblib.load(f"{BASE}/all_models.pkl")
            except Exception:
                self.all_models = {"Random Forest": self.model}
            print(f"[✓] Predictor loaded ({len(self.all_models)} models)")
        except FileNotFoundError:
            print("[!] Model not found — run train_model.py first")

    def ready(self):
        return self.model is not None and self.scaler is not None

    def predict(self, features: dict) -> dict:
        if not self.ready():
            return {"error": "Model not loaded. Run train_model.py first."}

        row    = np.array([[features.get(f, 0) for f in FEATURES]], dtype=float)
        row_sc = self.scaler.transform(row)

        # Ensemble vote across all available models
        votes = []
        probas = {}
        for name, m in self.all_models.items():
            if hasattr(m, "predict_proba"):
                p = float(m.predict_proba(row_sc)[0][1])
                probas[name] = round(p * 100, 1)
                votes.append(1 if p >= 0.5 else 0)
            else:
                pred = int(m.predict(row_sc)[0])
                votes.append(pred)

        # Majority vote
        pred       = 1 if sum(votes) > len(votes) / 2 else 0
        rf_proba   = float(self.model.predict_proba(row_sc)[0][1])
        confidence = round(rf_proba * 100, 1)

        # Rule-based risk score (0-100)
        risk_score = self._rule_risk(features)

        # Combine ML + rule signals
        final_pred  = 1 if (pred == 1 or risk_score >= 70) else 0
        threat_level = (
            "CRITICAL" if confidence >= 85 or risk_score >= 85 else
            "HIGH"     if confidence >= 65 or risk_score >= 65 else
            "MEDIUM"   if confidence >= 40 or risk_score >= 40 else
            "LOW"
        )

        # Feature contribution explanation (simplified SHAP-like)
        explanation = self._explain(features, row_sc)

        return {
            "prediction":   final_pred,
            "label":        "RANSOMWARE" if final_pred == 1 else "NORMAL",
            "confidence":   confidence,
            "risk_score":   risk_score,
            "threat_level": threat_level,
            "ensemble_probas": probas,
            "top_indicators":  explanation,
            "features":     {k: round(float(v), 3) for k, v in features.items()},
        }

    def _rule_risk(self, f: dict) -> float:
        score = 0.0
        # Hard indicators
        if f.get("honeypot_touched",0):      score += 35
        if f.get("shadow_copy_deleted",0):   score += 30
        if f.get("process_injection",0):     score += 20
        if f.get("entropy_max",0) >= 7.5:    score += 15
        if f.get("extension_changes",0) > 5: score += 10
        if f.get("files_renamed",0)    > 20: score += 10
        if f.get("write_frequency",0)  > 15: score += 8
        return min(score, 100)

    def _explain(self, features, row_sc):
        """Return top contributing features with direction."""
        indicators = []
        for feat, weight in sorted(RISK_WEIGHTS.items(), key=lambda x: -x[1]):
            val = features.get(feat, 0)
            if feat in ("honeypot_touched","shadow_copy_deleted","process_injection"):
                if val:
                    indicators.append({"feature": feat.replace("_"," ").title(),
                                       "value": val, "severity": "critical",
                                       "note": "Definitive ransomware indicator"})
            elif feat == "entropy_max" and val >= 7.0:
                indicators.append({"feature": "Max File Entropy",
                                   "value": round(val,3), "severity": "high",
                                   "note": f"Entropy {val:.2f}/8.0 — encrypted file signature"})
            elif feat == "extension_changes" and val > 3:
                indicators.append({"feature": "Extension Changes",
                                   "value": int(val), "severity": "high",
                                   "note": "Files renamed with new extensions"})
            elif feat == "files_renamed" and val > 10:
                indicators.append({"feature": "Files Renamed",
                                   "value": int(val), "severity": "medium",
                                   "note": "Bulk rename — encryption pattern"})
            elif feat == "write_frequency" and val > 10:
                indicators.append({"feature": "Write Frequency",
                                   "value": round(val,1), "severity": "medium",
                                   "note": "High disk write activity"})
        return indicators[:5]

    def get_metrics(self):
        try:
            with open(f"{BASE}/metrics.json") as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    def get_feature_names(self):
        return FEATURES

predictor = Predictor()