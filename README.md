# CASA Sperm Motility Dashboard

A client-side interactive dashboard for Computer-Assisted Sperm Analysis (CASA). Runs entirely in the browser — no backend required.

**[Live Dashboard](https://kkailab.github.io/casa-dashboard/)**

## Features

### 4 Pages

| Page | Function |
|------|----------|
| **Dashboard** | Dataset overview, summary statistics |
| **Data Management** | Upload raw CASA CSV (Shift-JIS/UTF-8), import pre-processed data |
| **Analysis** | t-SNE motility landscape, K-Means clustering, parameter distributions, cross-genotype comparison |
| **Prediction** | Cluster proportion classifier, density-based fertility scoring |

### Analysis Engine (runs in browser)

- **t-SNE**: Multi-perplexity sweep with KL divergence selection (pure JS implementation)
- **K-Means**: 5 clusters, seeded RNG for reproducibility (matches sklearn output)
- **Statistics**: Baseline stats per mouse, cluster proportions, Welch's t-test
- **Prediction**: Nearest-centroid classifier + Jensen-Shannon density scoring

### CASA Parameters

| Parameter | Full Name | Unit |
|-----------|-----------|------|
| VCL | Curvilinear Velocity | um/s |
| VSL | Straight-Line Velocity | um/s |
| VAP | Average Path Velocity | um/s |
| ALH | Lateral Head Displacement | um |
| BCF | Beat Cross Frequency | Hz |
| LIN | Linearity (VSL/VCL) | - |
| STR | Straightness (VSL/VAP) | - |
| WOB | Wobble (VAP/VCL) | - |

## Quick Start

### Import pre-processed data (recommended)

1. Open the [dashboard](https://kkailab.github.io/casa-dashboard/)
2. Go to **Data Management** > **Import Processed CSV**
3. Upload a CSV with columns: `VCL, VSL, VAP, LIN, STR, WOB, ALH, BCF, Mouse, Group, tSNE1, tSNE2, Cluster`
4. Go to **Analysis** to view the t-SNE landscape

### Upload raw CASA CSV

1. Go to **Data Management** > **Upload Raw CASA CSV**
2. Fill in metadata (Dataset name, Genotype, Mouse ID, Group)
3. Upload your CASA output CSV (Shift-JIS or UTF-8, Japanese or English headers)
4. Go to **Analysis** > select dataset > **Run Analysis**
5. Wait for t-SNE computation (~3-5 min for 2000 sperm)

### CSV requirements

Raw CASA CSV should contain these columns (Japanese or English):

```
Type (種別), VCL (曲線速度), VSL (直線速度), VAP (平均速度),
LIN (直線性), STR (直進性), WOB (曲線性),
ALH (頭部振幅), BCF (頭部振動数)
```

Only motile sperm (Type = 99) are included in analysis.

## Architecture

```
Browser (GitHub Pages)
├── React 19 + Vite 8 (UI)
├── Client-side Engine
│   ├── PapaParse (CSV parsing)
│   ├── Custom t-SNE (JS, no external deps)
│   ├── Custom K-Means (seeded Mulberry32 RNG)
│   └── jStat (statistical tests)
└── IndexedDB (persistent storage, survives refresh)
```

No backend server. All computation happens locally in your browser. Data never leaves your machine.

## Development

```bash
cd frontend
npm install
npm run dev        # dev server on localhost:3000
npm test           # run vitest
npm run build      # production build
```

## Tech Stack

- React 19, Vite 8, Tailwind CSS 4
- Plotly.js (interactive plots)
- PapaParse (CSV), jStat (statistics)
- IndexedDB via idb (persistent storage)
- GitHub Actions (CI/CD to Pages)

## Reference

Fernandez-Lopez, P. et al. (2022). "Predicting fertility from sperm motility landscapes." *Communications Biology* 5:1027

## License

Open source for academic and research purposes.
