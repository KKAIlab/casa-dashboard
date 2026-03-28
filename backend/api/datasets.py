"""Dataset management endpoints: upload, import, list, delete."""

import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.orm import Session

from database import get_db, DATA_DIR
from models.db_models import Dataset
from models.schemas import DatasetResponse
from core.preprocessing import preprocess_file
from core.pipeline import import_processed_data

router = APIRouter()

RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"


@router.get("/datasets", response_model=list[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).order_by(Dataset.upload_date.desc()).all()


@router.get("/dataset/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return ds


@router.post("/upload", response_model=DatasetResponse)
def upload_raw_csv(
    name: str = Form(...),
    genotype: str = Form(""),
    gene: str = Form("FADS2"),
    experiment_date: str = Form(""),
    mouse_id: str = Form(""),
    field_num: str = Form("1"),
    group: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    ds = Dataset(
        name=name,
        genotype=genotype,
        gene=gene,
        experiment_date=experiment_date,
        source_type="raw",
        file_count=1,
        analysis_status="pending",
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)

    raw_dir = RAW_DIR / ds.id
    raw_dir.mkdir(parents=True, exist_ok=True)
    file_path = raw_dir / file.filename
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    df = preprocess_file(file_path, mouse_id=mouse_id, field_num=int(field_num), group=group or genotype)
    if df is not None:
        ds.total_sperm = len(df)
        db.commit()

    return ds


@router.post("/import", response_model=DatasetResponse)
def import_csv(
    name: str = Form(...),
    genotype: str = Form(""),
    gene: str = Form("FADS2"),
    experiment_date: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    ds = Dataset(
        name=name,
        genotype=genotype,
        gene=gene,
        experiment_date=experiment_date,
        source_type="imported",
        file_count=1,
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)

    processed_dir = PROCESSED_DIR / ds.id
    processed_dir.mkdir(parents=True, exist_ok=True)
    file_path = processed_dir / "analyzed.csv"
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    result = import_processed_data(file_path)
    ds.total_sperm = result["n_rows"]

    if result["has_tsne"] and result["has_clusters"]:
        ds.analysis_status = "done"
    else:
        ds.analysis_status = "pending"

    db.commit()
    return ds


@router.delete("/dataset/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    for d in [RAW_DIR / dataset_id, PROCESSED_DIR / dataset_id]:
        if d.exists():
            shutil.rmtree(d)

    db.delete(ds)
    db.commit()
    return {"status": "deleted", "id": dataset_id}
