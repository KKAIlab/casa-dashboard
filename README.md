# CASA Sperm Motility Dashboard

A browser-based interactive dashboard for Computer-Assisted Sperm Analysis (CASA). Visualize sperm motility landscapes using t-SNE dimensionality reduction and K-Means clustering.

**All computation runs in your browser. No server, no installation, no data upload to the cloud.**

**[Open Dashboard](https://kkailab.github.io/casa-dashboard/)**

---

## What is this?

This tool takes CASA (Computer-Assisted Sperm Analysis) data and creates an interactive **Motility Landscape** — a 2D visualization where each dot is one sperm cell, positioned by its movement characteristics using t-SNE. Cells with similar motility patterns cluster together, revealing subpopulations that traditional mean-based statistics miss.

### What you can do

- **Upload** your CASA CSV files (directly from the CASA software, Japanese or English)
- **Visualize** t-SNE motility landscapes with automatic clustering
- **Compare** different genotypes or treatment groups side-by-side
- **Analyze** cluster proportions and parameter distributions per mouse
- **Predict** fertility potential using reference population comparison

---

## Quick Start Guide

### Step 1: Open the dashboard

Go to **[https://kkailab.github.io/casa-dashboard/](https://kkailab.github.io/casa-dashboard/)**

You'll see a sidebar with 4 pages:
- **Dashboard** — overview of your uploaded datasets
- **Data Management** — upload and manage CSV files
- **Analysis** — run t-SNE and view results
- **Prediction** — compare against reference populations

### Step 2: Upload your data

Click **Data Management** in the sidebar.

**Option A: Upload raw CASA CSV** (from the CASA software directly)

1. Click **"Upload Raw CASA CSV"** (blue button, selected by default)
2. Fill in the form:
   - **Dataset name**: give it a descriptive name (e.g., `WT_mouse1`)
   - **Genotype**: the genotype of this sample (e.g., `WT`, `KO`, `Het`)
   - **Mouse ID**: individual mouse identifier (e.g., `WT_01`)
   - **Group**: experimental group (e.g., `WT`, `KO`)
3. Drag and drop your CSV file into the dashed box (or click to browse)
4. The file will be parsed automatically. Shift-JIS and UTF-8 encodings are both supported.

**Option B: Import pre-processed CSV** (if you already ran t-SNE elsewhere)

1. Click **"Import Processed CSV"** button
2. Fill in Dataset name and Genotype
3. Upload a CSV that already contains `tSNE1`, `tSNE2`, and `Cluster` columns
4. The dashboard will skip computation and display results immediately

### Step 3: Run analysis

Click **Analysis** in the sidebar.

1. Select your dataset from the dropdown (top right)
2. Click **"Run Analysis"**
3. Wait for the computation:
   - Small datasets (<500 sperm): ~30 seconds
   - Medium datasets (~2000 sperm): ~3-5 minutes
   - A progress indicator will show the current step
4. When complete, you'll see:
   - **t-SNE Landscape** — each dot is a sperm, colored by cluster
   - **Cluster Proportions** — bar chart showing cluster distribution per mouse
   - **Parameter Distributions** — box plots of VCL, VSL, ALH, BCF by cluster

> **Tip:** If you imported a pre-processed CSV with existing t-SNE results, you don't need to click "Run Analysis" — the charts appear automatically.

### Step 4: Compare genotypes (optional)

At the bottom of the Analysis page:

1. Hold `Ctrl` (or `Cmd` on Mac) and select 2+ analyzed datasets from the multi-select box
2. Click **"Compare"**
3. A combined t-SNE plot shows all datasets overlaid, colored by group

### Step 5: Predict fertility (optional)

Click **Prediction** in the sidebar.

1. Select an analyzed dataset
2. Upload a **reference CSV** with labeled populations (fertile/subfertile)
3. Choose a prediction model:
   - **Model A**: Compares cluster proportions to reference groups
   - **Model B**: Measures density similarity in t-SNE space

---

## CSV File Format

### Raw CASA CSV (from the software)

The dashboard accepts CSV files directly exported from CASA software. Japanese column headers are automatically mapped:

| Japanese Header | English | Description |
|----------------|---------|-------------|
| 種別 | Type | Sperm type (99 = motile) |
| 曲線速度[um/秒] | VCL | Curvilinear velocity |
| 直線速度[um/秒] | VSL | Straight-line velocity |
| 平均速度[um/秒] | VAP | Average path velocity |
| 直線性 | LIN | Linearity (VSL/VCL) |
| 直進性 | STR | Straightness (VSL/VAP) |
| 曲線性 | WOB | Wobble (VAP/VCL) |
| 頭部振幅[um] | ALH | Lateral head displacement |
| 頭部振動数[Hz] | BCF | Beat cross frequency |

- Both **Shift-JIS** and **UTF-8** encodings are supported
- Only motile sperm (**Type = 99**) are included in analysis
- English column headers work too (if your CASA software exports in English)

### Pre-processed CSV (for import)

If you already ran analysis elsewhere, your CSV should contain:

```
VCL, VSL, VAP, LIN, STR, WOB, ALH, BCF, Mouse, Group, tSNE1, tSNE2, Cluster
```

---

## How It Works

### Analysis Pipeline

```
Raw CASA CSV
    |
    v
[1] Parse CSV (auto-detect encoding)
    |
    v
[2] Map Japanese columns to English
    |
    v
[3] Filter motile sperm (Type = 99)
    |
    v
[4] t-SNE dimensionality reduction
    - Features: VCL, VSL, ALH, BCF
    - Tests perplexities: 5, 10, 30, 50, 100
    - Selects best by KL divergence
    |
    v
[5] K-Means clustering (k=5)
    - Seeded RNG for reproducibility
    |
    v
[6] Statistics
    - Mean/SD per parameter per mouse
    - Cluster proportions per mouse
    - Welch's t-test for group comparison
```

### Data Privacy

- All computation runs **in your browser** using JavaScript
- Your data is stored in **IndexedDB** (browser local storage)
- **Nothing is sent to any server** — the entire app is a static website
- Data persists across page refreshes but is local to your browser/device
- To clear all data: Data Management > click Delete on each dataset

### CASA Parameters Explained

| Parameter | Full Name | What It Measures | Unit |
|-----------|-----------|-----------------|------|
| **VCL** | Curvilinear Velocity | Total distance traveled along the actual path per second | um/s |
| **VSL** | Straight-Line Velocity | Distance from first to last point per second | um/s |
| **VAP** | Average Path Velocity | Distance along a smoothed average path per second | um/s |
| **LIN** | Linearity | How straight the path is (VSL/VCL). 1.0 = perfectly straight | ratio |
| **STR** | Straightness | Straightness relative to average path (VSL/VAP) | ratio |
| **WOB** | Wobble | Side-to-side oscillation (VAP/VCL) | ratio |
| **ALH** | Lateral Head Displacement | Amplitude of head movement perpendicular to average path | um |
| **BCF** | Beat Cross Frequency | How often the head crosses the average path | Hz |

---

## FAQ

**Q: How long does analysis take?**
A: Depends on the number of motile sperm. ~30s for 500, ~3-5 min for 2000. The bottleneck is t-SNE computation in the browser.

**Q: Can I analyze multiple mice together?**
A: Upload each mouse as a separate dataset, run analysis on each, then use the "Compare" feature on the Analysis page.

**Q: My CSV won't upload / shows 0 sperm**
A: Check that your CSV has a `Type` (or `種別`) column. Only rows with `Type = 99` (motile sperm) are included. If your data is already filtered, use "Import Processed CSV" instead.

**Q: The t-SNE plot looks different from my Python analysis**
A: Expected. t-SNE results vary between implementations due to initialization and optimization differences. The clustering patterns should be qualitatively similar.

**Q: Where is my data stored?**
A: In your browser's IndexedDB. It stays on your computer and survives page refreshes. Clearing browser data or using a different browser/device will start fresh.

**Q: Can I export the results?**
A: Currently, you can use the Plotly toolbar on each chart to download as SVG/PNG. CSV export is planned for a future version.

---

## For Developers

### Local Development

```bash
git clone https://github.com/KKAIlab/casa-dashboard.git
cd casa-dashboard/frontend
npm install
npm run dev          # dev server at http://localhost:3000
npm test             # run tests (vitest)
npm run build        # production build to dist/
```

### Architecture

```
frontend/
├── src/
│   ├── engine/          # Analysis engine (pure JS, no dependencies on React)
│   │   ├── config.js        # Fixed CASA parameters
│   │   ├── preprocessing.js # CSV parsing, column mapping, motile filtering
│   │   ├── tsne.js          # t-SNE implementation
│   │   ├── clustering.js    # K-Means + z-score standardization
│   │   ├── statistics.js    # Descriptive stats, Welch's t-test
│   │   ├── prediction.js    # Cluster classifier, density scoring
│   │   └── pipeline.js      # Orchestrates the full analysis
│   ├── db/              # IndexedDB storage layer (idb)
│   ├── hooks/           # React hooks (useDB, useEngine)
│   ├── pages/           # Dashboard, DataManagement, Analysis, Prediction
│   └── components/      # Charts (Plotly), FileUploader, DataTable
├── __tests__/           # Vitest tests for engine and DB
└── vite.config.js       # Vite + React + Tailwind CSS
```

### Tech Stack

- **UI**: React 19, Vite 8, Tailwind CSS 4, React Router (HashRouter)
- **Charts**: Plotly.js via react-plotly.js
- **CSV**: PapaParse
- **Statistics**: jStat
- **Storage**: IndexedDB via idb
- **Deployment**: GitHub Actions -> GitHub Pages

### Tests

```bash
cd frontend && npm test
# 32 tests across 8 test files
# Covers: config, preprocessing, clustering, t-SNE, statistics, prediction, pipeline, IndexedDB
```

---

## Reference

Fernandez-Lopez, P. et al. (2022). "Predicting fertility from sperm motility landscapes." *Communications Biology* 5:1027. doi:10.1038/s42003-022-03986-2

## License

Open source for academic and research purposes.
