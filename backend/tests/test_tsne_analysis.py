import numpy as np
import pandas as pd
from core.tsne_analysis import run_tsne, run_clustering, run_tsne_pipeline


def test_run_tsne(sample_cleaned_df):
    features = sample_cleaned_df[["VCL", "VSL", "ALH", "BCF"]].drop_duplicates().dropna()
    embedding, perplexity = run_tsne(features.values)
    assert embedding.shape == (len(features), 2)
    assert perplexity in [5, 10, 30, 50, 100]


def test_run_clustering():
    np.random.seed(42)
    embedding = np.random.randn(50, 2)
    labels = run_clustering(embedding)
    assert len(labels) == 50
    assert set(labels).issubset({0, 1, 2, 3, 4})


def test_run_tsne_pipeline(sample_cleaned_df):
    result_df = run_tsne_pipeline(sample_cleaned_df)
    assert "tSNE1" in result_df.columns
    assert "tSNE2" in result_df.columns
    assert "Cluster" in result_df.columns
    assert len(result_df) <= len(sample_cleaned_df)
    assert result_df["Cluster"].nunique() <= 5
