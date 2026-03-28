"""Analysis endpoints: trigger pipeline, check status, get results."""

import json
import threading
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, DATA_DIR, SessionLocal
from models.db_models import Dataset
from models.schemas import AnalysisResponse
from core.pipeline import run_full_pipeline

router = APIRouter()

RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"


def _run_analysis_background(dataset_id: str):
    """Run analysis in a background thread."""
    db = SessionLocal()
    try:
        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            return

        ds.analysis_status = "running"
        db.commit()

        raw_dir = RAW_DIR / dataset_id
        output_dir = PROCESSED_DIR / dataset_id
        output_dir.mkdir(parents=True, exist_ok=True)

        file_configs = []
        for csv_file in sorted(raw_dir.glob("*.csv")):
            file_configs.append({
                "filepath": csv_file,
                "mouse_id": ds.genotype or "Unknown",
                "field_num": len(file_configs) + 1,
                "group": ds.genotype or "Unknown",
            })

        if not file_configs:
            ds.analysis_status = "error"
            ds.analysis_message = "No CSV files found"
            db.commit()
            return

        result = run_full_pipeline(file_configs, output_dir)

        ds.analysis_status = result["status"]
        ds.total_sperm = result.get("total_sperm", 0)
        ds.analysis_message = result.get("message", "")
        db.commit()

    except Exception as e:
        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if ds:
            ds.analysis_status = "error"
            ds.analysis_message = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/analyze/{dataset_id}", response_model=AnalysisResponse)
def trigger_analysis(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if ds.analysis_status == "running":
        return AnalysisResponse(dataset_id=dataset_id, status="running", message="Analysis already in progress")

    thread = threading.Thread(target=_run_analysis_background, args=(dataset_id,))
    thread.start()

    return AnalysisResponse(dataset_id=dataset_id, status="running", message="Analysis started")


@router.get("/analysis/{dataset_id}", response_model=AnalysisResponse)
def get_analysis_status(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    result = AnalysisResponse(
        dataset_id=dataset_id, status=ds.analysis_status,
        total_sperm=ds.total_sperm, message=ds.analysis_message,
    )

    stats_file = PROCESSED_DIR / dataset_id / "stats.json"
    if stats_file.exists():
        with open(stats_file) as f:
            stats = json.load(f)
        result.analyzed_sperm = stats.get("analyzed_sperm", 0)

    return result
