# CASA Dashboard v2: Client-Side Migration

## Overview

将 casa-dashboard 从全栈架构（React + FastAPI）迁移为纯客户端应用，使其可直接部署在 GitHub Pages 上，无需后端服务器。

## 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 页面范围 | 全部 4 页 | Dashboard, Data, Analysis, Prediction |
| Reference 数据 | 用户上传 | 不硬编码，由用户提供 fertile reference CSV |
| 数据存储 | IndexedDB | 支持大文件，刷新不丢失 |
| 部署方式 | GitHub Actions CI | push 即自动构建部署 |
| 客户端化方案 | 全 JS 重写 | 零运维，打开即用 |

## 架构

```
GitHub Pages (静态托管)
├── React + Vite (UI 层)
│   ├── Dashboard      — 数据集概览
│   ├── Data Mgmt      — CSV 上传/管理
│   ├── Analysis        — t-SNE + 聚类 + 统计
│   └── Prediction      — 生育力预测
├── Client Engine (计算层，替代后端)
│   ├── PapaParse       — CSV 解析（Shift-JIS/UTF-8）
│   ├── druid.js        — t-SNE 降维
│   ├── K-Means         — 自实现聚类
│   ├── jstat           — 统计检验
│   └── Prediction      — 密度评分 + 比例分类
└── IndexedDB (存储层)
    ├── datasets        — 数据集元信息 + 原始 CSV
    └── results         — 分析结果（t-SNE、聚类、统计）
```

## Engine 模块

### 文件结构

```
frontend/src/engine/
├── preprocessing.js   — CSV 解析、列名映射、运动精子过滤
├── tsne.js            — t-SNE 降维（druid.js）
├── clustering.js      — K-Means 聚类
├── statistics.js      — 基础统计 + Welch's t-test
├── prediction.js      — 聚类比例分类 + 密度评分
└── config.js          — 固定参数（与后端 config.py 一致）
```

### Python → JS 映射

| 后端 Python | 前端 JS | 说明 |
|---|---|---|
| `chardet` + `pd.read_csv` | `PapaParse` + 编码检测 | Shift-JIS/UTF-8 自动识别 |
| `sklearn.manifold.TSNE` | `druid.TSNE` | perplexity 扫描、random_state=42 |
| `sklearn.cluster.KMeans` | 自实现 K-Means | n_clusters=5, n_init=10 |
| `sklearn.preprocessing.StandardScaler` | 自实现 z-score | 均值/标准差标准化 |
| `scipy.stats.ttest_ind` | `jstat.ttest` | Welch's t-test |
| SQLite/数据库 | IndexedDB (`idb`) | datasets + results 表 |

### 固定参数（config.js）

与 `backend/core/config.py` 保持一致：

```js
export const CONFIG = {
  COLUMN_MAPPING: { "番号": "ID", "種別": "Type", ... },
  MOTILE_TYPE: 99,
  ALL_CASA_PARAMS: ["VCL", "VSL", "VAP", "LIN", "STR", "WOB", "ALH", "BCF"],
  TSNE_FEATURES: ["VCL", "VSL", "ALH", "BCF"],
  TSNE_PERPLEXITIES: [5, 10, 30, 50, 100],
  TSNE_MAX_ITER: 1000,
  N_CLUSTERS: 5,
  KMEANS_N_INIT: 10,
  RANDOM_STATE: 42,
}
```

### t-SNE 性能

druid.js 处理精子数据预估：
- 2000 条：3-5 秒
- 5000 条：10-15 秒
- 加进度条提示用户

## IndexedDB 数据模型

```
数据库: CASADashboardDB

表: datasets
├── id          — auto-increment
├── name        — 数据集名称
├── genotype    — 基因型 (WT/KO/Het...)
├── mouseId     — 鼠 ID
├── group       — 分组
├── totalSperm  — 总精子数
├── motileSperm — 运动精子数
├── status      — pending | done | error
├── createdAt   — 时间戳
└── raw         — 原始 CSV 文本

表: results
├── id          — auto-increment
├── datasetId   — 关联 datasets.id
├── tsne        — Float64Array (tSNE1, tSNE2)
├── clusters    — Int8Array (聚类标签)
├── features    — 运动参数数组
├── stats       — JSON (baseline 统计)
└── clusterProps — JSON (聚类比例)
```

封装为 `useDB()` hook，API 与现有 `useApi()` 同构，前端组件改动最小。

## CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd frontend && npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: frontend/dist }
      - uses: actions/deploy-pages@v4
```

Vite 配置需加 `base: '/casa-dashboard/'`。

删除根目录旧文件：`index.html`, `rwt-rko.html`。

## 改动范围

### 新增
- `frontend/src/engine/` — 6 个计算模块
- `frontend/src/db/` — IndexedDB 封装
- `frontend/src/hooks/useEngine.js` — 替代 useApi.js
- `frontend/src/hooks/useDB.js` — 数据库 hook
- `.github/workflows/deploy.yml` — CI/CD

### 修改
- `frontend/vite.config.js` — 加 base path
- `frontend/package.json` — 加依赖（druid, papaparse, idb, jstat）
- `frontend/src/pages/*.jsx` — useApi → useEngine
- `frontend/src/components/FileUploader.jsx` — 本地解析替代 HTTP 上传
- `frontend/src/context/AppContext.jsx` — 加载 IndexedDB 数据

### 删除
- 根目录 `index.html`, `rwt-rko.html`
- `backend/` 目录（保留在 git 历史中，不删除代码）

## 不做的事

- 不做 Web Worker 并行计算（数据量不大，主线程可承受）
- 不做离线 PWA（非必需）
- 不做多语言切换（保持英文界面）
- 不做用户认证（公开静态站）
