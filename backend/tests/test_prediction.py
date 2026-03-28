import numpy as np
import pandas as pd
from core.prediction import cluster_proportion_classify, landscape_density_score


def test_cluster_proportion_classify():
    sample_proportions = np.array([20.0, 15.0, 25.0, 10.0, 30.0])

    reference_fertile = pd.DataFrame({
        0: [18, 22, 20],
        1: [14, 16, 15],
        2: [26, 24, 25],
        3: [12, 8, 10],
        4: [30, 30, 30],
        "label": ["fertile", "fertile", "fertile"],
    })
    reference_subfertile = pd.DataFrame({
        0: [35, 30, 32],
        1: [25, 28, 26],
        2: [10, 12, 11],
        3: [20, 18, 19],
        4: [10, 12, 12],
        "label": ["subfertile", "subfertile", "subfertile"],
    })
    reference = pd.concat([reference_fertile, reference_subfertile], ignore_index=True)

    result = cluster_proportion_classify(sample_proportions, reference)
    assert result["prediction"] in ("fertile", "subfertile")
    assert 0.0 <= result["probability"] <= 1.0


def test_landscape_density_score():
    np.random.seed(42)
    sample_coords = np.random.randn(100, 2)
    ref_coords = np.random.randn(200, 2) * 1.1

    result = landscape_density_score(sample_coords, ref_coords)
    assert 0.0 <= result["similarity_score"] <= 100.0
    assert "js_divergence" in result
