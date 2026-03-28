import io
import pytest
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


def test_list_datasets_empty():
    resp = client.get("/api/datasets")
    assert resp.status_code == 200
    assert resp.json() == []


def test_upload_raw_csv():
    data = {
        "番号": [1, 2], "種別": [99, 99], "座標数": [60, 55], "有効性": [1, 1],
        "直線速度[μm/秒]": [80.5, 65.2], "曲線速度[μm/秒]": [210.3, 180.5],
        "平均速度[μm/秒]": [120.1, 100.3], "直進性": [0.67, 0.65],
        "直線性": [0.38, 0.36], "頭部振幅[μm]": [4.5, 3.8],
        "頭部振動数[Hz]": [10.2, 8.5], "曲線性": [0.57, 0.56],
    }
    df = pd.DataFrame(data)
    csv_bytes = df.to_csv(index=False).encode("shift_jis")

    resp = client.post(
        "/api/upload",
        data={"name": "test_dataset", "genotype": "Het", "mouse_id": "Het_01", "field_num": "1", "group": "Het"},
        files={"file": ("Motility1.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    assert resp.status_code == 200
    result = resp.json()
    assert result["name"] == "test_dataset"
    assert result["source_type"] == "raw"

    resp = client.get("/api/datasets")
    assert len(resp.json()) == 1


def test_import_processed_csv():
    data = {
        "VCL": [210.3, 180.5], "VSL": [80.5, 65.2], "VAP": [120.1, 100.3],
        "LIN": [0.38, 0.36], "STR": [0.67, 0.65], "WOB": [0.57, 0.56],
        "ALH": [4.5, 3.8], "BCF": [10.2, 8.5], "Mouse": ["Het_01", "Het_01"],
        "tSNE1": [1.0, 2.0], "tSNE2": [3.0, 4.0], "Cluster": [0, 1],
    }
    df = pd.DataFrame(data)
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    resp = client.post(
        "/api/import",
        data={"name": "imported_data", "genotype": "Het"},
        files={"file": ("data.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    assert resp.status_code == 200
    result = resp.json()
    assert result["source_type"] == "imported"
    assert result["analysis_status"] == "done"


def test_delete_dataset():
    data = {"VCL": [1.0], "VSL": [1.0]}
    df = pd.DataFrame(data)
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    resp = client.post(
        "/api/import", data={"name": "to_delete"},
        files={"file": ("data.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    dataset_id = resp.json()["id"]

    resp = client.delete(f"/api/dataset/{dataset_id}")
    assert resp.status_code == 200

    resp = client.get("/api/datasets")
    assert len(resp.json()) == 0
