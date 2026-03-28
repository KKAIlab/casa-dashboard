"""Pydantic schemas for API request/response validation."""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DatasetCreate(BaseModel):
    name: str
    genotype: str = ""
    gene: str = "FADS2"
    experiment_date: str = ""


class DatasetResponse(BaseModel):
    id: str
    name: str
    genotype: Optional[str] = ""
    gene: Optional[str] = "FADS2"
    experiment_date: Optional[str] = ""
    upload_date: datetime
    source_type: Optional[str] = ""
    total_sperm: int = 0
    analysis_status: str = "pending"
    analysis_message: Optional[str] = ""
    file_count: int = 0

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    dataset_id: str
    status: str
    total_sperm: int = 0
    analyzed_sperm: int = 0
    message: str = ""


class PredictionRequest(BaseModel):
    model_type: str  # "cluster_classifier" or "density_scoring"


class PredictionResponse(BaseModel):
    dataset_id: str
    model_type: str
    result: dict


class FileConfig(BaseModel):
    mouse_id: str
    field_num: int
    group: str
