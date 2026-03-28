"""Descriptive statistics, cluster proportions, and group comparisons."""

import pandas as pd
import numpy as np
from scipy import stats as scipy_stats

from core.config import AnalysisConfig

CONFIG = AnalysisConfig()


def compute_baseline_stats(cleaned_df: pd.DataFrame) -> dict:
    """Compute mean/std for each CASA parameter, grouped by Mouse."""
    params = CONFIG.ALL_CASA_PARAMS
    result = {}
    for mouse, group_df in cleaned_df.groupby("Mouse"):
        entry = {"n": len(group_df)}
        for param in params:
            if param in group_df.columns:
                entry[f"{param}_mean"] = float(group_df[param].mean())
                entry[f"{param}_std"] = float(group_df[param].std())
        result[mouse] = entry
    return result


def compute_cluster_proportions(tsne_df: pd.DataFrame) -> pd.DataFrame:
    """Compute cluster proportion (%) for each mouse."""
    ct = tsne_df.groupby(["Mouse", "Cluster"]).size().unstack(fill_value=0)
    proportions = ct.div(ct.sum(axis=1), axis=0) * 100
    proportions = proportions.reset_index()
    proportions.columns = ["Mouse"] + [int(c) for c in proportions.columns[1:]]
    return proportions


def compute_group_comparison(df: pd.DataFrame, param: str, group_a: str, group_b: str) -> dict:
    """Welch's t-test comparing a parameter between two groups."""
    a = df.loc[df["Group"] == group_a, param].dropna()
    b = df.loc[df["Group"] == group_b, param].dropna()
    t_stat, p_value = scipy_stats.ttest_ind(a, b, equal_var=False)
    return {
        "param": param, "group_a": group_a, "group_b": group_b,
        "group_a_mean": float(a.mean()), "group_a_std": float(a.std()), "group_a_n": len(a),
        "group_b_mean": float(b.mean()), "group_b_std": float(b.std()), "group_b_n": len(b),
        "t_stat": float(t_stat), "p_value": float(p_value),
    }
