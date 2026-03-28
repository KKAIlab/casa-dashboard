"""CASA Dashboard API entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from api import datasets, analysis, visualization, prediction, export

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CASA Dashboard API", version="2.0.0")

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(datasets.router, prefix="/api", tags=["datasets"])
app.include_router(analysis.router, prefix="/api", tags=["analysis"])
app.include_router(visualization.router, prefix="/api", tags=["visualization"])
app.include_router(prediction.router, prefix="/api", tags=["prediction"])
app.include_router(export.router, prefix="/api", tags=["export"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
