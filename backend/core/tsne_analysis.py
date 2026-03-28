"""t-SNE dimensionality reduction and K-means clustering.

Replicates the analysis from sperm_move_project/scripts/02_analysis/het_analysis_python.py
with fixed parameters from config.
"""

import numpy as np
import pandas as pd
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

from core.config import AnalysisConfig

CONFIG = AnalysisConfig()


def run_tsne(features: np.ndarray) -> tuple[np.ndarray, int]:
    """Run t-SNE with multiple perplexities, select best by KL divergence.

    Args:
        features: Raw feature array (n_samples, n_features). Will be standardized internally.

    Returns:
        (embedding, best_perplexity): 2D embedding and selected perplexity value.
    """
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)

    n_samples = len(features)
    candidate_perplexities = [ppx for ppx in CONFIG.TSNE_PERPLEXITIES if ppx < n_samples]

    # Fallback for very small datasets: use n_samples - 1 as minimum perplexity
    if not candidate_perplexities:
        candidate_perplexities = [max(1, n_samples - 1)]

    results = {}
    for ppx in candidate_perplexities:
        tsne_init = CONFIG.TSNE_INIT
        # PCA init requires n_components <= min(n_samples, n_features); use random for tiny sets
        if tsne_init == "pca" and n_samples <= 2:
            tsne_init = "random"

        tsne = TSNE(
            n_components=2,
            perplexity=ppx,
            random_state=CONFIG.RANDOM_STATE,
            max_iter=CONFIG.TSNE_MAX_ITER,
            learning_rate=CONFIG.TSNE_LEARNING_RATE,
            init=tsne_init,
        )
        embedding = tsne.fit_transform(X_scaled)
        results[ppx] = {
            "embedding": embedding,
            "kl_divergence": tsne.kl_divergence_,
        }

    best_ppx = min(results.keys(), key=lambda x: results[x]["kl_divergence"])
    return results[best_ppx]["embedding"], best_ppx


def run_clustering(embedding: np.ndarray) -> np.ndarray:
    """Run K-means clustering on t-SNE embedding.

    Returns:
        Cluster labels array (0 to N_CLUSTERS-1).
    """
    # Use at most n_samples clusters to avoid sklearn error on tiny datasets
    n_clusters = min(CONFIG.N_CLUSTERS, len(embedding))
    kmeans = KMeans(
        n_clusters=n_clusters,
        random_state=CONFIG.RANDOM_STATE,
        n_init=CONFIG.KMEANS_N_INIT,
    )
    return kmeans.fit_predict(embedding)


def run_tsne_pipeline(cleaned_df: pd.DataFrame) -> pd.DataFrame:
    """Full t-SNE + clustering pipeline on cleaned sperm data.

    Matches the logic from het_analysis_python.py:
    1. Extract TSNE_FEATURES columns
    2. Deduplicate
    3. Run t-SNE
    4. Run K-means on embedding
    5. Merge results back to original data via lookup key

    Returns:
        DataFrame with original columns + tSNE1, tSNE2, Cluster.
    """
    features = CONFIG.TSNE_FEATURES

    # Extract and deduplicate
    df_unique = cleaned_df[features].drop_duplicates().dropna().reset_index(drop=True)

    # Run t-SNE
    embedding, best_perplexity = run_tsne(df_unique.values)

    # Cluster on embedding
    cluster_labels = run_clustering(embedding)

    # Build lookup table
    df_unique["tSNE1"] = embedding[:, 0]
    df_unique["tSNE2"] = embedding[:, 1]
    df_unique["Cluster"] = cluster_labels
    df_unique["lookup_key"] = df_unique[features].apply(
        lambda x: "_".join(map(str, x)), axis=1
    )

    # Merge back to original
    result = cleaned_df.copy()
    result["lookup_key"] = result[features].apply(
        lambda x: "_".join(map(str, x)), axis=1
    )
    result = result.merge(
        df_unique[["lookup_key", "tSNE1", "tSNE2", "Cluster"]],
        on="lookup_key",
        how="left",
    ).dropna(subset=["tSNE1", "tSNE2"])

    return result
