# CASA Dashboard v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack CASA sperm motility dashboard with FastAPI backend + React frontend, providing standardized analysis pipeline and interactive visualizations.

**Architecture:** FastAPI backend reuses existing Python analysis logic (t-SNE, K-means, statistics) with fixed parameters for consistency. React frontend (Vite + Plotly.js) provides 4 pages: Dashboard, Data Management, Analysis, Prediction. SQLite stores metadata; CSV files stored on disk.

**Tech Stack:** FastAPI, scikit-learn, pandas, React 18, Vite, Plotly.js, Tailwind CSS, SQLite, Docker

---

## File Structure

```
casa-dashboard/
├── backend/
│   ├── main.py                      # FastAPI app entry + CORS
│   ├── database.py                  # SQLite setup + session
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                # Fixed analysis parameters
│   │   ├── preprocessing.py         # Encoding detection, column mapping, filtering
│   │   ├── tsne_analysis.py         # t-SNE + K-means
│   │   ├── statistics.py            # Descriptive stats, t-tests, cluster proportions
│   │   ├── prediction.py            # Fernandez-Lopez 2022 models
│   │   └── pipeline.py              # Orchestrator: raw CSV -> full analysis
│   ├── api/
│   │   ├── __init__.py
│   │   ├── datasets.py              # Upload/import/list/delete endpoints
│   │   ├── analysis.py              # Trigger/status/results endpoints
│   │   ├── visualization.py         # Chart data endpoints
│   │   ├── prediction.py            # Prediction endpoints
│   │   └── export.py                # CSV/report export
│   ├── models/
│   │   ├── __init__.py
│   │   ├── db_models.py             # SQLAlchemy models
│   │   └── schemas.py               # Pydantic schemas
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py              # Fixtures: test client, sample data
│   │   ├── test_config.py
│   │   ├── test_preprocessing.py
│   │   ├── test_tsne_analysis.py
│   │   ├── test_statistics.py
│   │   ├── test_prediction.py
│   │   ├── test_pipeline.py
│   │   ├── test_api_datasets.py
│   │   ├── test_api_analysis.py
│   │   └── test_api_visualization.py
│   ├── data/                        # Runtime data (gitignored)
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DataManagement.jsx
│   │   │   ├── Analysis.jsx
│   │   │   └── Prediction.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── FileUploader.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── ProgressBar.jsx
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
│   │   │   └── useApi.js
│   │   ├── context/
│   │   │   └── AppContext.jsx
│   │   └── utils/
│   │       └── constants.js
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── tailwind.config.js
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Phase 1: Backend Core (Analysis Engine)

### Task 1: Project scaffolding and config module

**Files:**
- Create: `backend/core/__init__.py`
- Create: `backend/core/config.py`
- Create: `backend/requirements.txt`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_config.py`
- Create: `.gitignore`

- [ ] **Step 1: Create .gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
venv/
.venv/

# Data
backend/data/

# Frontend
frontend/node_modules/
frontend/dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store

# Env
.env
```

- [ ] **Step 2: Create requirements.txt**

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
sqlalchemy==2.0.36
pandas==2.2.3
numpy==2.2.1
scikit-learn==1.6.1
scipy==1.15.1
chardet==5.2.0
pydantic==2.10.4
```

- [ ] **Step 3: Write the failing test for config**

File: `backend/tests/test_config.py`

```python
from core.config import AnalysisConfig


def test_config_has_fixed_parameters():
    cfg = AnalysisConfig()
    assert cfg.TSNE_PERPLEXITIES == [5, 10, 30, 50, 100]
    assert cfg.N_CLUSTERS == 5
    assert cfg.RANDOM_STATE == 42
    assert cfg.KMEANS_N_INIT == 10
    assert cfg.TSNE_FEATURES == ["VCL", "VSL", "ALH", "BCF"]
    assert cfg.ALL_CASA_PARAMS == ["VCL", "VSL", "VAP", "LIN", "STR", "WOB", "ALH", "BCF"]
    assert cfg.MOTILE_TYPE == 99


def test_column_mapping():
    cfg = AnalysisConfig()
    assert cfg.COLUMN_MAPPING["曲線速度[μm/秒]"] == "VCL"
    assert cfg.COLUMN_MAPPING["直線速度[μm/秒]"] == "VSL"
    assert cfg.COLUMN_MAPPING["種別"] == "Type"
    assert len(cfg.COLUMN_MAPPING) == 12
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd /Users/chenjingquan/Desktop/GitHub-Projects/data-visualization/casa-dashboard && cd backend && python -m pytest tests/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'core'`

- [ ] **Step 5: Create config module**

File: `backend/core/__init__.py`
```python
```

File: `backend/tests/__init__.py`
```python
```

File: `backend/core/config.py`
```python
"""Fixed analysis parameters for CASA pipeline consistency."""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AnalysisConfig:
    """Immutable analysis configuration. All parameters are fixed to ensure
    reproducibility across all datasets and users."""

    # Japanese -> English column mapping (from CASA software output)
    COLUMN_MAPPING: dict = field(default_factory=lambda: {
        "番号": "ID",
        "種別": "Type",
        "座標数": "Coord_count",
        "有効性": "Valid",
        "直線速度[μm/秒]": "VSL",
        "曲線速度[μm/秒]": "VCL",
        "平均速度[μm/秒]": "VAP",
        "直進性": "STR",
        "直線性": "LIN",
        "頭部振幅[μm]": "ALH",
        "頭部振動数[Hz]": "BCF",
        "曲線性": "WOB",
    })

    # Motile sperm filter
    MOTILE_TYPE: int = 99

    # All 8 standard CASA parameters
    ALL_CASA_PARAMS: list = field(default_factory=lambda: [
        "VCL", "VSL", "VAP", "LIN", "STR", "WOB", "ALH", "BCF"
    ])

    # Features used for t-SNE (Fernandez-Lopez 2022)
    TSNE_FEATURES: list = field(default_factory=lambda: [
        "VCL", "VSL", "ALH", "BCF"
    ])

    # t-SNE parameters
    TSNE_PERPLEXITIES: list = field(default_factory=lambda: [5, 10, 30, 50, 100])
    TSNE_MAX_ITER: int = 1000
    TSNE_INIT: str = "pca"
    TSNE_LEARNING_RATE: str = "auto"

    # K-means parameters
    N_CLUSTERS: int = 5
    KMEANS_N_INIT: int = 10
    RANDOM_STATE: int = 42
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_config.py -v`
Expected: 2 passed

- [ ] **Step 7: Commit**

```bash
git add backend/core/ backend/tests/ backend/requirements.txt .gitignore
git commit -m "feat: add project scaffolding and config module"
```

---

### Task 2: Preprocessing module

**Files:**
- Create: `backend/core/preprocessing.py`
- Create: `backend/tests/test_preprocessing.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create test fixtures**

File: `backend/tests/conftest.py`
```python
import pytest
import pandas as pd
import numpy as np
import tempfile
import os


@pytest.fixture
def sample_raw_csv_shift_jis(tmp_path):
    """Create a sample CASA CSV in Shift-JIS encoding with Japanese columns."""
    data = {
        "番号": [1, 2, 3, 4, 5],
        "種別": [99, 99, 1, 99, 9],
        "座標数": [60, 55, 60, 58, 60],
        "有効性": [1, 1, 1, 1, 1],
        "直線速度[μm/秒]": [80.5, 65.2, 10.0, 90.1, 5.0],
        "曲線速度[μm/秒]": [210.3, 180.5, 20.0, 250.7, 15.0],
        "平均速度[μm/秒]": [120.1, 100.3, 15.0, 140.2, 8.0],
        "直進性": [0.67, 0.65, 0.50, 0.72, 0.33],
        "直線性": [0.38, 0.36, 0.50, 0.36, 0.33],
        "頭部振幅[μm]": [4.5, 3.8, 1.0, 5.2, 0.5],
        "頭部振動数[Hz]": [10.2, 8.5, 2.0, 12.1, 1.0],
        "曲線性": [0.57, 0.56, 0.75, 0.56, 0.53],
    }
    df = pd.DataFrame(data)
    filepath = tmp_path / "Motility1.csv"
    df.to_csv(filepath, index=False, encoding="shift_jis")
    return filepath


@pytest.fixture
def sample_raw_csv_utf8(tmp_path):
    """Create a sample CASA CSV in UTF-8 encoding."""
    data = {
        "番号": [1, 2, 3],
        "種別": [99, 99, 99],
        "座標数": [60, 55, 60],
        "有効性": [1, 1, 1],
        "直線速度[μm/秒]": [80.5, 65.2, 90.1],
        "曲線速度[μm/秒]": [210.3, 180.5, 250.7],
        "平均速度[μm/秒]": [120.1, 100.3, 140.2],
        "直進性": [0.67, 0.65, 0.72],
        "直線性": [0.38, 0.36, 0.36],
        "頭部振幅[μm]": [4.5, 3.8, 5.2],
        "頭部振動数[Hz]": [10.2, 8.5, 12.1],
        "曲線性": [0.57, 0.56, 0.56],
    }
    df = pd.DataFrame(data)
    filepath = tmp_path / "Motility1.csv"
    df.to_csv(filepath, index=False, encoding="utf-8")
    return filepath


@pytest.fixture
def sample_cleaned_df():
    """Sample cleaned sperm data (post-preprocessing)."""
    np.random.seed(42)
    n = 100
    return pd.DataFrame({
        "VCL": np.random.normal(210, 60, n),
        "VSL": np.random.normal(75, 35, n),
        "VAP": np.random.normal(120, 40, n),
        "LIN": np.random.uniform(0.2, 0.8, n),
        "STR": np.random.uniform(0.3, 0.9, n),
        "WOB": np.random.uniform(0.3, 0.8, n),
        "ALH": np.random.normal(4.5, 1.5, n),
        "BCF": np.random.normal(10, 3, n),
        "Mouse": np.random.choice(["Het_01", "Het_02", "Het_03"], n),
        "Field": np.random.choice([1, 2, 3, 4], n),
        "Group": "Het",
    })


@pytest.fixture
def sample_tsne_df(sample_cleaned_df):
    """Sample data with t-SNE coordinates and cluster labels."""
    df = sample_cleaned_df.copy()
    np.random.seed(42)
    df["tSNE1"] = np.random.normal(0, 10, len(df))
    df["tSNE2"] = np.random.normal(0, 10, len(df))
    df["Cluster"] = np.random.choice([0, 1, 2, 3, 4], len(df))
    return df
```

- [ ] **Step 2: Write the failing test for preprocessing**

File: `backend/tests/test_preprocessing.py`
```python
import pandas as pd
from core.preprocessing import detect_encoding, read_casa_csv, preprocess_file


def test_detect_encoding_shift_jis(sample_raw_csv_shift_jis):
    enc = detect_encoding(sample_raw_csv_shift_jis)
    assert enc.lower().replace("-", "_") in ("shift_jis", "shift_jis_2004", "cp932")


def test_detect_encoding_utf8(sample_raw_csv_utf8):
    enc = detect_encoding(sample_raw_csv_utf8)
    assert "utf" in enc.lower()


def test_read_casa_csv_shift_jis(sample_raw_csv_shift_jis):
    df = read_casa_csv(sample_raw_csv_shift_jis)
    assert df is not None
    assert "VCL" in df.columns
    assert "VSL" in df.columns
    assert "Type" in df.columns


def test_preprocess_file_filters_motile(sample_raw_csv_shift_jis):
    df = preprocess_file(sample_raw_csv_shift_jis, mouse_id="Test_01", field_num=1, group="Het")
    # Original has 5 rows: 3 motile (Type==99), 2 non-motile
    assert len(df) == 3
    assert list(df["Mouse"].unique()) == ["Test_01"]
    assert list(df["Group"].unique()) == ["Het"]
    assert "Type" not in df.columns  # Type should be dropped after filtering
    assert set(["VCL", "VSL", "VAP", "LIN", "STR", "WOB", "ALH", "BCF"]).issubset(df.columns)
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_preprocessing.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'core.preprocessing'`

- [ ] **Step 4: Implement preprocessing module**

File: `backend/core/preprocessing.py`
```python
"""CASA data preprocessing: encoding detection, column mapping, motile filtering."""

import pandas as pd
import chardet
from pathlib import Path

from core.config import AnalysisConfig

CONFIG = AnalysisConfig()


def detect_encoding(filepath: Path) -> str:
    """Detect file encoding using chardet."""
    with open(filepath, "rb") as f:
        raw = f.read(10000)
    result = chardet.detect(raw)
    return result["encoding"]


def read_casa_csv(filepath: Path) -> pd.DataFrame | None:
    """Read a CASA CSV file, auto-detecting encoding and mapping columns."""
    encoding = detect_encoding(filepath)
    try:
        df = pd.read_csv(filepath, encoding=encoding)
    except Exception:
        # Fallback: try shift_jis then utf-8
        for enc in ("shift_jis", "utf-8"):
            try:
                df = pd.read_csv(filepath, encoding=enc)
                break
            except Exception:
                continue
        else:
            return None

    # Map Japanese column names to English
    df = df.rename(columns=CONFIG.COLUMN_MAPPING)
    return df


def preprocess_file(
    filepath: Path,
    mouse_id: str,
    field_num: int,
    group: str,
) -> pd.DataFrame | None:
    """Process a single CASA CSV file: read, map columns, filter motile, add metadata."""
    df = read_casa_csv(filepath)
    if df is None:
        return None

    # Filter motile sperm (Type == 99)
    if "Type" not in df.columns:
        return None

    df_motile = df[df["Type"] == CONFIG.MOTILE_TYPE].copy()
    if len(df_motile) == 0:
        return None

    # Add metadata
    df_motile["Mouse"] = mouse_id
    df_motile["Field"] = field_num
    df_motile["Group"] = group

    # Select output columns
    output_cols = CONFIG.ALL_CASA_PARAMS + ["Mouse", "Field", "Group"]
    missing = [c for c in output_cols if c not in df_motile.columns]
    if missing:
        return None

    return df_motile[output_cols].reset_index(drop=True)


def preprocess_multiple_files(
    file_configs: list[dict],
) -> pd.DataFrame | None:
    """Process multiple CASA CSV files and concatenate.

    file_configs: list of {"filepath": Path, "mouse_id": str, "field_num": int, "group": str}
    """
    all_data = []
    for fc in file_configs:
        df = preprocess_file(
            filepath=fc["filepath"],
            mouse_id=fc["mouse_id"],
            field_num=fc["field_num"],
            group=fc["group"],
        )
        if df is not None:
            all_data.append(df)

    if not all_data:
        return None

    return pd.concat(all_data, ignore_index=True)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_preprocessing.py -v`
Expected: 4 passed

- [ ] **Step 6: Commit**

```bash
git add backend/core/preprocessing.py backend/tests/conftest.py backend/tests/test_preprocessing.py
git commit -m "feat: add preprocessing module with encoding detection and column mapping"
```

---

### Task 3: t-SNE analysis module

**Files:**
- Create: `backend/core/tsne_analysis.py`
- Create: `backend/tests/test_tsne_analysis.py`

- [ ] **Step 1: Write the failing test**

File: `backend/tests/test_tsne_analysis.py`
```python
import numpy as np
import pandas as pd
from core.tsne_analysis import run_tsne, run_clustering, run_tsne_pipeline


def test_run_tsne(sample_cleaned_df):
    features = sample_cleaned_df[["VCL", "VSL", "ALH", "BCF"]].drop_duplicates().dropna()
    embedding, perplexity = run_tsne(features.values)
    assert embedding.shape == (len(features), 2)
    assert perplexity in [5, 10, 30, 50, 100]


def test_run_clustering():
    np.random.seed(42)
    embedding = np.random.randn(50, 2)
    labels = run_clustering(embedding)
    assert len(labels) == 50
    assert set(labels).issubset({0, 1, 2, 3, 4})


def test_run_tsne_pipeline(sample_cleaned_df):
    result_df = run_tsne_pipeline(sample_cleaned_df)
    assert "tSNE1" in result_df.columns
    assert "tSNE2" in result_df.columns
    assert "Cluster" in result_df.columns
    assert len(result_df) <= len(sample_cleaned_df)
    assert result_df["Cluster"].nunique() <= 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_tsne_analysis.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement t-SNE analysis module**

File: `backend/core/tsne_analysis.py`
```python
"""t-SNE dimensionality reduction and K-means clustering.

Replicates the analysis from sperm_move_project/scripts/02_analysis/het_analysis_python.py
with fixed parameters from config.
"""

import numpy as np
import pandas as pd
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

from core.config import AnalysisConfig

CONFIG = AnalysisConfig()


def run_tsne(features: np.ndarray) -> tuple[np.ndarray, int]:
    """Run t-SNE with multiple perplexities, select best by KL divergence.

    Args:
        features: Raw feature array (n_samples, n_features). Will be standardized internally.

    Returns:
        (embedding, best_perplexity): 2D embedding and selected perplexity value.
    """
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)

    results = {}
    for ppx in CONFIG.TSNE_PERPLEXITIES:
        if ppx >= len(features):
            continue

        tsne = TSNE(
            n_components=2,
            perplexity=ppx,
            random_state=CONFIG.RANDOM_STATE,
            max_iter=CONFIG.TSNE_MAX_ITER,
            learning_rate=CONFIG.TSNE_LEARNING_RATE,
            init=CONFIG.TSNE_INIT,
        )
        embedding = tsne.fit_transform(X_scaled)
        results[ppx] = {
            "embedding": embedding,
            "kl_divergence": tsne.kl_divergence_,
        }

    best_ppx = min(results.keys(), key=lambda x: results[x]["kl_divergence"])
    return results[best_ppx]["embedding"], best_ppx


def run_clustering(embedding: np.ndarray) -> np.ndarray:
    """Run K-means clustering on t-SNE embedding.

    Returns:
        Cluster labels array (0 to N_CLUSTERS-1).
    """
    kmeans = KMeans(
        n_clusters=CONFIG.N_CLUSTERS,
        random_state=CONFIG.RANDOM_STATE,
        n_init=CONFIG.KMEANS_N_INIT,
    )
    return kmeans.fit_predict(embedding)


def run_tsne_pipeline(cleaned_df: pd.DataFrame) -> pd.DataFrame:
    """Full t-SNE + clustering pipeline on cleaned sperm data.

    Matches the logic from het_analysis_python.py:
    1. Extract TSNE_FEATURES columns
    2. Deduplicate
    3. Run t-SNE
    4. Run K-means on embedding
    5. Merge results back to original data via lookup key

    Returns:
        DataFrame with original columns + tSNE1, tSNE2, Cluster.
    """
    features = CONFIG.TSNE_FEATURES

    # Extract and deduplicate
    df_unique = cleaned_df[features].drop_duplicates().dropna().reset_index(drop=True)

    # Run t-SNE
    embedding, best_perplexity = run_tsne(df_unique.values)

    # Cluster on embedding
    cluster_labels = run_clustering(embedding)

    # Build lookup table
    df_unique["tSNE1"] = embedding[:, 0]
    df_unique["tSNE2"] = embedding[:, 1]
    df_unique["Cluster"] = cluster_labels
    df_unique["lookup_key"] = df_unique[features].apply(
        lambda x: "_".join(map(str, x)), axis=1
    )

    # Merge back to original
    result = cleaned_df.copy()
    result["lookup_key"] = result[features].apply(
        lambda x: "_".join(map(str, x)), axis=1
    )
    result = result.merge(
        df_unique[["lookup_key", "tSNE1", "tSNE2", "Cluster"]],
        on="lookup_key",
        how="left",
    ).dropna(subset=["tSNE1", "tSNE2"])

    return result
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_tsne_analysis.py -v`
Expected: 3 passed (may take ~10s due to t-SNE computation)

- [ ] **Step 5: Commit**

```bash
git add backend/core/tsne_analysis.py backend/tests/test_tsne_analysis.py
git commit -m "feat: add t-SNE analysis module with perplexity optimization and K-means"
```

---

### Task 4: Statistics module

**Files:**
- Create: `backend/core/statistics.py`
- Create: `backend/tests/test_statistics.py`

- [ ] **Step 1: Write the failing test**

File: `backend/tests/test_statistics.py`
```python
import pandas as pd
import numpy as np
from core.statistics import compute_baseline_stats, compute_cluster_proportions, compute_group_comparison


def test_compute_baseline_stats(sample_cleaned_df):
    stats = compute_baseline_stats(sample_cleaned_df)
    assert isinstance(stats, dict)
    # Should have one entry per mouse
    mice = sample_cleaned_df["Mouse"].unique()
    for mouse in mice:
        assert mouse in stats
        assert "VCL_mean" in stats[mouse]
        assert "VCL_std" in stats[mouse]
        assert "n" in stats[mouse]


def test_compute_cluster_proportions(sample_tsne_df):
    props = compute_cluster_proportions(sample_tsne_df)
    assert isinstance(props, pd.DataFrame)
    assert "Mouse" in props.columns
    # Each row should sum to ~100%
    cluster_cols = [c for c in props.columns if c != "Mouse"]
    for _, row in props.iterrows():
        assert abs(row[cluster_cols].sum() - 100.0) < 0.1


def test_compute_group_comparison():
    np.random.seed(42)
    df = pd.DataFrame({
        "VCL": np.concatenate([np.random.normal(200, 50, 50), np.random.normal(180, 50, 50)]),
        "Group": ["WT"] * 50 + ["KO"] * 50,
    })
    result = compute_group_comparison(df, "VCL", "WT", "KO")
    assert "t_stat" in result
    assert "p_value" in result
    assert isinstance(result["p_value"], float)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_statistics.py -v`
Expected: FAIL

- [ ] **Step 3: Implement statistics module**

File: `backend/core/statistics.py`
```python
"""Descriptive statistics, cluster proportions, and group comparisons."""

import pandas as pd
import numpy as np
from scipy import stats as scipy_stats

from core.config import AnalysisConfig

CONFIG = AnalysisConfig()


def compute_baseline_stats(cleaned_df: pd.DataFrame) -> dict:
    """Compute mean/std for each CASA parameter, grouped by Mouse.

    Returns:
        {mouse_id: {"VCL_mean": float, "VCL_std": float, ..., "n": int}}
    """
    params = CONFIG.ALL_CASA_PARAMS
    result = {}

    for mouse, group_df in cleaned_df.groupby("Mouse"):
        entry = {"n": len(group_df)}
        for param in params:
            if param in group_df.columns:
                entry[f"{param}_mean"] = float(group_df[param].mean())
                entry[f"{param}_std"] = float(group_df[param].std())
        result[mouse] = entry

    return result


def compute_cluster_proportions(tsne_df: pd.DataFrame) -> pd.DataFrame:
    """Compute cluster proportion (%) for each mouse.

    Returns:
        DataFrame with columns: Mouse, 0, 1, 2, 3, 4 (cluster percentages).
    """
    ct = tsne_df.groupby(["Mouse", "Cluster"]).size().unstack(fill_value=0)
    proportions = ct.div(ct.sum(axis=1), axis=0) * 100
    proportions = proportions.reset_index()
    proportions.columns = ["Mouse"] + [int(c) for c in proportions.columns[1:]]
    return proportions


def compute_group_comparison(
    df: pd.DataFrame,
    param: str,
    group_a: str,
    group_b: str,
) -> dict:
    """Welch's t-test comparing a parameter between two groups.

    Returns:
        {"t_stat": float, "p_value": float, "group_a_mean": float, ...}
    """
    a = df.loc[df["Group"] == group_a, param].dropna()
    b = df.loc[df["Group"] == group_b, param].dropna()

    t_stat, p_value = scipy_stats.ttest_ind(a, b, equal_var=False)

    return {
        "param": param,
        "group_a": group_a,
        "group_b": group_b,
        "group_a_mean": float(a.mean()),
        "group_a_std": float(a.std()),
        "group_a_n": len(a),
        "group_b_mean": float(b.mean()),
        "group_b_std": float(b.std()),
        "group_b_n": len(b),
        "t_stat": float(t_stat),
        "p_value": float(p_value),
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_statistics.py -v`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add backend/core/statistics.py backend/tests/test_statistics.py
git commit -m "feat: add statistics module with baseline stats, cluster proportions, t-test"
```

---

### Task 5: Pipeline orchestrator

**Files:**
- Create: `backend/core/pipeline.py`
- Create: `backend/tests/test_pipeline.py`

- [ ] **Step 1: Write the failing test**

File: `backend/tests/test_pipeline.py`
```python
import json
from pathlib import Path
from core.pipeline import run_full_pipeline, import_processed_data


def test_run_full_pipeline(sample_raw_csv_shift_jis, tmp_path):
    output_dir = tmp_path / "output"
    file_configs = [
        {
            "filepath": sample_raw_csv_shift_jis,
            "mouse_id": "Test_01",
            "field_num": 1,
            "group": "Het",
        }
    ]
    result = run_full_pipeline(file_configs, output_dir)

    assert result["status"] == "done"
    assert result["total_sperm"] == 3  # 3 motile from 5 total
    assert (output_dir / "cleaned.csv").exists()
    assert (output_dir / "analyzed.csv").exists()
    assert (output_dir / "stats.json").exists()

    # Verify stats.json structure
    with open(output_dir / "stats.json") as f:
        stats = json.load(f)
    assert "baseline" in stats
    assert "cluster_proportions" in stats


def test_import_processed_data(sample_tsne_df, tmp_path):
    csv_path = tmp_path / "imported.csv"
    sample_tsne_df.to_csv(csv_path, index=False)

    result = import_processed_data(csv_path)
    assert result["has_tsne"] is True
    assert result["has_clusters"] is True
    assert result["n_rows"] == len(sample_tsne_df)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_pipeline.py -v`
Expected: FAIL

- [ ] **Step 3: Implement pipeline orchestrator**

File: `backend/core/pipeline.py`
```python
"""Unified analysis pipeline: raw CSV -> preprocessing -> t-SNE -> statistics."""

import json
from pathlib import Path

import pandas as pd

from core.preprocessing import preprocess_multiple_files
from core.tsne_analysis import run_tsne_pipeline
from core.statistics import compute_baseline_stats, compute_cluster_proportions
from core.config import AnalysisConfig

CONFIG = AnalysisConfig()


def run_full_pipeline(
    file_configs: list[dict],
    output_dir: Path,
) -> dict:
    """Run the complete analysis pipeline.

    Args:
        file_configs: List of {"filepath": Path, "mouse_id": str, "field_num": int, "group": str}
        output_dir: Directory to save output files.

    Returns:
        {"status": str, "total_sperm": int, "output_dir": str}
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Preprocessing
    cleaned_df = preprocess_multiple_files(file_configs)
    if cleaned_df is None or len(cleaned_df) == 0:
        return {"status": "error", "message": "No motile sperm found in uploaded files"}

    cleaned_df.to_csv(output_dir / "cleaned.csv", index=False)

    # Step 2: t-SNE + Clustering
    analyzed_df = run_tsne_pipeline(cleaned_df)
    analyzed_df.to_csv(output_dir / "analyzed.csv", index=False)

    # Step 3: Statistics
    baseline = compute_baseline_stats(cleaned_df)
    cluster_props = compute_cluster_proportions(analyzed_df)

    stats = {
        "baseline": baseline,
        "cluster_proportions": cluster_props.to_dict(orient="records"),
        "total_sperm": len(cleaned_df),
        "analyzed_sperm": len(analyzed_df),
    }
    with open(output_dir / "stats.json", "w") as f:
        json.dump(stats, f, indent=2, default=str)

    return {
        "status": "done",
        "total_sperm": len(cleaned_df),
        "analyzed_sperm": len(analyzed_df),
        "output_dir": str(output_dir),
    }


def import_processed_data(csv_path: Path) -> dict:
    """Import a pre-processed CSV and detect what columns are available.

    Returns:
        {"has_tsne": bool, "has_clusters": bool, "n_rows": int, "columns": list, "df": DataFrame}
    """
    csv_path = Path(csv_path)
    df = pd.read_csv(csv_path)

    has_tsne = "tSNE1" in df.columns and "tSNE2" in df.columns
    has_clusters = "Cluster" in df.columns

    return {
        "has_tsne": has_tsne,
        "has_clusters": has_clusters,
        "n_rows": len(df),
        "columns": list(df.columns),
        "df": df,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_pipeline.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add backend/core/pipeline.py backend/tests/test_pipeline.py
git commit -m "feat: add pipeline orchestrator for full analysis workflow"
```

---

### Task 6: Prediction module

**Files:**
- Create: `backend/core/prediction.py`
- Create: `backend/tests/test_prediction.py`

- [ ] **Step 1: Write the failing test**

File: `backend/tests/test_prediction.py`
```python
import numpy as np
import pandas as pd
from core.prediction import cluster_proportion_classify, landscape_density_score


def test_cluster_proportion_classify():
    # Simulate: sample proportions vs reference fertile/subfertile populations
    sample_proportions = np.array([20.0, 15.0, 25.0, 10.0, 30.0])

    reference_fertile = pd.DataFrame({
        0: [18, 22, 20],
        1: [14, 16, 15],
        2: [26, 24, 25],
        3: [12, 8, 10],
        4: [30, 30, 30],
        "label": ["fertile", "fertile", "fertile"],
    })
    reference_subfertile = pd.DataFrame({
        0: [35, 30, 32],
        1: [25, 28, 26],
        2: [10, 12, 11],
        3: [20, 18, 19],
        4: [10, 12, 12],
        "label": ["subfertile", "subfertile", "subfertile"],
    })
    reference = pd.concat([reference_fertile, reference_subfertile], ignore_index=True)

    result = cluster_proportion_classify(sample_proportions, reference)
    assert result["prediction"] in ("fertile", "subfertile")
    assert 0.0 <= result["probability"] <= 1.0


def test_landscape_density_score():
    np.random.seed(42)
    # Sample distribution
    sample_coords = np.random.randn(100, 2)
    # Reference (fertile) distribution - similar
    ref_coords = np.random.randn(200, 2) * 1.1

    result = landscape_density_score(sample_coords, ref_coords)
    assert 0.0 <= result["similarity_score"] <= 100.0
    assert "js_divergence" in result
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_prediction.py -v`
Expected: FAIL

- [ ] **Step 3: Implement prediction module**

File: `backend/core/prediction.py`
```python
"""Fertility prediction models (Fernandez-Lopez et al. 2022).

Model A: Cluster proportion classifier (Logistic Regression)
Model B: Landscape density scoring (KDE + JS divergence)
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from scipy.stats import gaussian_kde
from scipy.spatial.distance import jensenshannon


def cluster_proportion_classify(
    sample_proportions: np.ndarray,
    reference_df: pd.DataFrame,
) -> dict:
    """Model A: Classify sample as fertile/subfertile based on cluster proportions.

    Args:
        sample_proportions: 5-element array of cluster percentages.
        reference_df: DataFrame with columns 0-4 (proportions) and "label" (fertile/subfertile).

    Returns:
        {"prediction": str, "probability": float}
    """
    cluster_cols = [c for c in reference_df.columns if c != "label"]
    X_ref = reference_df[cluster_cols].values
    y_ref = reference_df["label"].values

    clf = LogisticRegression(random_state=42, max_iter=1000)
    clf.fit(X_ref, y_ref)

    sample = sample_proportions.reshape(1, -1)
    prediction = clf.predict(sample)[0]
    probas = clf.predict_proba(sample)[0]
    # Probability of the predicted class
    pred_idx = list(clf.classes_).index(prediction)

    return {
        "prediction": str(prediction),
        "probability": float(probas[pred_idx]),
        "class_probabilities": {
            str(cls): float(p) for cls, p in zip(clf.classes_, probas)
        },
    }


def landscape_density_score(
    sample_coords: np.ndarray,
    reference_coords: np.ndarray,
    grid_size: int = 100,
) -> dict:
    """Model B: Score sample similarity to reference population in t-SNE space.

    Uses KDE to estimate density distributions and Jensen-Shannon divergence
    to measure similarity.

    Args:
        sample_coords: (n, 2) array of t-SNE coordinates.
        reference_coords: (m, 2) array of reference t-SNE coordinates.
        grid_size: Resolution of the density estimation grid.

    Returns:
        {"similarity_score": float (0-100), "js_divergence": float}
    """
    # Build common grid from both distributions
    all_coords = np.vstack([sample_coords, reference_coords])
    x_min, y_min = all_coords.min(axis=0) - 1
    x_max, y_max = all_coords.max(axis=0) + 1

    x_grid = np.linspace(x_min, x_max, grid_size)
    y_grid = np.linspace(y_min, y_max, grid_size)
    xx, yy = np.meshgrid(x_grid, y_grid)
    grid_points = np.vstack([xx.ravel(), yy.ravel()])

    # KDE for sample
    kde_sample = gaussian_kde(sample_coords.T)
    density_sample = kde_sample(grid_points)
    density_sample = density_sample / density_sample.sum()

    # KDE for reference
    kde_ref = gaussian_kde(reference_coords.T)
    density_ref = kde_ref(grid_points)
    density_ref = density_ref / density_ref.sum()

    # Jensen-Shannon divergence (0 = identical, 1 = maximally different)
    js_div = float(jensenshannon(density_sample, density_ref) ** 2)

    # Convert to similarity score (0-100)
    similarity = (1.0 - js_div) * 100.0

    return {
        "similarity_score": float(max(0.0, min(100.0, similarity))),
        "js_divergence": js_div,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_prediction.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add backend/core/prediction.py backend/tests/test_prediction.py
git commit -m "feat: add fertility prediction models (cluster classifier + density scoring)"
```

---

## Phase 2: Backend API

### Task 7: FastAPI app setup with database models

**Files:**
- Create: `backend/main.py`
- Create: `backend/database.py`
- Create: `backend/models/__init__.py`
- Create: `backend/models/db_models.py`
- Create: `backend/models/schemas.py`

- [ ] **Step 1: Create database module**

File: `backend/database.py`
```python
"""SQLite database setup."""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DATA_DIR / 'database.sqlite'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 2: Create database models**

File: `backend/models/__init__.py`
```python
```

File: `backend/models/db_models.py`
```python
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
```

- [ ] **Step 3: Create Pydantic schemas**

File: `backend/models/schemas.py`
```python
"""Pydantic schemas for API request/response validation."""

from pydantic import BaseModel
from datetime import datetime


class DatasetCreate(BaseModel):
    name: str
    genotype: str = ""
    gene: str = "FADS2"
    experiment_date: str = ""


class DatasetResponse(BaseModel):
    id: str
    name: str
    genotype: str
    gene: str
    experiment_date: str
    upload_date: datetime
    source_type: str
    total_sperm: int
    analysis_status: str
    analysis_message: str
    file_count: int

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
```

- [ ] **Step 4: Create FastAPI main app**

File: `backend/main.py`
```python
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
```

- [ ] **Step 5: Create API router stubs**

File: `backend/api/__init__.py`
```python
```

File: `backend/api/datasets.py`
```python
"""Dataset management endpoints: upload, import, list, delete."""

from fastapi import APIRouter

router = APIRouter()
```

File: `backend/api/analysis.py`
```python
"""Analysis endpoints: trigger, status, results."""

from fastapi import APIRouter

router = APIRouter()
```

File: `backend/api/visualization.py`
```python
"""Visualization data endpoints."""

from fastapi import APIRouter

router = APIRouter()
```

File: `backend/api/prediction.py`
```python
"""Prediction endpoints."""

from fastapi import APIRouter

router = APIRouter()
```

File: `backend/api/export.py`
```python
"""Export endpoints."""

from fastapi import APIRouter

router = APIRouter()
```

- [ ] **Step 6: Verify app starts**

Run: `cd backend && PYTHONPATH=. python -c "from main import app; print('App created:', app.title)"`
Expected: `App created: CASA Dashboard API`

- [ ] **Step 7: Commit**

```bash
git add backend/main.py backend/database.py backend/models/ backend/api/
git commit -m "feat: add FastAPI app setup with database models and API router stubs"
```

---

### Task 8: Dataset API endpoints

**Files:**
- Modify: `backend/api/datasets.py`
- Create: `backend/tests/test_api_datasets.py`

- [ ] **Step 1: Write the failing test**

File: `backend/tests/test_api_datasets.py`
```python
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from database import Base, engine


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
    # Create a minimal Shift-JIS CSV
    data = {
        "番号": [1, 2],
        "種別": [99, 99],
        "座標数": [60, 55],
        "有効性": [1, 1],
        "直線速度[μm/秒]": [80.5, 65.2],
        "曲線速度[μm/秒]": [210.3, 180.5],
        "平均速度[μm/秒]": [120.1, 100.3],
        "直進性": [0.67, 0.65],
        "直線性": [0.38, 0.36],
        "頭部振幅[μm]": [4.5, 3.8],
        "頭部振動数[Hz]": [10.2, 8.5],
        "曲線性": [0.57, 0.56],
    }
    df = pd.DataFrame(data)
    csv_bytes = df.to_csv(index=False).encode("shift_jis")

    resp = client.post(
        "/api/upload",
        data={
            "name": "test_dataset",
            "genotype": "Het",
            "mouse_id": "Het_01",
            "field_num": "1",
            "group": "Het",
        },
        files={"file": ("Motility1.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    assert resp.status_code == 200
    result = resp.json()
    assert result["name"] == "test_dataset"
    assert result["source_type"] == "raw"

    # Verify it appears in list
    resp = client.get("/api/datasets")
    assert len(resp.json()) == 1


def test_import_processed_csv():
    data = {
        "VCL": [210.3, 180.5],
        "VSL": [80.5, 65.2],
        "VAP": [120.1, 100.3],
        "LIN": [0.38, 0.36],
        "STR": [0.67, 0.65],
        "WOB": [0.57, 0.56],
        "ALH": [4.5, 3.8],
        "BCF": [10.2, 8.5],
        "Mouse": ["Het_01", "Het_01"],
        "tSNE1": [1.0, 2.0],
        "tSNE2": [3.0, 4.0],
        "Cluster": [0, 1],
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
    assert result["analysis_status"] == "done"  # Already has t-SNE + clusters


def test_delete_dataset():
    # Upload first
    data = {"VCL": [1.0], "VSL": [1.0]}
    df = pd.DataFrame(data)
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    resp = client.post(
        "/api/import",
        data={"name": "to_delete"},
        files={"file": ("data.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    dataset_id = resp.json()["id"]

    resp = client.delete(f"/api/dataset/{dataset_id}")
    assert resp.status_code == 200

    resp = client.get("/api/datasets")
    assert len(resp.json()) == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_api_datasets.py -v`
Expected: FAIL (endpoints not implemented)

- [ ] **Step 3: Implement dataset endpoints**

File: `backend/api/datasets.py`
```python
"""Dataset management endpoints: upload, import, list, delete."""

import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, UploadFile
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
        from fastapi import HTTPException
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

    # Save uploaded file
    raw_dir = RAW_DIR / ds.id
    raw_dir.mkdir(parents=True, exist_ok=True)
    file_path = raw_dir / file.filename
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    # Quick preprocess to get sperm count
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

    # Save uploaded file
    processed_dir = PROCESSED_DIR / ds.id
    processed_dir.mkdir(parents=True, exist_ok=True)
    file_path = processed_dir / "analyzed.csv"
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    # Detect what's in the file
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
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Clean up files
    for d in [RAW_DIR / dataset_id, PROCESSED_DIR / dataset_id]:
        if d.exists():
            shutil.rmtree(d)

    db.delete(ds)
    db.commit()
    return {"status": "deleted", "id": dataset_id}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_api_datasets.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/api/datasets.py backend/tests/test_api_datasets.py
git commit -m "feat: add dataset upload, import, list, delete API endpoints"
```

---

### Task 9: Analysis API endpoints

**Files:**
- Modify: `backend/api/analysis.py`
- Create: `backend/tests/test_api_analysis.py`

- [ ] **Step 1: Write the failing test**

File: `backend/tests/test_api_analysis.py`
```python
import io
import time
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from database import Base, engine


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


client = TestClient(app)


def _upload_raw_dataset():
    """Helper: upload a raw CSV dataset and return its ID."""
    data = {
        "番号": list(range(1, 21)),
        "種別": [99] * 20,
        "座標数": [60] * 20,
        "有効性": [1] * 20,
        "直線速度[μm/秒]": [80 + i for i in range(20)],
        "曲線速度[μm/秒]": [200 + i * 3 for i in range(20)],
        "平均速度[μm/秒]": [110 + i * 2 for i in range(20)],
        "直進性": [0.6 + i * 0.01 for i in range(20)],
        "直線性": [0.3 + i * 0.01 for i in range(20)],
        "頭部振幅[μm]": [3.5 + i * 0.1 for i in range(20)],
        "頭部振動数[Hz]": [8 + i * 0.2 for i in range(20)],
        "曲線性": [0.5 + i * 0.01 for i in range(20)],
    }
    df = pd.DataFrame(data)
    csv_bytes = df.to_csv(index=False).encode("shift_jis")

    resp = client.post(
        "/api/upload",
        data={"name": "analysis_test", "genotype": "Het", "mouse_id": "Het_01", "field_num": "1", "group": "Het"},
        files={"file": ("Motility1.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    return resp.json()["id"]


def test_trigger_analysis():
    dataset_id = _upload_raw_dataset()
    resp = client.post(f"/api/analyze/{dataset_id}")
    assert resp.status_code == 200
    result = resp.json()
    assert result["status"] in ("running", "done")


def test_get_analysis_result():
    dataset_id = _upload_raw_dataset()
    client.post(f"/api/analyze/{dataset_id}")

    # Poll until done (max 30s)
    for _ in range(30):
        resp = client.get(f"/api/analysis/{dataset_id}")
        if resp.json()["status"] == "done":
            break
        time.sleep(1)

    result = resp.json()
    assert result["status"] == "done"
    assert result["total_sperm"] > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_api_analysis.py -v -x`
Expected: FAIL

- [ ] **Step 3: Implement analysis endpoints**

File: `backend/api/analysis.py`
```python
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
from core.preprocessing import read_casa_csv

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

        # Build file_configs from uploaded files
        file_configs = []
        for csv_file in sorted(raw_dir.glob("*.csv")):
            # Derive metadata from dataset record
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
        return AnalysisResponse(
            dataset_id=dataset_id,
            status="running",
            message="Analysis already in progress",
        )

    # Start background analysis
    thread = threading.Thread(target=_run_analysis_background, args=(dataset_id,))
    thread.start()

    return AnalysisResponse(
        dataset_id=dataset_id,
        status="running",
        message="Analysis started",
    )


@router.get("/analysis/{dataset_id}", response_model=AnalysisResponse)
def get_analysis_status(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    result = AnalysisResponse(
        dataset_id=dataset_id,
        status=ds.analysis_status,
        total_sperm=ds.total_sperm,
        message=ds.analysis_message,
    )

    # Add analyzed sperm count if done
    stats_file = PROCESSED_DIR / dataset_id / "stats.json"
    if stats_file.exists():
        with open(stats_file) as f:
            stats = json.load(f)
        result.analyzed_sperm = stats.get("analyzed_sperm", 0)

    return result
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_api_analysis.py -v --timeout=60`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add backend/api/analysis.py backend/tests/test_api_analysis.py
git commit -m "feat: add analysis trigger and status polling API endpoints"
```

---

### Task 10: Visualization, prediction, and export endpoints

**Files:**
- Modify: `backend/api/visualization.py`
- Modify: `backend/api/prediction.py`
- Modify: `backend/api/export.py`
- Create: `backend/tests/test_api_visualization.py`

- [ ] **Step 1: Write the failing test**

File: `backend/tests/test_api_visualization.py`
```python
import io
import json
import pytest
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, DATA_DIR


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


client = TestClient(app)


def _create_analyzed_dataset():
    """Helper: import a pre-analyzed dataset."""
    np.random.seed(42)
    n = 50
    data = {
        "VCL": np.random.normal(210, 60, n).tolist(),
        "VSL": np.random.normal(75, 35, n).tolist(),
        "VAP": np.random.normal(120, 40, n).tolist(),
        "LIN": np.random.uniform(0.2, 0.8, n).tolist(),
        "STR": np.random.uniform(0.3, 0.9, n).tolist(),
        "WOB": np.random.uniform(0.3, 0.8, n).tolist(),
        "ALH": np.random.normal(4.5, 1.5, n).tolist(),
        "BCF": np.random.normal(10, 3, n).tolist(),
        "Mouse": (["Het_01"] * 25 + ["Het_02"] * 25),
        "Group": ["Het"] * n,
        "tSNE1": np.random.normal(0, 10, n).tolist(),
        "tSNE2": np.random.normal(0, 10, n).tolist(),
        "Cluster": np.random.choice([0, 1, 2, 3, 4], n).tolist(),
    }
    df = pd.DataFrame(data)
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    resp = client.post(
        "/api/import",
        data={"name": "viz_test", "genotype": "Het"},
        files={"file": ("data.csv", io.BytesIO(csv_bytes), "text/csv")},
    )
    return resp.json()["id"]


def test_get_tsne_chart_data():
    dataset_id = _create_analyzed_dataset()
    resp = client.get(f"/api/visualize/{dataset_id}/tsne_landscape")
    assert resp.status_code == 200
    data = resp.json()
    assert "tSNE1" in data
    assert "tSNE2" in data
    assert "Cluster" in data


def test_get_cluster_proportions_chart():
    dataset_id = _create_analyzed_dataset()
    resp = client.get(f"/api/visualize/{dataset_id}/cluster_proportions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert "Mouse" in data[0]


def test_export_csv():
    dataset_id = _create_analyzed_dataset()
    resp = client.get(f"/api/export/{dataset_id}")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers.get("content-type", "")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_api_visualization.py -v`
Expected: FAIL

- [ ] **Step 3: Implement visualization endpoints**

File: `backend/api/visualization.py`
```python
"""Visualization data endpoints: return JSON data for Plotly charts."""

import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd

from database import get_db, DATA_DIR
from models.db_models import Dataset
from core.statistics import compute_baseline_stats, compute_cluster_proportions

router = APIRouter()

PROCESSED_DIR = DATA_DIR / "processed"


def _load_analyzed_df(dataset_id: str) -> pd.DataFrame:
    """Load analyzed CSV for a dataset."""
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
        from core.config import AnalysisConfig
        cfg = AnalysisConfig()
        result = {}
        for param in cfg.TSNE_FEATURES:
            if param in df.columns:
                result[param] = {
                    "values": df[param].tolist(),
                    "cluster": df["Cluster"].tolist() if "Cluster" in df.columns else [],
                    "mouse": df["Mouse"].tolist() if "Mouse" in df.columns else [],
                }
        return result

    elif chart_type == "heatmap":
        from core.config import AnalysisConfig
        cfg = AnalysisConfig()
        # Z-scores by group
        result = []
        for group_name, group_df in df.groupby("Mouse" if "Mouse" in df.columns else "Group"):
            row = {"group": str(group_name)}
            for param in cfg.TSNE_FEATURES:
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
        from core.config import AnalysisConfig
        cfg = AnalysisConfig()
        result = {}
        for param in cfg.ALL_CASA_PARAMS:
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
    """Load multiple datasets for cross-genotype comparison."""
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
```

- [ ] **Step 4: Implement prediction and export endpoints**

File: `backend/api/prediction.py`
```python
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
        # Average proportions across all mice
        cluster_cols = [c for c in props.columns if c != "Mouse"]
        avg_props = props[cluster_cols].mean().values

        # Use built-in reference (placeholder - real data from paper)
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

    return PredictionResponse(
        dataset_id=dataset_id,
        model_type=req.model_type,
        result=result,
    )


def _get_reference_data() -> pd.DataFrame:
    """Load or generate reference population data for cluster classifier.

    TODO: Replace with actual paper reference data when available.
    """
    ref_path = DATA_DIR / "reference" / "reference_populations.csv"
    if ref_path.exists():
        return pd.read_csv(ref_path)

    # Default synthetic reference based on paper descriptions
    np.random.seed(42)
    fertile = pd.DataFrame({
        0: np.random.normal(18, 3, 10),
        1: np.random.normal(15, 3, 10),
        2: np.random.normal(25, 4, 10),
        3: np.random.normal(12, 3, 10),
        4: np.random.normal(30, 4, 10),
        "label": ["fertile"] * 10,
    })
    subfertile = pd.DataFrame({
        0: np.random.normal(32, 4, 10),
        1: np.random.normal(25, 4, 10),
        2: np.random.normal(12, 3, 10),
        3: np.random.normal(20, 3, 10),
        4: np.random.normal(11, 3, 10),
        "label": ["subfertile"] * 10,
    })
    return pd.concat([fertile, subfertile], ignore_index=True)


def _get_reference_coords() -> np.ndarray:
    """Load or generate reference t-SNE coordinates for density scoring."""
    ref_path = DATA_DIR / "reference" / "fertile_coords.npy"
    if ref_path.exists():
        return np.load(ref_path)

    # Default synthetic reference
    np.random.seed(42)
    return np.random.randn(500, 2) * 10
```

File: `backend/api/export.py`
```python
"""Export endpoints."""

from pathlib import Path
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

    return FileResponse(
        path=str(csv_path),
        media_type="text/csv",
        filename=f"{ds.name}_export.csv",
    )
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/test_api_visualization.py -v`
Expected: 3 passed

- [ ] **Step 6: Commit**

```bash
git add backend/api/visualization.py backend/api/prediction.py backend/api/export.py backend/tests/test_api_visualization.py
git commit -m "feat: add visualization, prediction, and export API endpoints"
```

---

## Phase 3: Frontend Foundation

### Task 11: Vite + React + Tailwind project setup

**Files:**
- Create: `frontend/` (via npm create vite)
- Modify: `frontend/vite.config.js`
- Modify: `frontend/package.json`

- [ ] **Step 1: Initialize Vite React project**

```bash
cd /Users/chenjingquan/Desktop/GitHub-Projects/data-visualization/casa-dashboard
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-router-dom axios react-plotly.js plotly.js
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Configure Tailwind**

File: `frontend/vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

File: `frontend/src/index.css`
```css
@import "tailwindcss";
```

- [ ] **Step 3: Create API hook**

File: `frontend/src/hooks/useApi.js`
```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export function useApi() {
  return {
    getDatasets: () => api.get('/datasets').then(r => r.data),
    getDataset: (id) => api.get(`/dataset/${id}`).then(r => r.data),
    uploadFile: (formData) => api.post('/upload', formData).then(r => r.data),
    importFile: (formData) => api.post('/import', formData).then(r => r.data),
    deleteDataset: (id) => api.delete(`/dataset/${id}`).then(r => r.data),
    triggerAnalysis: (id) => api.post(`/analyze/${id}`).then(r => r.data),
    getAnalysis: (id) => api.get(`/analysis/${id}`).then(r => r.data),
    getChartData: (id, type) => api.get(`/visualize/${id}/${type}`).then(r => r.data),
    compareDatasets: (ids) => api.post('/compare', ids).then(r => r.data),
    predict: (id, modelType) => api.post(`/predict/${id}`, { model_type: modelType }).then(r => r.data),
    exportCsv: (id) => `/api/export/${id}`,
  }
}
```

- [ ] **Step 4: Create constants**

File: `frontend/src/utils/constants.js`
```javascript
export const CASA_PARAMS = ['VCL', 'VSL', 'VAP', 'LIN', 'STR', 'WOB', 'ALH', 'BCF']

export const TSNE_FEATURES = ['VCL', 'VSL', 'ALH', 'BCF']

export const PARAM_INFO = {
  VCL: { name: 'Curvilinear Velocity', unit: 'μm/s' },
  VSL: { name: 'Straight-Line Velocity', unit: 'μm/s' },
  VAP: { name: 'Average Path Velocity', unit: 'μm/s' },
  LIN: { name: 'Linearity', unit: '' },
  STR: { name: 'Straightness', unit: '' },
  WOB: { name: 'Wobble', unit: '' },
  ALH: { name: 'Lateral Head Displacement', unit: 'μm' },
  BCF: { name: 'Beat Cross Frequency', unit: 'Hz' },
}

export const CLUSTER_COLORS = ['#4DBBD5', '#E64B35', '#00A087', '#3C5488', '#F39B7F']

export const ANALYSIS_STATUS = {
  pending: { label: 'Pending', color: 'text-yellow-600' },
  running: { label: 'Running', color: 'text-blue-600' },
  done: { label: 'Complete', color: 'text-green-600' },
  error: { label: 'Error', color: 'text-red-600' },
}
```

- [ ] **Step 5: Verify frontend starts**

Run: `cd frontend && npm run dev -- --host 0.0.0.0`
Expected: Vite dev server starts on port 3000

- [ ] **Step 6: Commit**

```bash
cd /Users/chenjingquan/Desktop/GitHub-Projects/data-visualization/casa-dashboard
git add frontend/
git commit -m "feat: initialize Vite + React + Tailwind frontend with API hooks"
```

---

### Task 12: Layout, routing, and global state

**Files:**
- Create: `frontend/src/components/Layout.jsx`
- Create: `frontend/src/context/AppContext.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/main.jsx`
- Create page stubs: `frontend/src/pages/*.jsx`

- [ ] **Step 1: Create AppContext**

File: `frontend/src/context/AppContext.jsx`
```jsx
import { createContext, useContext, useReducer } from 'react'

const AppContext = createContext()

const initialState = {
  datasets: [],
  selectedDatasetId: null,
  loading: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATASETS':
      return { ...state, datasets: action.payload }
    case 'SELECT_DATASET':
      return { ...state, selectedDatasetId: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  return useContext(AppContext)
}
```

- [ ] **Step 2: Create Layout with sidebar**

File: `frontend/src/components/Layout.jsx`
```jsx
import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/data', label: 'Data Management', icon: '◫' },
  { to: '/analysis', label: 'Analysis', icon: '◈' },
  { to: '/prediction', label: 'Prediction', icon: '◇' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">CASA Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Sperm Motility Analysis</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
          CASA Dashboard v2.0
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create page stubs**

File: `frontend/src/pages/Dashboard.jsx`
```jsx
export default function Dashboard() {
  return <div><h2 className="text-2xl font-bold text-gray-900">Dashboard</h2></div>
}
```

File: `frontend/src/pages/DataManagement.jsx`
```jsx
export default function DataManagement() {
  return <div><h2 className="text-2xl font-bold text-gray-900">Data Management</h2></div>
}
```

File: `frontend/src/pages/Analysis.jsx`
```jsx
export default function Analysis() {
  return <div><h2 className="text-2xl font-bold text-gray-900">Analysis & Visualization</h2></div>
}
```

File: `frontend/src/pages/Prediction.jsx`
```jsx
export default function Prediction() {
  return <div><h2 className="text-2xl font-bold text-gray-900">Prediction</h2></div>
}
```

- [ ] **Step 4: Wire up App with routing**

File: `frontend/src/App.jsx`
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataManagement from './pages/DataManagement'
import Analysis from './pages/Analysis'
import Prediction from './pages/Prediction'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/data" element={<DataManagement />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/prediction" element={<Prediction />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
```

File: `frontend/src/main.jsx`
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 5: Verify app renders with navigation**

Run: `cd frontend && npm run dev`
Open browser to http://localhost:3000, verify sidebar and navigation work.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add layout, routing, global state, and page stubs"
```

---

### Task 13: Dashboard and Data Management pages

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`
- Modify: `frontend/src/pages/DataManagement.jsx`
- Create: `frontend/src/components/FileUploader.jsx`
- Create: `frontend/src/components/DataTable.jsx`

- [ ] **Step 1: Create FileUploader component**

File: `frontend/src/components/FileUploader.jsx`
```jsx
import { useState, useRef } from 'react'

export default function FileUploader({ onUpload, mode = 'raw' }) {
  const [dragging, setDragging] = useState(false)
  const [metadata, setMetadata] = useState({
    name: '',
    genotype: '',
    mouse_id: '',
    field_num: '1',
    group: '',
  })
  const fileRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) submitFile(file)
  }

  const submitFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', metadata.name || file.name.replace('.csv', ''))
    formData.append('genotype', metadata.genotype)
    if (mode === 'raw') {
      formData.append('mouse_id', metadata.mouse_id)
      formData.append('field_num', metadata.field_num)
      formData.append('group', metadata.group || metadata.genotype)
    }
    await onUpload(formData, mode)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Dataset name"
          value={metadata.name}
          onChange={e => setMetadata(m => ({ ...m, name: e.target.value }))}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Genotype (e.g. Het, WT, KO)"
          value={metadata.genotype}
          onChange={e => setMetadata(m => ({ ...m, genotype: e.target.value }))}
        />
        {mode === 'raw' && (
          <>
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Mouse ID (e.g. Het_01)"
              value={metadata.mouse_id}
              onChange={e => setMetadata(m => ({ ...m, mouse_id: e.target.value }))}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Field number"
              value={metadata.field_num}
              onChange={e => setMetadata(m => ({ ...m, field_num: e.target.value }))}
            />
          </>
        )}
      </div>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => e.target.files[0] && submitFile(e.target.files[0])}
        />
        <p className="text-gray-500">
          {mode === 'raw'
            ? 'Drop raw CASA CSV here (Shift-JIS or UTF-8)'
            : 'Drop pre-processed CSV here (with t-SNE + Cluster columns)'}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create DataTable component**

File: `frontend/src/components/DataTable.jsx`
```jsx
import { ANALYSIS_STATUS } from '../utils/constants'

export default function DataTable({ datasets, onSelect, onDelete, selectedId }) {
  if (datasets.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">No datasets uploaded yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 px-3">Name</th>
            <th className="py-2 px-3">Genotype</th>
            <th className="py-2 px-3">Sperm</th>
            <th className="py-2 px-3">Source</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map(ds => {
            const status = ANALYSIS_STATUS[ds.analysis_status] || {}
            return (
              <tr
                key={ds.id}
                className={`border-b hover:bg-gray-50 cursor-pointer ${
                  selectedId === ds.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => onSelect(ds.id)}
              >
                <td className="py-2 px-3 font-medium">{ds.name}</td>
                <td className="py-2 px-3">{ds.genotype}</td>
                <td className="py-2 px-3">{ds.total_sperm.toLocaleString()}</td>
                <td className="py-2 px-3">{ds.source_type}</td>
                <td className={`py-2 px-3 ${status.color}`}>{status.label}</td>
                <td className="py-2 px-3">
                  <button
                    className="text-red-500 hover:text-red-700 text-xs"
                    onClick={e => { e.stopPropagation(); onDelete(ds.id) }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Implement Dashboard page**

File: `frontend/src/pages/Dashboard.jsx`
```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useAppState } from '../context/AppContext'
import { ANALYSIS_STATUS } from '../utils/constants'

export default function Dashboard() {
  const api = useApi()
  const { state, dispatch } = useAppState()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDatasets().then(data => {
      dispatch({ type: 'SET_DATASETS', payload: data })
      setLoading(false)
    })
  }, [])

  const datasets = state.datasets

  const stats = {
    total: datasets.length,
    analyzed: datasets.filter(d => d.analysis_status === 'done').length,
    totalSperm: datasets.reduce((sum, d) => sum + d.total_sperm, 0),
    genotypes: [...new Set(datasets.map(d => d.genotype).filter(Boolean))],
  }

  if (loading) return <p className="text-gray-400">Loading...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Datasets', value: stats.total },
          { label: 'Analyzed', value: stats.analyzed },
          { label: 'Total Sperm', value: stats.totalSperm.toLocaleString() },
          { label: 'Genotypes', value: stats.genotypes.join(', ') || '-' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Recent Datasets</h3>
          <button
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => navigate('/data')}
          >
            Manage Data
          </button>
        </div>
        <div className="p-4">
          {datasets.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No datasets yet. Go to Data Management to upload.
            </p>
          ) : (
            <div className="space-y-2">
              {datasets.slice(0, 5).map(ds => (
                <div
                  key={ds.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    dispatch({ type: 'SELECT_DATASET', payload: ds.id })
                    navigate('/analysis')
                  }}
                >
                  <div>
                    <p className="font-medium text-sm">{ds.name}</p>
                    <p className="text-xs text-gray-400">
                      {ds.genotype} &middot; {ds.total_sperm.toLocaleString()} sperm
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${ANALYSIS_STATUS[ds.analysis_status]?.color}`}>
                    {ANALYSIS_STATUS[ds.analysis_status]?.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement Data Management page**

File: `frontend/src/pages/DataManagement.jsx`
```jsx
import { useEffect, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useAppState } from '../context/AppContext'
import FileUploader from '../components/FileUploader'
import DataTable from '../components/DataTable'

export default function DataManagement() {
  const api = useApi()
  const { state, dispatch } = useAppState()
  const [uploadMode, setUploadMode] = useState('raw')
  const [message, setMessage] = useState('')

  const refresh = () => {
    api.getDatasets().then(data => dispatch({ type: 'SET_DATASETS', payload: data }))
  }

  useEffect(() => { refresh() }, [])

  const handleUpload = async (formData, mode) => {
    try {
      setMessage('Uploading...')
      if (mode === 'raw') {
        await api.uploadFile(formData)
      } else {
        await api.importFile(formData)
      }
      setMessage('Upload successful!')
      refresh()
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.detail || err.message}`)
    }
  }

  const handleDelete = async (id) => {
    await api.deleteDataset(id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex gap-4 mb-4">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              uploadMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-100'
            }`}
            onClick={() => setUploadMode('raw')}
          >
            Upload Raw CASA CSV
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              uploadMode === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-100'
            }`}
            onClick={() => setUploadMode('import')}
          >
            Import Processed CSV
          </button>
        </div>
        <FileUploader onUpload={handleUpload} mode={uploadMode} />
        {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Datasets</h3>
        <DataTable
          datasets={state.datasets}
          selectedId={state.selectedDatasetId}
          onSelect={id => dispatch({ type: 'SELECT_DATASET', payload: id })}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify both pages work**

Run: Start backend (`cd backend && PYTHONPATH=. uvicorn main:app --reload`) and frontend (`cd frontend && npm run dev`). Navigate to http://localhost:3000, test Dashboard and Data Management pages.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: implement Dashboard and Data Management pages with file upload"
```

---

## Phase 4: Frontend Visualization

### Task 14: Chart components (t-SNE, cluster proportions, box plots)

**Files:**
- Create: `frontend/src/components/charts/TsneLandscape.jsx`
- Create: `frontend/src/components/charts/ClusterProportions.jsx`
- Create: `frontend/src/components/charts/ParameterBoxPlots.jsx`

- [ ] **Step 1: Create TsneLandscape chart**

File: `frontend/src/components/charts/TsneLandscape.jsx`
```jsx
import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { CLUSTER_COLORS } from '../../utils/constants'

export default function TsneLandscape({ data }) {
  const [colorBy, setColorBy] = useState('cluster')

  const traces = useMemo(() => {
    if (!data?.tSNE1?.length) return []

    if (colorBy === 'cluster') {
      const clusters = [...new Set(data.Cluster)]
      return clusters.map(c => {
        const mask = data.Cluster.map((v, i) => v === c ? i : -1).filter(i => i >= 0)
        return {
          x: mask.map(i => data.tSNE1[i]),
          y: mask.map(i => data.tSNE2[i]),
          mode: 'markers',
          type: 'scattergl',
          name: `Cluster ${c}`,
          marker: { size: 4, color: CLUSTER_COLORS[c] || '#999', opacity: 0.6 },
        }
      })
    } else {
      const mice = [...new Set(data.Mouse)]
      const mouseColors = ['#4DBBD5', '#E64B35', '#00A087', '#3C5488', '#F39B7F']
      return mice.map((m, idx) => {
        const mask = data.Mouse.map((v, i) => v === m ? i : -1).filter(i => i >= 0)
        return {
          x: mask.map(i => data.tSNE1[i]),
          y: mask.map(i => data.tSNE2[i]),
          mode: 'markers',
          type: 'scattergl',
          name: `${m} (n=${mask.length})`,
          marker: { size: 4, color: mouseColors[idx] || '#999', opacity: 0.6 },
        }
      })
    }
  }, [data, colorBy])

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">t-SNE Landscape</h3>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded text-xs ${colorBy === 'cluster' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setColorBy('cluster')}
          >Cluster</button>
          <button
            className={`px-3 py-1 rounded text-xs ${colorBy === 'mouse' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setColorBy('mouse')}
          >Individual</button>
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          xaxis: { title: 't-SNE 1' },
          yaxis: { title: 't-SNE 2' },
          margin: { t: 20, r: 20, b: 50, l: 50 },
          legend: { x: 1, xanchor: 'right', y: 1 },
          height: 500,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create ClusterProportions chart**

File: `frontend/src/components/charts/ClusterProportions.jsx`
```jsx
import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { CLUSTER_COLORS } from '../../utils/constants'

export default function ClusterProportions({ data }) {
  const [stacked, setStacked] = useState(false)

  const traces = useMemo(() => {
    if (!data?.length) return []

    const clusterCols = Object.keys(data[0]).filter(k => k !== 'Mouse')
    const mice = data.map(d => d.Mouse)

    return clusterCols.map((col, idx) => ({
      x: mice,
      y: data.map(d => d[col]),
      name: `Cluster ${col}`,
      type: 'bar',
      marker: { color: CLUSTER_COLORS[idx] || '#999' },
    }))
  }, [data])

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Cluster Proportions</h3>
        <button
          className="px-3 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200"
          onClick={() => setStacked(s => !s)}
        >
          {stacked ? 'Grouped' : 'Stacked'}
        </button>
      </div>
      <Plot
        data={traces}
        layout={{
          barmode: stacked ? 'stack' : 'group',
          xaxis: { title: 'Mouse' },
          yaxis: { title: 'Proportion (%)' },
          margin: { t: 20, r: 20, b: 50, l: 50 },
          height: 400,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create ParameterBoxPlots chart**

File: `frontend/src/components/charts/ParameterBoxPlots.jsx`
```jsx
import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { TSNE_FEATURES, CLUSTER_COLORS } from '../../utils/constants'

export default function ParameterBoxPlots({ data }) {
  const [groupBy, setGroupBy] = useState('cluster')

  const traces = useMemo(() => {
    if (!data || !Object.keys(data).length) return []

    const params = TSNE_FEATURES.filter(p => data[p])
    if (!params.length) return []

    // Use first param to determine groups
    const firstParam = data[params[0]]
    const groups = [...new Set(groupBy === 'cluster' ? firstParam.cluster : firstParam.mouse)]

    return groups.map((g, idx) => {
      const mask = (groupBy === 'cluster' ? firstParam.cluster : firstParam.mouse)
        .map((v, i) => v === g ? i : -1).filter(i => i >= 0)

      return params.map(param => ({
        y: mask.map(i => data[param].values[i]),
        type: 'box',
        name: groupBy === 'cluster' ? `C${g}` : g,
        marker: { color: CLUSTER_COLORS[idx] || '#999' },
        xaxis: undefined,
      }))
    }).flat()
  }, [data, groupBy])

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Parameter Distributions</h3>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded text-xs ${groupBy === 'cluster' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setGroupBy('cluster')}
          >By Cluster</button>
          <button
            className={`px-3 py-1 rounded text-xs ${groupBy === 'mouse' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setGroupBy('mouse')}
          >By Mouse</button>
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          margin: { t: 20, r: 20, b: 50, l: 50 },
          height: 400,
          showlegend: true,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/charts/
git commit -m "feat: add t-SNE landscape, cluster proportions, and box plot chart components"
```

---

### Task 15: Remaining chart components (heatmap, scatter, violin, genotype comparison)

**Files:**
- Create: `frontend/src/components/charts/Heatmap.jsx`
- Create: `frontend/src/components/charts/ScatterPlot.jsx`
- Create: `frontend/src/components/charts/ViolinPlot.jsx`
- Create: `frontend/src/components/charts/GenotypeComparison.jsx`

- [ ] **Step 1: Create Heatmap**

File: `frontend/src/components/charts/Heatmap.jsx`
```jsx
import { useMemo } from 'react'
import Plot from 'react-plotly.js'
import { TSNE_FEATURES } from '../../utils/constants'

export default function Heatmap({ data }) {
  const plotData = useMemo(() => {
    if (!data?.length) return []
    const groups = data.map(d => d.group)
    const values = TSNE_FEATURES.map(param =>
      data.map(d => d[param] || 0)
    )
    return [{
      z: values,
      x: groups,
      y: TSNE_FEATURES,
      type: 'heatmap',
      colorscale: 'RdBu',
      reversescale: true,
    }]
  }, [data])

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-sm mb-2">Parameter Heatmap</h3>
      <Plot
        data={plotData}
        layout={{
          margin: { t: 20, r: 80, b: 50, l: 80 },
          height: 350,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create ScatterPlot**

File: `frontend/src/components/charts/ScatterPlot.jsx`
```jsx
import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'
import { CASA_PARAMS } from '../../utils/constants'

export default function ScatterPlot({ data }) {
  const [xParam, setXParam] = useState('VCL')
  const [yParam, setYParam] = useState('BCF')

  const traces = useMemo(() => {
    if (!data?.[xParam] && !data?.VCL) return []

    const x = data[xParam] || data.VCL || []
    const y = data[yParam] || data.BCF || []
    const groups = data.Mouse || data.Group || []
    const uniqueGroups = [...new Set(groups)]

    return uniqueGroups.map(g => {
      const mask = groups.map((v, i) => v === g ? i : -1).filter(i => i >= 0)
      return {
        x: mask.map(i => x[i]),
        y: mask.map(i => y[i]),
        mode: 'markers',
        type: 'scattergl',
        name: g,
        marker: { size: 4, opacity: 0.5 },
      }
    })
  }, [data, xParam, yParam])

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Scatter Plot</h3>
        <div className="flex gap-2 text-xs">
          <select value={xParam} onChange={e => setXParam(e.target.value)} className="border rounded px-2 py-1">
            {CASA_PARAMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span className="self-center">vs</span>
          <select value={yParam} onChange={e => setYParam(e.target.value)} className="border rounded px-2 py-1">
            {CASA_PARAMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          xaxis: { title: xParam },
          yaxis: { title: yParam },
          margin: { t: 20, r: 20, b: 50, l: 50 },
          height: 400,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create ViolinPlot**

File: `frontend/src/components/charts/ViolinPlot.jsx`
```jsx
import { useMemo } from 'react'
import Plot from 'react-plotly.js'
import { TSNE_FEATURES } from '../../utils/constants'

export default function ViolinPlot({ data }) {
  const traces = useMemo(() => {
    if (!data || !Object.keys(data).length) return []

    return TSNE_FEATURES.filter(p => data[p]).map(param => ({
      type: 'violin',
      y: data[param].values,
      name: param,
      box: { visible: true },
      meanline: { visible: true },
    }))
  }, [data])

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-sm mb-2">Parameter Distributions (Violin)</h3>
      <Plot
        data={traces}
        layout={{
          margin: { t: 20, r: 20, b: 50, l: 50 },
          height: 400,
          showlegend: false,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create GenotypeComparison**

File: `frontend/src/components/charts/GenotypeComparison.jsx`
```jsx
import { useMemo } from 'react'
import Plot from 'react-plotly.js'

export default function GenotypeComparison({ data }) {
  const traces = useMemo(() => {
    if (!data?.tSNE1?.length) return []

    const groups = [...new Set(data.dataset_name || data.Group || [])]
    return groups.map(g => {
      const source = data.dataset_name || data.Group || []
      const mask = source.map((v, i) => v === g ? i : -1).filter(i => i >= 0)
      return {
        x: mask.map(i => data.tSNE1[i]),
        y: mask.map(i => data.tSNE2[i]),
        mode: 'markers',
        type: 'scattergl',
        name: g,
        marker: { size: 4, opacity: 0.5 },
      }
    })
  }, [data])

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="font-semibold text-sm mb-2">Cross-Genotype Comparison</h3>
      <Plot
        data={traces}
        layout={{
          xaxis: { title: 't-SNE 1' },
          yaxis: { title: 't-SNE 2' },
          margin: { t: 20, r: 20, b: 50, l: 50 },
          height: 500,
        }}
        config={{ responsive: true, toImageButtonOptions: { format: 'svg', scale: 3 } }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/charts/
git commit -m "feat: add heatmap, scatter, violin, and genotype comparison chart components"
```

---

### Task 16: Analysis page (wire all charts together)

**Files:**
- Modify: `frontend/src/pages/Analysis.jsx`
- Create: `frontend/src/components/ProgressBar.jsx`

- [ ] **Step 1: Create ProgressBar component**

File: `frontend/src/components/ProgressBar.jsx`
```jsx
export default function ProgressBar({ status, message }) {
  const colors = {
    pending: 'bg-yellow-400',
    running: 'bg-blue-500 animate-pulse',
    done: 'bg-green-500',
    error: 'bg-red-500',
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{message || status}</span>
        <span>{status === 'done' ? '100%' : status === 'running' ? 'Processing...' : ''}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colors[status] || 'bg-gray-400'}`}
          style={{ width: status === 'done' ? '100%' : status === 'running' ? '60%' : '0%' }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement Analysis page**

File: `frontend/src/pages/Analysis.jsx`
```jsx
import { useEffect, useState, useCallback } from 'react'
import { useApi } from '../hooks/useApi'
import { useAppState } from '../context/AppContext'
import ProgressBar from '../components/ProgressBar'
import TsneLandscape from '../components/charts/TsneLandscape'
import ClusterProportions from '../components/charts/ClusterProportions'
import ParameterBoxPlots from '../components/charts/ParameterBoxPlots'
import Heatmap from '../components/charts/Heatmap'
import ScatterPlot from '../components/charts/ScatterPlot'
import ViolinPlot from '../components/charts/ViolinPlot'
import GenotypeComparison from '../components/charts/GenotypeComparison'

export default function Analysis() {
  const api = useApi()
  const { state, dispatch } = useAppState()
  const [analysisStatus, setAnalysisStatus] = useState(null)
  const [charts, setCharts] = useState({})
  const [datasets, setDatasets] = useState([])
  const [compareIds, setCompareIds] = useState([])
  const [compareData, setCompareData] = useState(null)

  const selectedId = state.selectedDatasetId

  useEffect(() => {
    api.getDatasets().then(data => {
      setDatasets(data)
      dispatch({ type: 'SET_DATASETS', payload: data })
    })
  }, [])

  const loadCharts = useCallback(async (id) => {
    const types = ['tsne_landscape', 'cluster_proportions', 'parameter_box', 'heatmap', 'scatter', 'violin']
    const results = {}
    for (const type of types) {
      try {
        results[type] = await api.getChartData(id, type)
      } catch { /* skip unavailable charts */ }
    }
    setCharts(results)
  }, [api])

  useEffect(() => {
    if (!selectedId) return
    api.getAnalysis(selectedId).then(res => {
      setAnalysisStatus(res)
      if (res.status === 'done') loadCharts(selectedId)
    })
  }, [selectedId])

  const handleAnalyze = async () => {
    if (!selectedId) return
    await api.triggerAnalysis(selectedId)
    // Poll status
    const poll = setInterval(async () => {
      const res = await api.getAnalysis(selectedId)
      setAnalysisStatus(res)
      if (res.status === 'done' || res.status === 'error') {
        clearInterval(poll)
        if (res.status === 'done') loadCharts(selectedId)
      }
    }, 2000)
  }

  const handleCompare = async () => {
    if (compareIds.length < 2) return
    const data = await api.compareDatasets(compareIds)
    setCompareData(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analysis & Visualization</h2>
        <div className="flex gap-3 items-center">
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={selectedId || ''}
            onChange={e => dispatch({ type: 'SELECT_DATASET', payload: e.target.value })}
          >
            <option value="">Select dataset...</option>
            {datasets.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name} ({ds.genotype})</option>
            ))}
          </select>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={!selectedId || analysisStatus?.status === 'running'}
            onClick={handleAnalyze}
          >
            {analysisStatus?.status === 'running' ? 'Running...' : 'Run Analysis'}
          </button>
          <a
            href={selectedId ? api.exportCsv(selectedId) : '#'}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            download
          >
            Export CSV
          </a>
        </div>
      </div>

      {analysisStatus && <ProgressBar status={analysisStatus.status} message={analysisStatus.message} />}

      {analysisStatus?.status === 'done' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <TsneLandscape data={charts.tsne_landscape} />
            <ClusterProportions data={charts.cluster_proportions} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <ParameterBoxPlots data={charts.parameter_box} />
            <ScatterPlot data={charts.scatter} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Heatmap data={charts.heatmap} />
            <ViolinPlot data={charts.violin} />
          </div>

          {/* Cross-genotype comparison */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-sm mb-3">Cross-Genotype Comparison</h3>
            <div className="flex gap-3 items-center mb-4">
              <select
                multiple
                className="border rounded-lg px-3 py-2 text-sm h-24"
                value={compareIds}
                onChange={e => setCompareIds([...e.target.selectedOptions].map(o => o.value))}
              >
                {datasets.filter(d => d.analysis_status === 'done').map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                disabled={compareIds.length < 2}
                onClick={handleCompare}
              >
                Compare
              </button>
            </div>
            {compareData && <GenotypeComparison data={compareData} />}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify all charts render**

Run backend + frontend, upload a pre-processed CSV (use `het_sperm_data_with_tsne.csv` from sperm_move_project), and verify all 7 chart types render.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Analysis.jsx frontend/src/components/ProgressBar.jsx
git commit -m "feat: implement Analysis page with all 7 chart types and cross-genotype comparison"
```

---

## Phase 5: Prediction & Docker

### Task 17: Prediction page

**Files:**
- Modify: `frontend/src/pages/Prediction.jsx`
- Create: `frontend/src/components/prediction/ClusterClassifier.jsx`
- Create: `frontend/src/components/prediction/DensityScoring.jsx`

- [ ] **Step 1: Create prediction result components**

File: `frontend/src/components/prediction/ClusterClassifier.jsx`
```jsx
export default function ClusterClassifier({ result }) {
  if (!result) return null

  const { prediction, probability, class_probabilities } = result

  return (
    <div className="space-y-4">
      <div className={`p-6 rounded-xl text-center ${
        prediction === 'fertile' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      } border`}>
        <p className="text-sm text-gray-500">Classification</p>
        <p className={`text-3xl font-bold mt-1 ${
          prediction === 'fertile' ? 'text-green-700' : 'text-red-700'
        }`}>
          {prediction.charAt(0).toUpperCase() + prediction.slice(1)}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Confidence: {(probability * 100).toFixed(1)}%
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-600">Class Probabilities</p>
        {Object.entries(class_probabilities || {}).map(([cls, prob]) => (
          <div key={cls} className="flex items-center gap-3">
            <span className="text-sm w-20">{cls}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${cls === 'fertile' ? 'bg-green-500' : 'bg-red-400'}`}
                style={{ width: `${prob * 100}%` }}
              />
            </div>
            <span className="text-sm w-16 text-right">{(prob * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

File: `frontend/src/components/prediction/DensityScoring.jsx`
```jsx
export default function DensityScoring({ result }) {
  if (!result) return null

  const { similarity_score, js_divergence } = result
  const hue = (similarity_score / 100) * 120 // 0=red, 120=green

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-xl bg-gray-50 border text-center">
        <p className="text-sm text-gray-500">Similarity to Fertile Reference</p>
        <p className="text-5xl font-bold mt-2" style={{ color: `hsl(${hue}, 70%, 40%)` }}>
          {similarity_score.toFixed(1)}
        </p>
        <p className="text-sm text-gray-400 mt-1">/ 100</p>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>Jensen-Shannon Divergence: <span className="font-mono">{js_divergence.toFixed(4)}</span></p>
        <p className="text-xs text-gray-400 mt-2">
          Score 0-100: higher = more similar to fertile reference population.
          Based on KDE density comparison in t-SNE space.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement Prediction page**

File: `frontend/src/pages/Prediction.jsx`
```jsx
import { useEffect, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useAppState } from '../context/AppContext'
import ClusterClassifier from '../components/prediction/ClusterClassifier'
import DensityScoring from '../components/prediction/DensityScoring'

export default function Prediction() {
  const api = useApi()
  const { state, dispatch } = useAppState()
  const [datasets, setDatasets] = useState([])
  const [classifierResult, setClassifierResult] = useState(null)
  const [densityResult, setDensityResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedId = state.selectedDatasetId

  useEffect(() => {
    api.getDatasets().then(data => {
      setDatasets(data.filter(d => d.analysis_status === 'done'))
      dispatch({ type: 'SET_DATASETS', payload: data })
    })
  }, [])

  const runPrediction = async (modelType) => {
    if (!selectedId) return
    setLoading(true)
    setError('')
    try {
      const result = await api.predict(selectedId, modelType)
      if (modelType === 'cluster_classifier') {
        setClassifierResult(result.result)
      } else {
        setDensityResult(result.result)
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Fertility Prediction</h2>

      <div className="flex gap-3 items-center">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={selectedId || ''}
          onChange={e => dispatch({ type: 'SELECT_DATASET', payload: e.target.value })}
        >
          <option value="">Select analyzed dataset...</option>
          {datasets.map(ds => (
            <option key={ds.id} value={ds.id}>{ds.name} ({ds.genotype})</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold">Model A: Cluster Proportion Classifier</h3>
              <p className="text-xs text-gray-400 mt-1">Logistic regression on cluster proportions</p>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              disabled={!selectedId || loading}
              onClick={() => runPrediction('cluster_classifier')}
            >
              {loading ? 'Running...' : 'Predict'}
            </button>
          </div>
          <ClusterClassifier result={classifierResult} />
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold">Model B: Landscape Density Scoring</h3>
              <p className="text-xs text-gray-400 mt-1">KDE + Jensen-Shannon divergence vs fertile reference</p>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              disabled={!selectedId || loading}
              onClick={() => runPrediction('density_scoring')}
            >
              {loading ? 'Running...' : 'Score'}
            </button>
          </div>
          <DensityScoring result={densityResult} />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 text-sm text-gray-500">
        <p className="font-medium text-gray-700 mb-2">Reference</p>
        <p>
          Fernandez-Lopez, P. et al. (2022). "Predicting fertility from sperm motility landscapes."
          <em> Communications Biology</em> 5:1027
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Note: Prediction uses built-in synthetic reference data. For accurate predictions,
          upload actual fertile/subfertile reference populations via the Data Management page.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Prediction.jsx frontend/src/components/prediction/
git commit -m "feat: implement Prediction page with cluster classifier and density scoring"
```

---

### Task 18: Docker setup

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create backend Dockerfile**

File: `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create frontend Dockerfile**

File: `frontend/Dockerfile`
```dockerfile
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

File: `frontend/nginx.conf`
```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 3: Create docker-compose.yml**

File: `docker-compose.yml`
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - casa-data:/app/data
    environment:
      - PYTHONPATH=/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  casa-data:
```

- [ ] **Step 4: Verify Docker build**

Run: `docker-compose build`
Expected: Both images build successfully.

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile frontend/Dockerfile frontend/nginx.conf docker-compose.yml
git commit -m "feat: add Docker configuration for backend and frontend"
```

---

### Task 19: End-to-end verification

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && PYTHONPATH=. python -m pytest tests/ -v`
Expected: All tests pass.

- [ ] **Step 2: Start full stack locally**

```bash
# Terminal 1: Backend
cd backend && PYTHONPATH=. uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

- [ ] **Step 3: Manual verification checklist**

Open http://localhost:3000 and verify:

1. Dashboard page shows empty state
2. Data Management: upload a raw CASA CSV from `sperm_move_project/raw_data/FADS2/Het/Het_01/20260121_165944/Motility1.csv`
3. Data Management: import `sperm_move_project/processed_data/FADS2/Het/het_sperm_data_with_tsne.csv`
4. Analysis: select the imported dataset, verify all 7 charts render
5. Analysis: select the raw dataset, click "Run Analysis", wait for completion, verify charts
6. Prediction: run both Model A and Model B on analyzed dataset
7. Export: download CSV

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: complete CASA Dashboard v2 initial implementation"
```
