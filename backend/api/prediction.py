"""Prediction endpoints."""

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, DATA_DIR
from models.db_models import Dataset
from models.schemas import PredictionRequest, PredictionResponse
from core.prediction import cluster_proportion_classify, landscape_density_score
from core.statistics import compute_cluster_proportions

router = APIRouter()

PROCESSED_DIR = DATA_DIR / "processed"


@router.post("/predict/{dataset_id}", response_model=PredictionResponse)
def predict(dataset_id: str, req: PredictionRequest, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    path = PROCESSED_DIR / dataset_id / "analyzed.csv"
    if not path.exists():
        raise HTTPException(status_code=400, detail="Analysis not complete")

    df = pd.read_csv(path)

    if req.model_type == "cluster_classifier":
        if "Cluster" not in df.columns:
            raise HTTPException(status_code=400, detail="No cluster data")
        props = compute_cluster_proportions(df)
        cluster_cols = [c for c in props.columns if c != "Mouse"]
        avg_props = props[cluster_cols].mean().values
        reference = _get_reference_data()
        result = cluster_proportion_classify(avg_props, reference)

    elif req.model_type == "density_scoring":
        if "tSNE1" not in df.columns:
            raise HTTPException(status_code=400, detail="No t-SNE data")
        sample_coords = df[["tSNE1", "tSNE2"]].values
        ref_coords = _get_reference_coords()
        result = landscape_density_score(sample_coords, ref_coords)

    else:
        raise HTTPException(status_code=400, detail=f"Unknown model: {req.model_type}")

    return PredictionResponse(dataset_id=dataset_id, model_type=req.model_type, result=result)


def _get_reference_data() -> pd.DataFrame:
    ref_path = DATA_DIR / "reference" / "reference_populations.csv"
    if ref_path.exists():
        return pd.read_csv(ref_path)
    np.random.seed(42)
    fertile = pd.DataFrame({
        0: np.random.normal(18, 3, 10), 1: np.random.normal(15, 3, 10),
        2: np.random.normal(25, 4, 10), 3: np.random.normal(12, 3, 10),
        4: np.random.normal(30, 4, 10), "label": ["fertile"] * 10,
    })
    subfertile = pd.DataFrame({
        0: np.random.normal(32, 4, 10), 1: np.random.normal(25, 4, 10),
        2: np.random.normal(12, 3, 10), 3: np.random.normal(20, 3, 10),
        4: np.random.normal(11, 3, 10), "label": ["subfertile"] * 10,
    })
    return pd.concat([fertile, subfertile], ignore_index=True)


def _get_reference_coords() -> np.ndarray:
    ref_path = DATA_DIR / "reference" / "fertile_coords.npy"
    if ref_path.exists():
        return np.load(ref_path)
    np.random.seed(42)
    return np.random.randn(500, 2) * 10
