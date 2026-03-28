"""Unified analysis pipeline: raw CSV -> preprocessing -> t-SNE -> statistics."""

import json
from pathlib import Path

import pandas as pd

from core.preprocessing import preprocess_multiple_files
from core.tsne_analysis import run_tsne_pipeline
from core.statistics import compute_baseline_stats, compute_cluster_proportions
from core.config import AnalysisConfig

CONFIG = AnalysisConfig()


def run_full_pipeline(file_configs: list[dict], output_dir: Path) -> dict:
    """Run the complete analysis pipeline."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Preprocessing
    cleaned_df = preprocess_multiple_files(file_configs)
    if cleaned_df is None or len(cleaned_df) == 0:
        return {"status": "error", "message": "No motile sperm found in uploaded files"}

    cleaned_df.to_csv(output_dir / "cleaned.csv", index=False)

    # Step 2: t-SNE + Clustering
    analyzed_df = run_tsne_pipeline(cleaned_df)
    analyzed_df.to_csv(output_dir / "analyzed.csv", index=False)

    # Step 3: Statistics
    baseline = compute_baseline_stats(cleaned_df)
    cluster_props = compute_cluster_proportions(analyzed_df)

    stats = {
        "baseline": baseline,
        "cluster_proportions": cluster_props.to_dict(orient="records"),
        "total_sperm": len(cleaned_df),
        "analyzed_sperm": len(analyzed_df),
    }
    with open(output_dir / "stats.json", "w") as f:
        json.dump(stats, f, indent=2, default=str)

    return {
        "status": "done",
        "total_sperm": len(cleaned_df),
        "analyzed_sperm": len(analyzed_df),
        "output_dir": str(output_dir),
    }


def import_processed_data(csv_path: Path) -> dict:
    """Import a pre-processed CSV and detect what columns are available."""
    csv_path = Path(csv_path)
    df = pd.read_csv(csv_path)

    has_tsne = "tSNE1" in df.columns and "tSNE2" in df.columns
    has_clusters = "Cluster" in df.columns

    return {
        "has_tsne": has_tsne,
        "has_clusters": has_clusters,
        "n_rows": len(df),
        "columns": list(df.columns),
        "df": df,
    }
