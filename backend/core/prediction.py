"""Fertility prediction models (Fernandez-Lopez et al. 2022).

Model A: Cluster proportion classifier (Logistic Regression)
Model B: Landscape density scoring (KDE + JS divergence)
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from scipy.stats import gaussian_kde
from scipy.spatial.distance import jensenshannon


def cluster_proportion_classify(sample_proportions: np.ndarray, reference_df: pd.DataFrame) -> dict:
    """Model A: Classify sample as fertile/subfertile based on cluster proportions."""
    cluster_cols = [c for c in reference_df.columns if c != "label"]
    X_ref = reference_df[cluster_cols].values
    y_ref = reference_df["label"].values

    clf = LogisticRegression(random_state=42, max_iter=1000)
    clf.fit(X_ref, y_ref)

    sample = sample_proportions.reshape(1, -1)
    prediction = clf.predict(sample)[0]
    probas = clf.predict_proba(sample)[0]
    pred_idx = list(clf.classes_).index(prediction)

    return {
        "prediction": str(prediction),
        "probability": float(probas[pred_idx]),
        "class_probabilities": {
            str(cls): float(p) for cls, p in zip(clf.classes_, probas)
        },
    }


def landscape_density_score(sample_coords: np.ndarray, reference_coords: np.ndarray, grid_size: int = 100) -> dict:
    """Model B: Score sample similarity to reference population in t-SNE space."""
    all_coords = np.vstack([sample_coords, reference_coords])
    x_min, y_min = all_coords.min(axis=0) - 1
    x_max, y_max = all_coords.max(axis=0) + 1

    x_grid = np.linspace(x_min, x_max, grid_size)
    y_grid = np.linspace(y_min, y_max, grid_size)
    xx, yy = np.meshgrid(x_grid, y_grid)
    grid_points = np.vstack([xx.ravel(), yy.ravel()])

    kde_sample = gaussian_kde(sample_coords.T)
    density_sample = kde_sample(grid_points)
    density_sample = density_sample / density_sample.sum()

    kde_ref = gaussian_kde(reference_coords.T)
    density_ref = kde_ref(grid_points)
    density_ref = density_ref / density_ref.sum()

    js_div = float(jensenshannon(density_sample, density_ref) ** 2)
    similarity = (1.0 - js_div) * 100.0

    return {
        "similarity_score": float(max(0.0, min(100.0, similarity))),
        "js_divergence": js_div,
    }
