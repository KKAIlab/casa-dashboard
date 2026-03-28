# CASA Dashboard v2 Design Spec

**Date**: 2026-03-28
**Status**: Approved
**Author**: Chen Jingquan + Claude

## Overview

Rebuild the CASA (Computer-Assisted Sperm Analysis) Dashboard from a single-file HTML app into a full-stack application with a Python backend (FastAPI) and React frontend. The goal is to provide a standardized, consistent analysis pipeline for sperm motility data, supporting team collaboration and external presentation.

## Motivation

- **Consistency**: All data must go through the same fixed analysis pipeline (t-SNE, K-means) with identical parameters, eliminating human-introduced variation from manual script execution
- **Scale**: The project now handles large volumes of data across multiple genotypes (Het/WT/KO), requiring a unified management interface
- **Collaboration**: Lab team members need to upload, analyze, and view data; collaborators and reviewers need polished interactive visualizations
- **Reproducibility**: Reproduce Fernandez-Lopez et al. (2022) fertility prediction methods within the same platform

## Architecture

**Tech Stack**: FastAPI (Python backend) + React 18 / Vite (frontend) + Plotly.js + Tailwind CSS + Docker

```
casa-dashboard/
├── backend/
│   ├── main.py                 # FastAPI entry, CORS config
│   ├── api/
│   │   ├── datasets.py         # Upload/import/list/delete
│   │   ├── analysis.py         # Trigger analysis / poll status / get results
│   │   ├── visualization.py    # Chart data endpoints (JSON for Plotly)
│   │   ├── prediction.py       # Fertility prediction endpoints
│   │   └── export.py           # Export CSV / reports
│   ├── core/
│   │   ├── pipeline.py         # Unified entry: raw CSV -> full pipeline
│   │   ├── preprocessing.py    # Encoding detection, column mapping, Type==99 filter
│   │   ├── tsne_analysis.py    # t-SNE (perplexity optimization) + K-means (k=5)
│   │   ├── statistics.py       # Descriptive stats, Welch's t-test, cluster proportions
│   │   ├── prediction.py       # Fernandez-Lopez 2022 two prediction models
│   │   └── config.py           # Fixed parameters (ensures consistency)
│   ├── models/
│   │   └── schemas.py          # Pydantic data models
│   ├── data/                   # Runtime data directory
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Overview: dataset cards, status summary
│   │   │   ├── DataManagement.jsx  # Upload, import, preview, metadata edit
│   │   │   ├── Analysis.jsx        # Trigger analysis, 7 interactive charts
│   │   │   └── Prediction.jsx      # Fertility prediction models & results
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Sidebar + main content area
│   │   │   ├── FileUploader.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── charts/
│   │   │   │   ├── TsneLandscape.jsx
│   │   │   │   ├── ClusterProportions.jsx
│   │   │   │   ├── ParameterBoxPlots.jsx
│   │   │   │   ├── Heatmap.jsx
│   │   │   │   ├── ScatterPlot.jsx
│   │   │   │   ├── ViolinPlot.jsx
│   │   │   │   └── GenotypeComparison.jsx
│   │   │   └── prediction/
│   │   │       ├── ClusterClassifier.jsx
│   │   │       └── DensityScoring.jsx
│   │   ├── hooks/
│   │   │   └── useApi.js           # API call wrapper
│   │   ├── context/
│   │   │   └── AppContext.jsx       # Global state
│   │   └── utils/
│   │       └── constants.js         # Parameter names, colors, etc.
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

## API Design

```
POST /api/upload              # Upload raw CASA CSV (Shift-JIS / UTF-8)
POST /api/import              # Import pre-processed CSV (with t-SNE + Cluster)
GET  /api/datasets            # List all uploaded datasets
GET  /api/dataset/{id}        # Get single dataset details
DELETE /api/dataset/{id}      # Delete dataset

POST /api/analyze/{id}        # Trigger full analysis pipeline
GET  /api/analysis/{id}       # Get analysis results (status: pending/running/done)

GET  /api/visualize/{id}/{chart_type}  # Get chart data (JSON for Plotly)
POST /api/compare             # Cross-genotype/cross-dataset comparison
POST /api/predict/{id}        # Run fertility prediction model
GET  /api/export/{id}         # Export CSV / report
```

## Analysis Pipeline (Fixed Parameters)

All parameters are hardcoded in `config.py` to ensure consistency:

| Parameter | Value | Source |
|-----------|-------|--------|
| Feature selection | VCL, VSL, ALH, BCF | Fernandez-Lopez 2022 |
| Standardization | Z-score (StandardScaler) | Standard practice |
| t-SNE perplexity | 100 | Optimized for dataset |
| t-SNE init | PCA | Faster convergence |
| K-means clusters | 5 | Fernandez-Lopez 2022 |
| Random state | 42 | Reproducibility |
| Motile filter | Type == 99 | CASA convention |

### Pipeline Steps

1. **Preprocessing**: Detect encoding (Shift-JIS/UTF-8) -> Map Japanese column names to English -> Filter Type==99 (motile only) -> Extract metadata
2. **t-SNE + Clustering**: Select features [VCL, VSL, ALH, BCF] -> Z-score normalize -> t-SNE dimensionality reduction -> K-means clustering (k=5)
3. **Statistics**: Descriptive stats per mouse/cluster, cluster proportions, Welch's t-test for group comparisons

## Data Input Modes

### Mode A: Raw CASA CSV Upload
- Upload original Shift-JIS/UTF-8 CASA CSV files
- System runs the full pipeline automatically
- User provides metadata (mouse ID, genotype, experiment date)

### Mode B: Pre-processed CSV Import
- Import CSV files that already contain t-SNE coordinates and cluster assignments
- Auto-detect column structure:
  - Has tSNE1, tSNE2, Cluster columns -> Skip analysis, go directly to visualization
  - Has only motility parameters -> Prompt user to choose "view only" or "trigger analysis"

## Visualization (7 Chart Types)

All charts are interactive (Plotly.js) with fullscreen and PNG/SVG download support.

1. **t-SNE Landscape**: Dual-panel - cluster coloring + individual mouse coloring, switchable
2. **Cluster Proportions**: Grouped bar / stacked bar, switchable
3. **Parameter Box Plots**: VCL, VSL, ALH, BCF distributions by cluster or by mouse
4. **Heatmap**: Z-score visualization of flagellar dynamics grouped by genotype
5. **Scatter Plot**: Configurable axes (e.g., VCL vs BCF) with density contours
6. **Violin Plot**: Distribution comparison across groups
7. **Cross-Genotype Comparison**: Multiple datasets overlaid in the same t-SNE space

## Fertility Prediction (Fernandez-Lopez 2022)

### Model A: Cluster Proportion Classifier
- **Input**: 5-element cluster proportion vector [C0%, C1%, C2%, C3%, C4%]
- **Method**: Logistic Regression / Random Forest
- **Training**: Reference data from the paper or user-provided labeled data (fertile/subfertile)
- **Output**: fertile / subfertile classification + probability score

### Model B: Landscape Density Scoring
- **Input**: Sample distribution in t-SNE space
- **Method**: KDE (Kernel Density Estimation) to compute density distribution
- **Comparison**: KL divergence / JS divergence against reference fertile population
- **Output**: Similarity score 0-100 (higher = closer to fertile)

### Reference Data
- Built-in: Paper's reference data as default baseline
- Custom: Users can upload their own reference population data

## Frontend Pages

### 1. Dashboard (Home)
- Dataset cards showing genotype, sample count, analysis status
- Recent activity feed
- Quick stats summary

### 2. Data Management
- Drag-and-drop upload zone for raw CASA CSV
- Import button for pre-processed CSV
- Data table preview with pagination, sorting, filtering
- Metadata editor (mouse ID, genotype, experiment date)

### 3. Analysis & Visualization
- Dataset selector -> One-click analysis trigger -> Real-time progress bar
- 7 interactive chart panels (described above)
- Each chart: fullscreen toggle, PNG/SVG download

### 4. Prediction
- Dataset selector
- Model A results: fertile/subfertile classification with confidence bar
- Model B results: density score gauge with reference distribution overlay
- Explanation text for each prediction

## Data Storage

```
data/
├── raw/{dataset_id}/              # Original uploaded files
├── processed/{dataset_id}/        # Analysis results
│   ├── cleaned.csv
│   ├── analyzed.csv
│   └── stats.json
├── reference/                     # Prediction model reference data
│   ├── fertile_baseline.csv
│   └── subfertile_baseline.csv
└── database.sqlite                # Metadata (dataset info, analysis status)
```

## UI / UX

- **Language**: English (for international reviewers/collaborators)
- **Japanese CASA column names**: Auto-converted in backend, frontend shows English only
- **Style**: Clean, scientific, professional (Tailwind CSS)
- **Navigation**: Sidebar with 4 pages
- **Responsive**: Desktop-first, functional on tablet

## Development & Deployment

### Local Development
```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

### Docker (Team Deployment)
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes: ["./backend/data:/app/data"]
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
```

### Future Deployment Options
- Lab server: `docker-compose up -d`
- Cloud: Static frontend on Nginx, backend in container
- GitHub Pages: Keep legacy single-file dashboard as lightweight entry point

## Key Design Decisions

1. **Fixed analysis parameters**: Users cannot modify t-SNE/clustering params -> guarantees consistency
2. **Async analysis**: Backend runs analysis in background thread, frontend polls status -> no timeout on large datasets
3. **SQLite for metadata**: Lightweight, no external DB dependency -> easy to deploy
4. **File-based data storage**: CSV files on disk, not in database -> easy to inspect and debug
5. **Reuse existing Python logic**: Core analysis code ported from sperm_move_project scripts, not rewritten

## Reference

- Fernandez-Lopez, P. et al. (2022). "Predicting fertility from sperm motility landscapes." *Communications Biology* 5:1027
- Source project: `/Users/chenjingquan/Desktop/sperm_move_project/`
