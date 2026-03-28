"""SQLAlchemy models for dataset metadata and analysis status."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, Text
from database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    genotype = Column(String)
    gene = Column(String, default="FADS2")
    experiment_date = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    source_type = Column(String)  # "raw" or "imported"
    total_sperm = Column(Integer, default=0)
    analysis_status = Column(String, default="pending")  # pending, running, done, error
    analysis_message = Column(Text, default="")
    file_count = Column(Integer, default=0)
