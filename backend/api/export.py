"""Export endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db, DATA_DIR
from models.db_models import Dataset

router = APIRouter()

PROCESSED_DIR = DATA_DIR / "processed"


@router.get("/export/{dataset_id}")
def export_csv(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    csv_path = PROCESSED_DIR / dataset_id / "analyzed.csv"
    if not csv_path.exists():
        csv_path = PROCESSED_DIR / dataset_id / "cleaned.csv"

    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="No data file found")

    return FileResponse(path=str(csv_path), media_type="text/csv", filename=f"{ds.name}_export.csv")
