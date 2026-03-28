import pytest
import pandas as pd
import numpy as np
import tempfile
import os


@pytest.fixture
def sample_raw_csv_shift_jis(tmp_path):
    """Create a sample CASA CSV in Shift-JIS encoding with Japanese columns."""
    data = {
        "番号": [1, 2, 3, 4, 5],
        "種別": [99, 99, 1, 99, 9],
        "座標数": [60, 55, 60, 58, 60],
        "有効性": [1, 1, 1, 1, 1],
        "直線速度[μm/秒]": [80.5, 65.2, 10.0, 90.1, 5.0],
        "曲線速度[μm/秒]": [210.3, 180.5, 20.0, 250.7, 15.0],
        "平均速度[μm/秒]": [120.1, 100.3, 15.0, 140.2, 8.0],
        "直進性": [0.67, 0.65, 0.50, 0.72, 0.33],
        "直線性": [0.38, 0.36, 0.50, 0.36, 0.33],
        "頭部振幅[μm]": [4.5, 3.8, 1.0, 5.2, 0.5],
        "頭部振動数[Hz]": [10.2, 8.5, 2.0, 12.1, 1.0],
        "曲線性": [0.57, 0.56, 0.75, 0.56, 0.53],
    }
    df = pd.DataFrame(data)
    filepath = tmp_path / "Motility1.csv"
    df.to_csv(filepath, index=False, encoding="shift_jis")
    return filepath


@pytest.fixture
def sample_raw_csv_utf8(tmp_path):
    """Create a sample CASA CSV in UTF-8 encoding."""
    data = {
        "番号": [1, 2, 3],
        "種別": [99, 99, 99],
        "座標数": [60, 55, 60],
        "有効性": [1, 1, 1],
        "直線速度[μm/秒]": [80.5, 65.2, 90.1],
        "曲線速度[μm/秒]": [210.3, 180.5, 250.7],
        "平均速度[μm/秒]": [120.1, 100.3, 140.2],
        "直進性": [0.67, 0.65, 0.72],
        "直線性": [0.38, 0.36, 0.36],
        "頭部振幅[μm]": [4.5, 3.8, 5.2],
        "頭部振動数[Hz]": [10.2, 8.5, 12.1],
        "曲線性": [0.57, 0.56, 0.56],
    }
    df = pd.DataFrame(data)
    filepath = tmp_path / "Motility1.csv"
    df.to_csv(filepath, index=False, encoding="utf-8")
    return filepath


@pytest.fixture
def sample_cleaned_df():
    """Sample cleaned sperm data (post-preprocessing)."""
    np.random.seed(42)
    n = 100
    return pd.DataFrame({
        "VCL": np.random.normal(210, 60, n),
        "VSL": np.random.normal(75, 35, n),
        "VAP": np.random.normal(120, 40, n),
        "LIN": np.random.uniform(0.2, 0.8, n),
        "STR": np.random.uniform(0.3, 0.9, n),
        "WOB": np.random.uniform(0.3, 0.8, n),
        "ALH": np.random.normal(4.5, 1.5, n),
        "BCF": np.random.normal(10, 3, n),
        "Mouse": np.random.choice(["Het_01", "Het_02", "Het_03"], n),
        "Field": np.random.choice([1, 2, 3, 4], n),
        "Group": "Het",
    })


@pytest.fixture
def sample_tsne_df(sample_cleaned_df):
    """Sample data with t-SNE coordinates and cluster labels."""
    df = sample_cleaned_df.copy()
    np.random.seed(42)
    df["tSNE1"] = np.random.normal(0, 10, len(df))
    df["tSNE2"] = np.random.normal(0, 10, len(df))
    df["Cluster"] = np.random.choice([0, 1, 2, 3, 4], len(df))
    return df
