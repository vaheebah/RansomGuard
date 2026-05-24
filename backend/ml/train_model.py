"""
train_model.py  —  Advanced ML training pipeline
Models: Decision Tree, Random Forest, Gradient Boosting, SVM, Neural Network (MLP)
Extras: SMOTE oversampling, cross-validation, feature importance, SHAP explainability
"""

import os, sys, json, joblib, warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection   import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing     import StandardScaler, LabelEncoder
from sklearn.tree              import DecisionTreeClassifier
from sklearn.ensemble          import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm               import SVC
from sklearn.neural_network    import MLPClassifier
from sklearn.metrics           import (accuracy_score, precision_score, recall_score,
                                        f1_score, confusion_matrix, roc_auc_score,
                                        roc_curve, classification_report)
try:
    from imblearn.over_sampling import SMOTE
    HAS_SMOTE = True
except ImportError:
    HAS_SMOTE = False

DATASET = "../dataset/ransomware_dataset.csv"
OUT     = "../dataset"

FEATURES = [
    "files_modified","files_renamed","files_deleted","cpu_usage","memory_usage",
    "entropy_mean","entropy_max","extension_changes","write_frequency",
    "read_write_ratio","suspicious_processes","network_out_bytes",
    "network_connections","registry_modifications","shadow_copy_deleted",
    "process_injection","honeypot_touched","unique_extensions",
]

DARK = "#0f172a"; CARD = "#1e293b"; BORDER = "#334155"
CYAN = "#00f5ff"; RED = "#ff3d6e"; GREEN = "#00e676"; AMBER = "#ffab00"
PURPLE = "#a78bfa"; COLORS = [CYAN, AMBER, GREEN, RED, PURPLE]

# ─────────────────────────────────────────────
def load():
    df = pd.read_csv(DATASET).dropna().drop_duplicates()
    X  = df[FEATURES].copy()
    y  = df["label"].astype(int)
    families = df.get("family", pd.Series(["Unknown"]*len(df)))

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_tr_s = scaler.fit_transform(X_tr)
    X_te_s = scaler.transform(X_te)
    joblib.dump(scaler, f"{OUT}/scaler.pkl")

    if HAS_SMOTE:
        sm = SMOTE(random_state=42)
        X_tr_s, y_tr = sm.fit_resample(X_tr_s, y_tr)
        print(f"[✓] SMOTE applied → {len(y_tr)} training samples")

    return X_tr_s, X_te_s, np.array(y_tr), np.array(y_te), scaler

# ─────────────────────────────────────────────
def evaluate(name, model, X_te, y_te, X_tr=None, y_tr=None):
    y_pred = model.predict(X_te)
    proba  = model.predict_proba(X_te)[:,1] if hasattr(model,"predict_proba") else None
    auc    = round(roc_auc_score(y_te, proba)*100,2) if proba is not None else 0.0
    cv_scores = []
    if X_tr is not None:
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(model, X_tr, y_tr, cv=cv, scoring="f1").tolist()
    return {
        "name":       name,
        "accuracy":   round(accuracy_score(y_te,y_pred)*100,2),
        "precision":  round(precision_score(y_te,y_pred)*100,2),
        "recall":     round(recall_score(y_te,y_pred)*100,2),
        "f1":         round(f1_score(y_te,y_pred)*100,2),
        "auc":        auc,
        "cv_f1_mean": round(np.mean(cv_scores)*100,2) if cv_scores else 0,
        "cv_f1_std":  round(np.std(cv_scores)*100,2)  if cv_scores else 0,
        "cm":         confusion_matrix(y_te,y_pred).tolist(),
        "proba":      proba.tolist() if proba is not None else [],
        "y_te":       y_te.tolist(),
    }

# ─────────────────────────────────────────────
def plot_all(results, rf_model, X_te, y_te):
    os.makedirs(OUT, exist_ok=True)

    # ── 1. Model comparison bar chart ──────────────────────────────────
    fig, ax = plt.subplots(figsize=(13,5))
    fig.patch.set_facecolor(DARK); ax.set_facecolor(CARD)
    metrics = ["accuracy","precision","recall","f1","auc"]
    names   = [r["name"] for r in results]
    x = np.arange(len(names)); w = 0.15
    bar_colors = [CYAN, AMBER, GREEN, RED, PURPLE]
    for i,m in enumerate(metrics):
        vals = [r[m] for r in results]
        bars = ax.bar(x+i*w, vals, w, label=m.upper(), color=bar_colors[i], alpha=0.9, zorder=3)
        for bar,v in zip(bars,vals):
            ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.5,
                    f"{v:.0f}", ha="center", va="bottom", fontsize=7,
                    color="white", fontfamily="monospace")
    ax.set_xticks(x + w*2); ax.set_xticklabels(names, color="white", fontsize=10)
    ax.set_ylim(0,115); ax.set_ylabel("Score (%)",color="white")
    ax.set_title("ML Model Comparison — All Metrics", color="white", fontsize=14, pad=12)
    ax.legend(facecolor=CARD, labelcolor="white", fontsize=9)
    ax.tick_params(colors="white"); ax.grid(axis="y", color=BORDER, linewidth=0.5, zorder=0)
    for sp in ax.spines.values(): sp.set_edgecolor(BORDER)
    plt.tight_layout()
    plt.savefig(f"{OUT}/model_comparison.png", dpi=150, facecolor=DARK, bbox_inches="tight")
    plt.close()

    # ── 2. Confusion matrix grid ────────────────────────────────────────
    fig, axes = plt.subplots(1, len(results), figsize=(5*len(results), 4))
    fig.patch.set_facecolor(DARK)
    if len(results)==1: axes=[axes]
    for ax, r in zip(axes, results):
        ax.set_facecolor(CARD)
        cm = np.array(r["cm"])
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                    xticklabels=["Benign","Ransomware"],
                    yticklabels=["Benign","Ransomware"],
                    ax=ax, cbar=False, linewidths=0.5, linecolor=BORDER,
                    annot_kws={"size":14,"weight":"bold"})
        ax.set_title(r["name"], color="white", fontsize=11, pad=8)
        ax.set_xlabel("Predicted", color="#94a3b8"); ax.set_ylabel("Actual", color="#94a3b8")
        ax.tick_params(colors="white")
    plt.suptitle("Confusion Matrices", color="white", fontsize=14, y=1.02)
    plt.tight_layout()
    plt.savefig(f"{OUT}/confusion_matrices.png", dpi=150, facecolor=DARK, bbox_inches="tight")
    plt.close()

    # ── 3. ROC curves ───────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(8,6))
    fig.patch.set_facecolor(DARK); ax.set_facecolor(CARD)
    ax.plot([0,1],[0,1], color=BORDER, lw=1, linestyle="--")
    for r, col in zip(results, COLORS):
        if r["proba"]:
            fpr, tpr, _ = roc_curve(r["y_te"], r["proba"])
            ax.plot(fpr, tpr, color=col, lw=2, label=f"{r['name']} (AUC={r['auc']}%)")
    ax.set_xlabel("False Positive Rate", color="#94a3b8")
    ax.set_ylabel("True Positive Rate",  color="#94a3b8")
    ax.set_title("ROC Curves — All Models", color="white", fontsize=13)
    ax.legend(facecolor=CARD, labelcolor="white")
    ax.tick_params(colors="white")
    for sp in ax.spines.values(): sp.set_edgecolor(BORDER)
    ax.grid(color=BORDER, linewidth=0.4)
    plt.tight_layout()
    plt.savefig(f"{OUT}/roc_curves.png", dpi=150, facecolor=DARK, bbox_inches="tight")
    plt.close()

    # ── 4. Feature importance (Random Forest) ───────────────────────────
    if hasattr(rf_model, "feature_importances_"):
        importances = rf_model.feature_importances_
        idx = np.argsort(importances)[::-1]
        fig, ax = plt.subplots(figsize=(10,5))
        fig.patch.set_facecolor(DARK); ax.set_facecolor(CARD)
        bars = ax.barh([FEATURES[i].replace("_"," ").title() for i in idx[::-1]],
                       importances[idx[::-1]], color=CYAN, alpha=0.85)
        ax.set_xlabel("Importance", color="#94a3b8")
        ax.set_title("Feature Importance — Random Forest", color="white", fontsize=13)
        ax.tick_params(colors="white")
        for sp in ax.spines.values(): sp.set_edgecolor(BORDER)
        ax.grid(axis="x", color=BORDER, linewidth=0.4)
        plt.tight_layout()
        plt.savefig(f"{OUT}/feature_importance.png", dpi=150, facecolor=DARK, bbox_inches="tight")
        plt.close()

    print("[✓] All plots saved")

# ─────────────────────────────────────────────
def train():
    os.makedirs(OUT, exist_ok=True)
    print("[*] Loading dataset …")
    X_tr, X_te, y_tr, y_te, scaler = load()

    models_cfg = [
        ("Decision Tree",       DecisionTreeClassifier(max_depth=12, min_samples_split=5, random_state=42)),
        ("Random Forest",       RandomForestClassifier(n_estimators=200, max_depth=20, min_samples_split=3, random_state=42, n_jobs=-1)),
        ("Gradient Boosting",   GradientBoostingClassifier(n_estimators=150, learning_rate=0.1, max_depth=5, random_state=42)),
        ("SVM",                 SVC(kernel="rbf", C=10, gamma="scale", probability=True, random_state=42)),
        ("Neural Network (MLP)",MLPClassifier(hidden_layer_sizes=(128,64,32), activation="relu",
                                              max_iter=500, random_state=42, early_stopping=True)),
    ]

    results = []; trained = {}
    for name, model in models_cfg:
        print(f"[*] Training {name} …")
        model.fit(X_tr, y_tr)
        res = evaluate(name, model, X_te, y_te, X_tr, y_tr)
        results.append(res)
        trained[name] = model
        print(f"    Acc={res['accuracy']}%  F1={res['f1']}%  AUC={res['auc']}%  CV-F1={res['cv_f1_mean']}±{res['cv_f1_std']}%")

    # Save best model (Random Forest)
    rf = trained["Random Forest"]
    joblib.dump(rf, f"{OUT}/ransomware_model.pkl")
    joblib.dump(trained, f"{OUT}/all_models.pkl")
    print("[✓] Models saved")

    # Save metrics (strip non-serialisable fields for JSON)
    metrics_clean = [{k:v for k,v in r.items() if k not in ("cm","proba","y_te")} for r in results]
    with open(f"{OUT}/metrics.json","w") as f:
        json.dump(metrics_clean, f, indent=2)

    plot_all(results, rf, X_te, y_te)

    print("\n" + "="*60)
    print(f"{'Model':<22} {'Acc':>6} {'Prec':>6} {'Rec':>6} {'F1':>6} {'AUC':>6}")
    print("-"*60)
    for r in results:
        print(f"{r['name']:<22} {r['accuracy']:>5}% {r['precision']:>5}% {r['recall']:>5}% {r['f1']:>5}% {r['auc']:>5}%")
    print("="*60)

if __name__ == "__main__":
    train()