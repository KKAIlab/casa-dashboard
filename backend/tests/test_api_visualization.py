import io
import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from database import Base, engine
import models.db_models  # noqa: F401 — ensures tables are registered with Base


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


client = TestClient(app)


def _create_analyzed_dataset():
    np.random.seed(42)
    n = 50
    data = {
        "VCL": np.random.normal(210, 60, n).tolist(),
        "VSL": np.random.normal(75, 35, n).tolist(),
        "VAP": np.random.normal(120, 40, n).tolist(),
        "LIN": np.random.uniform(0.2, 0.8, n).tolist(),
        "STR": np.random.uniform(0.3, 0.9, n).tolist(),
        "WOB": np.random.uniform(0.3, 0.8, n).tolist(),
        "ALH": np.random.normal(4.5, 1.5, n).tolist(),
        "BCF": np.random.normal(10, 3, n).tolist(),
        "Mouse": (["Het_01"] * 25 + ["Het_02"] * 25),
        "Group": ["Het"] * n,
        "tSNE1": np.random.normal(0, 10, n).tolist(),
        "tSNE2": np.random.normal(0, 10, n).tolist(),
        "Cluster": np.random.choice([0, 1, 2, 3, 4], n).tolist(),
    }
    df = pd.DataFrame(data)
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    resp = client.post(
        "/api/import", data={"name": "viz_test", "genotype": "Het"},
        files={"file": ("data.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    return resp.json()["id"]


def test_get_tsne_chart_data():
    dataset_id = _create_analyzed_dataset()
    resp = client.get(f"/api/visualize/{dataset_id}/tsne_landscape")
    assert resp.status_code == 200
    data = resp.json()
    assert "tSNE1" in data
    assert "tSNE2" in data
    assert "Cluster" in data


def test_get_cluster_proportions_chart():
    dataset_id = _create_analyzed_dataset()
    resp = client.get(f"/api/visualize/{dataset_id}/cluster_proportions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert "Mouse" in data[0]


def test_export_csv():
    dataset_id = _create_analyzed_dataset()
    resp = client.get(f"/api/export/{dataset_id}")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers.get("content-type", "")
