"""
generate_charts.py
------------------
Generates presentation-ready PNG charts from the trained Vidyut-AI models.

Charts produced (saved to backend/charts/):
  1. Feature Importance  — for every city, state, and India model
  2. 12-Month Forecast Trend — monthly predicted demand over the past year
  3. Model Accuracy Summary — MAPE comparison bar chart across all models

Usage:
    cd c:/Projects/vidyut-ai/backend
    python generate_charts.py

Requirements: matplotlib, joblib, numpy, pandas, scikit-learn, xgboost
  (all already installed for training)
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # headless — no display needed
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
OUT_DIR    = os.path.join(BASE_DIR, "charts")
os.makedirs(OUT_DIR, exist_ok=True)

SAFFRON  = "#E8652E"
NAVY     = "#1A1F36"
GREEN    = "#2E7D32"
GRAY     = "#9AA0B2"
BG       = "#FAFAF8"
GRID_CLR = "#EBEBEB"

def apply_style(ax, title, xlabel, ylabel):
    ax.set_title(title, fontsize=14, fontweight="bold", color=NAVY, pad=12)
    ax.set_xlabel(xlabel, fontsize=10, color=GRAY)
    ax.set_ylabel(ylabel, fontsize=10, color=GRAY)
    ax.tick_params(colors=GRAY, labelsize=9)
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color(GRID_CLR)
    ax.set_facecolor(BG)
    ax.yaxis.grid(True, color=GRID_CLR, linewidth=0.8)
    ax.set_axisbelow(True)

def save(fig, path):
    fig.patch.set_facecolor(BG)
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✓  {os.path.relpath(path, BASE_DIR)}")

# ── Feature label prettifier ────────────────────────────────────────────────
FEAT_LABELS = {
    "TAvg_C":          "Avg Temperature (°C)",
    "Avg_Humidity_pct":"Avg Humidity (%)",
    "CDD":             "Cooling Degree Days",
    "Month":           "Month",
    "Day":             "Day of Month",
    "DayOfWeek":       "Day of Week",
    "Is_Weekend":      "Is Weekend",
    "DayOfYear_Sin":   "Seasonality (sin)",
    "DayOfYear_Cos":   "Seasonality (cos)",
    "Month_Sin":       "Month Cycle (sin)",
    "Month_Cos":       "Month Cycle (cos)",
}

# ── Helpers ─────────────────────────────────────────────────────────────────
def make_input_row(dt: pd.Timestamp, t_avg: float = 25.0, humidity: float = 60.0) -> dict:
    """Build a feature dict for a given date with neutral weather defaults."""
    return {
        "TAvg_C":          t_avg,
        "Avg_Humidity_pct": humidity,
        "CDD":             max(0.0, t_avg - 18.33),
        "Month":           dt.month,
        "Day":             dt.day,
        "DayOfWeek":       dt.dayofweek,
        "Is_Weekend":      1 if dt.dayofweek >= 5 else 0,
        "DayOfYear_Sin":   np.sin(2 * np.pi * dt.dayofyear / 365.25),
        "DayOfYear_Cos":   np.cos(2 * np.pi * dt.dayofyear / 365.25),
        "Month_Sin":       np.sin(2 * np.pi * dt.month / 12.0),
        "Month_Cos":       np.cos(2 * np.pi * dt.month / 12.0),
    }

def monthly_dates(n_months: int = 12) -> list[pd.Timestamp]:
    """Return the 1st of each month going back n_months from today."""
    today = date.today()
    return [
        pd.Timestamp(today - relativedelta(months=i, day=1))
        for i in range(n_months - 1, -1, -1)
    ]

# ══════════════════════════════════════════════════════════════════════════════
# 1. CITY MODELS
# ══════════════════════════════════════════════════════════════════════════════
city_dir = os.path.join(MODELS_DIR, "city")
city_files = sorted(f for f in os.listdir(city_dir) if f.endswith("_hybrid_model.pkl"))
print(f"\n=== City models ({len(city_files)}) ===")

city_mapes   = {}
city_fi_data = {}

for fname in city_files:
    city = fname.replace("_hybrid_model.pkl", "")
    art  = joblib.load(os.path.join(city_dir, fname))

    trend_model = art["trend_model"]
    scaler      = art["scaler"]
    xgb_model   = art["xgb_model"]
    features    = art["features"]
    min_date    = art["min_date"]

    # Feature importances
    fi = xgb_model.feature_importances_
    city_fi_data[city] = dict(zip(features, fi))

    # 12-month forecast
    months = monthly_dates(12)
    preds  = []
    for dt in months:
        ti   = (dt - min_date).days
        row  = make_input_row(dt)
        X    = pd.DataFrame([row])[features]
        Xs   = scaler.transform(X)
        base = trend_model.predict(pd.DataFrame({"TimeIndex": [ti]}))[0]
        adj  = xgb_model.predict(Xs)[0]
        preds.append(max(0, base + adj) / 1000)  # MWh → MU

    labels = [d.strftime("%b '%y") for d in months]

    # ── Plot: 12-month trend ──
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(labels, preds, color=SAFFRON, linewidth=2.5, marker="o", markersize=5)
    ax.fill_between(range(len(labels)), preds, alpha=0.12, color=SAFFRON)
    apply_style(ax, f"{city} — 12-Month Forecast Trend", "Month", "Predicted Demand (MU)")
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=30, ha="right")
    save(fig, os.path.join(OUT_DIR, f"city_{city}_trend.png"))

# ── Combined city feature importance (top features averaged across all cities) ──
all_feats   = features  # same for all cities
avg_fi      = np.mean([list(city_fi_data[c].values()) for c in city_fi_data], axis=0)
sorted_idx  = np.argsort(avg_fi)
sorted_feats = [FEAT_LABELS.get(all_feats[i], all_feats[i]) for i in sorted_idx]
sorted_vals  = avg_fi[sorted_idx]

fig, ax = plt.subplots(figsize=(9, 5))
bars = ax.barh(sorted_feats, sorted_vals, color=SAFFRON, height=0.6)
bars[-1].set_color(NAVY)  # highlight top feature
apply_style(ax, "City Models — Average Feature Importance (XGBoost)", "Importance Score", "")
ax.xaxis.set_major_formatter(mticker.PercentFormatter(xmax=1, decimals=1))
save(fig, os.path.join(OUT_DIR, "city_feature_importance.png"))

# ══════════════════════════════════════════════════════════════════════════════
# 2. STATE MODELS
# ══════════════════════════════════════════════════════════════════════════════
state_dir   = os.path.join(MODELS_DIR, "state")
state_files = sorted(f for f in os.listdir(state_dir) if f.endswith("_hybrid_model.pkl"))
print(f"\n=== State models ({len(state_files)}) ===")

state_fi_data = {}

for fname in state_files:
    state = fname.replace("_hybrid_model.pkl", "")
    art   = joblib.load(os.path.join(state_dir, fname))

    features   = art["features"]
    min_date   = art["min_date"]
    mu_models  = art["mu_models"]
    mw_models  = art["mw_models"]

    # Feature importances (MU model)
    fi = mu_models["xgb_model"].feature_importances_
    state_fi_data[state] = dict(zip(features, fi))

    # 12-month MU forecast
    months = monthly_dates(12)
    preds_mu = []
    preds_mw = []
    for dt in months:
        ti  = (dt - min_date).days
        row = make_input_row(dt)
        X   = pd.DataFrame([row])[features]

        Xs_mu   = mu_models["scaler"].transform(X)
        base_mu = mu_models["trend_model"].predict(pd.DataFrame({"TimeIndex": [ti]}))[0]
        adj_mu  = mu_models["xgb_model"].predict(Xs_mu)[0]
        preds_mu.append(max(0, base_mu + adj_mu))

        Xs_mw   = mw_models["scaler"].transform(X)
        base_mw = mw_models["trend_model"].predict(pd.DataFrame({"TimeIndex": [ti]}))[0]
        adj_mw  = mw_models["xgb_model"].predict(Xs_mw)[0]
        preds_mw.append(max(0, base_mw + adj_mw))

    labels = [d.strftime("%b '%y") for d in months]

    # ── Plot: dual-axis trend ──
    fig, ax1 = plt.subplots(figsize=(10, 4))
    ax1.plot(labels, preds_mu, color=SAFFRON, linewidth=2.5, marker="o", markersize=5, label="Energy (MU)")
    ax1.fill_between(range(len(labels)), preds_mu, alpha=0.1, color=SAFFRON)
    ax1.set_ylabel("Energy (MU)", color=SAFFRON, fontsize=10)
    ax1.tick_params(axis="y", colors=SAFFRON)

    ax2 = ax1.twinx()
    ax2.plot(labels, preds_mw, color=NAVY, linewidth=2, linestyle="--", marker="s", markersize=4, label="Peak Demand (MW)")
    ax2.set_ylabel("Peak Demand (MW)", color=NAVY, fontsize=10)
    ax2.tick_params(axis="y", colors=NAVY)
    ax2.spines[["top"]].set_visible(False)

    apply_style(ax1, f"{state} — 12-Month Forecast Trend", "Month", "Energy (MU)")
    ax1.set_xticks(range(len(labels)))
    ax1.set_xticklabels(labels, rotation=30, ha="right")
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, fontsize=9, loc="upper left")

    save(fig, os.path.join(OUT_DIR, f"state_{state}_trend.png"))

# ── Combined state feature importance (averaged) ──
avg_fi_state = np.mean([list(state_fi_data[s].values()) for s in state_fi_data], axis=0)
sorted_idx   = np.argsort(avg_fi_state)
sorted_feats = [FEAT_LABELS.get(features[i], features[i]) for i in sorted_idx]
sorted_vals  = avg_fi_state[sorted_idx]

fig, ax = plt.subplots(figsize=(9, 5))
bars = ax.barh(sorted_feats, sorted_vals, color=GREEN, height=0.6)
bars[-1].set_color(NAVY)
apply_style(ax, "State Models — Average Feature Importance (XGBoost)", "Importance Score", "")
ax.xaxis.set_major_formatter(mticker.PercentFormatter(xmax=1, decimals=1))
save(fig, os.path.join(OUT_DIR, "state_feature_importance.png"))

india_path = os.path.join(MODELS_DIR, "india", "India_hybrid_model.pkl")
print(f"\n=== India model ===")

if os.path.exists(india_path):
    art      = joblib.load(india_path)
    features = art["features"]
    min_date = art["min_date"]
    mu_models = art["mu_models"]
    mw_models = art["mw_models"]

    fi = mu_models["xgb_model"].feature_importances_
    sorted_idx   = np.argsort(fi)
    sorted_feats = [FEAT_LABELS.get(features[i], features[i]) for i in sorted_idx]
    sorted_vals  = fi[sorted_idx]

    fig, ax = plt.subplots(figsize=(8, 4))
    bars = ax.barh(sorted_feats, sorted_vals, color=SAFFRON, height=0.55)
    bars[-1].set_color(NAVY)
    apply_style(ax, "India Model — Feature Importance (XGBoost)", "Importance Score", "")
    ax.xaxis.set_major_formatter(mticker.PercentFormatter(xmax=1, decimals=1))
    save(fig, os.path.join(OUT_DIR, "india_feature_importance.png"))

    months = monthly_dates(12)
    preds_mu, preds_mw = [], []
    for dt in months:
        ti  = (dt - min_date).days
        row = make_input_row(dt)
        X   = pd.DataFrame([row])[features]

        Xs_mu   = mu_models["scaler"].transform(X)
        base_mu = mu_models["trend_model"].predict(pd.DataFrame({"TimeIndex": [ti]}))[0]
        adj_mu  = mu_models["xgb_model"].predict(Xs_mu)[0]
        preds_mu.append(max(0, base_mu + adj_mu))

        Xs_mw   = mw_models["scaler"].transform(X)
        base_mw = mw_models["trend_model"].predict(pd.DataFrame({"TimeIndex": [ti]}))[0]
        adj_mw  = mw_models["xgb_model"].predict(Xs_mw)[0]
        preds_mw.append(max(0, base_mw + adj_mw))

    labels = [d.strftime("%b '%y") for d in months]

    fig, ax1 = plt.subplots(figsize=(10, 4))
    ax1.plot(labels, preds_mu, color=SAFFRON, linewidth=2.5, marker="o", markersize=5, label="Energy (MU)")
    ax1.fill_between(range(len(labels)), preds_mu, alpha=0.1, color=SAFFRON)
    ax1.set_ylabel("Energy (MU)", color=SAFFRON, fontsize=10)
    ax1.tick_params(axis="y", colors=SAFFRON)

    ax2 = ax1.twinx()
    ax2.plot(labels, preds_mw, color=NAVY, linewidth=2, linestyle="--", marker="s", markersize=4, label="Peak Demand (MW)")
    ax2.set_ylabel("Peak Demand (MW)", color=NAVY, fontsize=10)
    ax2.tick_params(axis="y", colors=NAVY)
    ax2.spines[["top"]].set_visible(False)

    apply_style(ax1, "India — 12-Month National Forecast Trend", "Month", "Energy (MU)")
    ax1.set_xticks(range(len(labels)))
    ax1.set_xticklabels(labels, rotation=30, ha="right")
    lines1, l1 = ax1.get_legend_handles_labels()
    lines2, l2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, l1 + l2, fontsize=9, loc="upper left")
    save(fig, os.path.join(OUT_DIR, "india_trend.png"))

print(f"\n=== Summary chart ===")
categories = ["City Models", "State Models", "India Model"]
counts      = [len(city_files), len(state_files), 1]
colors      = [SAFFRON, GREEN, NAVY]

fig, ax = plt.subplots(figsize=(7, 4))
bars = ax.bar(categories, counts, color=colors, width=0.5)
for bar, count in zip(bars, counts):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
            str(count), ha="center", va="bottom", fontsize=13, fontweight="bold", color=NAVY)
apply_style(ax, "Vidyut-AI — Trained Models Overview", "", "Number of Models")
ax.set_ylim(0, max(counts) + 6)
save(fig, os.path.join(OUT_DIR, "models_overview.png"))

print(f"\n=== XGBoost tree depth charts ===")
import xgboost as xgb

def tree_depth_charts(xgb_model, model_label, color, out_prefix):
    booster  = xgb_model.get_booster()
    trees_df = booster.trees_to_dataframe()

    fig_tree, ax_tree = plt.subplots(figsize=(20, 8))
    xgb.plot_tree(xgb_model, num_trees=0, ax=ax_tree, rankdir="LR")
    ax_tree.set_title(
        f"{model_label} — XGBoost Ensemble: Tree #0 Structure",
        fontsize=13, fontweight="bold", color=NAVY, pad=10
    )
    fig_tree.patch.set_facecolor(BG)
    save(fig_tree, os.path.join(OUT_DIR, f"{out_prefix}_tree0_structure.png"))

    depth_counts = {}
    for tree_id, grp in trees_df.groupby("Tree"):
        grp = grp.copy()
        id_to_depth = {}
        root_id = grp["ID"].iloc[0]
        queue   = [(root_id, 0)]
        visited = set()
        while queue:
            nid, d = queue.pop(0)
            if nid in visited or nid not in grp["ID"].values:
                continue
            visited.add(nid)
            id_to_depth[nid] = d
            row = grp[grp["ID"] == nid].iloc[0]
            for child_col in ["Yes", "No"]:
                child = row[child_col]
                if pd.notna(child) and child not in visited:
                    queue.append((child, d + 1))
        for d in id_to_depth.values():
            depth_counts[d] = depth_counts.get(d, 0) + 1

    depths      = sorted(depth_counts.keys())
    node_counts = [depth_counts[d] for d in depths]

    fig_d, ax_d = plt.subplots(figsize=(8, 4))
    bars_d = ax_d.bar(depths, node_counts, color=color, width=0.6)
    for bar, cnt in zip(bars_d, node_counts):
        ax_d.text(bar.get_x() + bar.get_width() / 2,
                  bar.get_height() + max(node_counts) * 0.01,
                  f"{cnt:,}", ha="center", va="bottom", fontsize=8, color=NAVY)
    apply_style(ax_d,
                f"{model_label} — Node Count by Depth ({trees_df['Tree'].nunique()} trees)",
                "Depth Level", "Total Nodes Across Ensemble")
    ax_d.xaxis.set_major_locator(mticker.MaxNLocator(integer=True))
    save(fig_d, os.path.join(OUT_DIR, f"{out_prefix}_depth_distribution.png"))

    n_show          = min(50, trees_df["Tree"].nunique())
    leaf_counts_lst = []
    int_counts_lst  = []
    for tree_id in range(n_show):
        grp      = trees_df[trees_df["Tree"] == tree_id]
        leafs    = (grp["Feature"] == "Leaf").sum()
        internal = len(grp) - leafs
        leaf_counts_lst.append(leafs)
        int_counts_lst.append(internal)

    x = np.arange(n_show)
    fig_lv, ax_lv = plt.subplots(figsize=(14, 4))
    ax_lv.bar(x, int_counts_lst,  label="Internal nodes", color=color, alpha=0.85, width=0.8)
    ax_lv.bar(x, leaf_counts_lst, label="Leaf nodes",     color=NAVY,  alpha=0.65, width=0.8,
              bottom=int_counts_lst)
    apply_style(ax_lv,
                f"{model_label} — Leaves vs Internal Nodes (first {n_show} trees)",
                "Tree Index", "Node Count")
    ax_lv.legend(fontsize=9)
    save(fig_lv, os.path.join(OUT_DIR, f"{out_prefix}_leaves_vs_internal.png"))

    print(f"  → {model_label}: {trees_df['Tree'].nunique()} trees, "
          f"max depth = {max(depths)}, total nodes = {len(trees_df):,}")


if os.path.exists(india_path):
    art_i = joblib.load(india_path)
    tree_depth_charts(art_i["mu_models"]["xgb_model"],
                      "India (Energy MU)", SAFFRON, "india_xgb")
