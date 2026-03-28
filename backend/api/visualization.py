"""Visualization data endpoints: return JSON data for Plotly charts."""

import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd

from database import get_db, DATA_DIR
from models.db_models import Dataset
from core.statistics import compute_cluster_proportions
from core.config import AnalysisConfig

router = APIRouter()

PROCESSED_DIR = DATA_DIR / "processed"
CONFIG = AnalysisConfig()


def _load_analyzed_df(dataset_id: str) -> pd.DataFrame:
    path = PROCESSED_DIR / dataset_id / "analyzed.csv"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Analysis not found. Run analysis first.")
    return pd.read_csv(path)


@router.get("/visualize/{dataset_id}/{chart_type}")
def get_chart_data(dataset_id: str, chart_type: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = _load_analyzed_df(dataset_id)

    if chart_type == "tsne_landscape":
        return {
            "tSNE1": df["tSNE1"].tolist() if "tSNE1" in df.columns else [],
            "tSNE2": df["tSNE2"].tolist() if "tSNE2" in df.columns else [],
            "Cluster": df["Cluster"].tolist() if "Cluster" in df.columns else [],
            "Mouse": df["Mouse"].tolist() if "Mouse" in df.columns else [],
        }
    elif chart_type == "cluster_proportions":
        if "Cluster" not in df.columns:
            return []
        props = compute_cluster_proportions(df)
        return props.to_dict(orient="records")
    elif chart_type == "parameter_box":
        result = {}
        for param in CONFIG.TSNE_FEATURES:
            if param in df.columns:
                result[param] = {
                    "values": df[param].tolist(),
                    "cluster": df["Cluster"].tolist() if "Cluster" in df.columns else [],
                    "mouse": df["Mouse"].tolist() if "Mouse" in df.columns else [],
                }
        return result
    elif chart_type == "heatmap":
        result = []
        group_col = "Mouse" if "Mouse" in df.columns else "Group"
        for group_name, group_df in df.groupby(group_col):
            row = {"group": str(group_name)}
            for param in CONFIG.TSNE_FEATURES:
                if param in group_df.columns:
                    row[param] = float(group_df[param].mean())
            result.append(row)
        return result
    elif chart_type == "scatter":
        return {
            "VCL": df["VCL"].tolist() if "VCL" in df.columns else [],
            "BCF": df["BCF"].tolist() if "BCF" in df.columns else [],
            "Mouse": df["Mouse"].tolist() if "Mouse" in df.columns else [],
            "Group": df["Group"].tolist() if "Group" in df.columns else [],
        }
    elif chart_type == "violin":
        result = {}
        for param in CONFIG.ALL_CASA_PARAMS:
            if param in df.columns:
                result[param] = {
                    "values": df[param].tolist(),
                    "group": df["Group"].tolist() if "Group" in df.columns else [],
                }
        return result
    else:
        raise HTTPException(status_code=400, detail=f"Unknown chart type: {chart_type}")


@router.post("/compare")
def compare_datasets(dataset_ids: list[str], db: Session = Depends(get_db)):
    all_data = []
    for did in dataset_ids:
        try:
            df = _load_analyzed_df(did)
            ds = db.query(Dataset).filter(Dataset.id == did).first()
            df["dataset_name"] = ds.name if ds else did
            all_data.append(df)
        except HTTPException:
            continue

    if not all_data:
        raise HTTPException(status_code=404, detail="No analyzed datasets found")

    combined = pd.concat(all_data, ignore_index=True)
    return {
        "tSNE1": combined["tSNE1"].tolist() if "tSNE1" in combined.columns else [],
        "tSNE2": combined["tSNE2"].tolist() if "tSNE2" in combined.columns else [],
        "Cluster": combined["Cluster"].tolist() if "Cluster" in combined.columns else [],
        "dataset_name": combined["dataset_name"].tolist(),
        "Group": combined["Group"].tolist() if "Group" in combined.columns else [],
    }
