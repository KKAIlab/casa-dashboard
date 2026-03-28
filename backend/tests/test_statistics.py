import pandas as pd
import numpy as np
from core.statistics import compute_baseline_stats, compute_cluster_proportions, compute_group_comparison


def test_compute_baseline_stats(sample_cleaned_df):
    stats = compute_baseline_stats(sample_cleaned_df)
    assert isinstance(stats, dict)
    mice = sample_cleaned_df["Mouse"].unique()
    for mouse in mice:
        assert mouse in stats
        assert "VCL_mean" in stats[mouse]
        assert "VCL_std" in stats[mouse]
        assert "n" in stats[mouse]


def test_compute_cluster_proportions(sample_tsne_df):
    props = compute_cluster_proportions(sample_tsne_df)
    assert isinstance(props, pd.DataFrame)
    assert "Mouse" in props.columns
    cluster_cols = [c for c in props.columns if c != "Mouse"]
    for _, row in props.iterrows():
        assert abs(row[cluster_cols].sum() - 100.0) < 0.1


def test_compute_group_comparison():
    np.random.seed(42)
    df = pd.DataFrame({
        "VCL": np.concatenate([np.random.normal(200, 50, 50), np.random.normal(180, 50, 50)]),
        "Group": ["WT"] * 50 + ["KO"] * 50,
    })
    result = compute_group_comparison(df, "VCL", "WT", "KO")
    assert "t_stat" in result
    assert "p_value" in result
    assert isinstance(result["p_value"], float)
