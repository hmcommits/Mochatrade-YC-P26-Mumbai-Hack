# MuleNet — AI-Powered Mule Account Detection

> **YC P26 Mumbai Hack · Team 3Hacks**
> Harsh · Tanvi · Shravani

[![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-red?logo=pytorch)](https://pytorch.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)

---

## The Problem

Legacy fraud systems score transactions **one row at a time**. A stolen Rs.50,000 split into five Rs.10,000 transfers across five mule accounts in 8 seconds looks like five ordinary payments — the network pattern is completely invisible.

India loses **Rs.1,250+ crore annually** to organised mule networks. The Supreme Court now mandates banks freeze within a **180-second window** — an impossible deadline without graph-native real-time detection.

---

## The Solution

**MuleNet** models accounts, devices, and transactions as a heterogeneous graph and scores risk using a **GraphSAGE GNN** trained on dwell-time (DeltaT) velocity signals.

Core insight: **Legitimate money sits in an account. Mule money moves through in seconds.**

When a mule ring is detected, GNNExplainer extracts the minimal causal subgraph and auto-compiles a **court-admissible evidence dossier** — so the output is a defensible freeze order, not a black-box alert.

---

## Architecture

```
CSV Upload / Live Data
        |
        v
FastAPI Backend (main.py)
  ├── POST /ingest/batch     — bulk transaction ingestion
  ├── GET  /graph            — heterogeneous graph for visualisation
  ├── GET  /alerts           — detected mule ring alerts
  ├── POST /explain/:id      — GNNExplainer edge ablation scores
  ├── GET  /transactions     — paginated raw ledger
  ├── GET  /reports          — RBI SOP auto-generated reports
  └── POST /demo/reset       — reset graph to background snapshot

PyTorch GNN Model (model.py)
  ├── HeteroData graph construction
  │     Nodes: Account, Device, IP Subnet
  │     Edges: account→account (transactions), account→device, device→subnet
  ├── GraphSAGE (2 layers, hidden=64) via PyG to_hetero()
  ├── Zero-dwell / velocity scoring (DeltaT edge weights)
  ├── Scatter-Gather cluster detection
  └── GNNExplainer → minimal causal subgraph

React Frontend (Vite)
  ├── Overview        — D3 force-graph, active investigations panel
  ├── Alerts          — live alert feed with risk scores
  ├── Transactions    — paginated ledger with search + filter
  ├── AI Insights     — GNNExplainer edge attribution scores
  ├── Watchlist       — manual account monitoring
  ├── Reports         — RBI SOP freeze request documents
  ├── Case Mgmt       — evidence dossier management
  └── Data Ingestion  — CSV upload → ML pipeline → auto-navigate
```

---

## Key Technical Signals

| Signal | Why It Works |
|--------|-------------|
| **Dwell time (DeltaT)** | Mule money moves in 1-8 seconds. Legitimate money sits for hours/days. Most discriminative single feature. |
| **Shared device fingerprint** | A single phone/emulator farm operates 5-15 mule accounts. Catch the device, catch the ring. |
| **Scatter-gather topology** | 1 source fans out to N mules simultaneously, then reconsolidates. Unique structural signature. |
| **GNN receptive field** | 2-hop GraphSAGE sees the full scatter-gather subgraph in one forward pass. |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- pip

### 1. Clone the repo

```bash
git clone https://github.com/hmcommits/Mochatrade-YC-P26-Mumbai-Hack.git
cd Mochatrade-YC-P26-Mumbai-Hack
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the FastAPI backend

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be live at: `http://localhost:8000`

### 4. Start the React frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be live at: `http://localhost:8088`

---

## Using MuleNet

### Option A — Upload your own CSV

1. Navigate to **Data Ingestion** in the sidebar
2. Upload a `.csv` file with the following columns:

```
sender_id, receiver_id, amount, timestamp, device_id, ip_subnet
```

Example row:
```
ACC_101, ACC_202, 9500.00, 2026-10-15 14:30:10, DEV_FRAUD_FARM, 198.51.100.0/24
```

3. Click **Analyze Dataset** — the 7-step ML pipeline runs, then auto-navigates to Overview
4. The **Active Investigations** right panel shows detected mule rings
5. Click any case → **Open Evidentiary Dossier** → **Generate Evidence Dossier** (prints to PDF)

### Option B — Load the built-in demo

Click **Load Synthetic Mule Dataset (1-Click)** in Data Ingestion, then Analyze Dataset.

### Option C — Seed the hero scenario

The backend includes a pre-seeded high-confidence scatter-gather ring. Call:
```
POST http://localhost:8000/demo/seed-hero
```

---

## Generating a Synthetic CSV with AI

Use this prompt in ChatGPT, Gemini, or Claude:

```
Generate a synthetic dataset of 30 bank transactions simulating a Scatter-Gather money
laundering ring. Output ONLY valid CSV. First row must be exactly:
sender_id,receiver_id,amount,timestamp,device_id,ip_subnet

Rules:
- amount: pure numbers, no commas or dollar signs (e.g. 1500.50)
- timestamp: YYYY-MM-DD HH:MM:SS format strictly
- Make 1 victim account send large amounts to 4 mule accounts
- All 4 mules share the same device_id (e.g. DEV_FRAUD_FARM)
- Mules immediately forward to 1 destination account within seconds
- Add 20 normal background transactions
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingest` | Ingest single transaction |
| `POST` | `/ingest/batch` | Ingest bulk transactions array |
| `GET` | `/graph?min_risk=40` | Heterogeneous graph for visualisation |
| `GET` | `/stats` | Network-level statistics |
| `GET` | `/alerts` | All detected mule ring alerts |
| `GET` | `/transactions?page=1` | Paginated raw transaction ledger |
| `POST` | `/explain/{account_id}` | GNNExplainer edge ablation scores |
| `GET` | `/reports` | RBI SOP compliance reports |
| `GET` | `/watchlist` | Monitored accounts |
| `POST` | `/watchlist` | Add account to watchlist |
| `POST` | `/demo/reset` | Reset graph to background snapshot |
| `POST` | `/demo/seed-hero` | Seed the canned scatter-gather demo |
| `GET` | `/docs` | FastAPI Swagger UI |

---

## Project Structure

```
Mochatrade-YC-P26-Mumbai-Hack/
├── main.py                     # FastAPI backend + all endpoints
├── model.py                    # PyTorch GNN model definition
├── data_gen.py                 # Synthetic data generator + hero ring
├── requirements.txt            # Python dependencies
├── data/
│   ├── transactions.json       # Background transaction snapshot
│   ├── devices.json            # Device fingerprint map
│   └── labels.json             # Ground-truth mule labels
├── frontend/
│   └── src/
│       ├── App.jsx             # Router + layout
│       ├── context/
│       │   └── DatasetContext.jsx   # Global state management
│       ├── utils/
│       │   ├── api.js          # All backend API calls
│       │   └── csvParser.js    # Robust CSV parser
│       ├── components/
│       │   ├── graph/
│       │   │   └── MuleNetGraph.jsx   # D3 force-directed graph
│       │   ├── common/
│       │   │   └── DossierModal.jsx   # Evidence dossier modal
│       │   └── layout/
│       │       ├── DashboardSidebar.jsx
│       │       └── DashboardTopBar.jsx
│       └── pages/dashboard/
│           ├── OverviewPage.jsx        # Graph + Active Investigations
│           ├── AlertsPage.jsx          # Live alert feed
│           ├── TransactionsPage.jsx    # Paginated ledger
│           ├── AIInsightsPage.jsx      # GNNExplainer UI
│           ├── WatchlistPage.jsx       # Account monitoring
│           ├── ReportsPage.jsx         # RBI SOP documents
│           ├── CaseMgmtPage.jsx        # Case management
│           └── DataInputPage.jsx       # CSV upload + ML pipeline
└── docs/
    └── MuleNet_Project_Plan.md
```

---

## What Is Real vs What Is Simulated

| Feature | Status | Notes |
|---------|--------|-------|
| GraphSAGE GNN model | **Real** | Trained on synthetic graph, live inference on every ingest |
| Dwell-time velocity scoring | **Real** | DeltaT computed on every transaction edge |
| Scatter-gather detection | **Real** | Heuristic + GNN combined scoring |
| GNNExplainer edge ablation | **Real** | Edge importance ranking via direct heuristic proxy |
| Heterogeneous graph | **Real** | Account, Device, IP Subnet node types |
| Evidence dossier | **Real structure** | Auto-compiled from live alert data; not a legal instrument |
| Cross-bank data sharing | **Not built** | Would require RBI API integration |
| Real UPI transaction stream | **Not built** | Uses synthetic + CSV-uploaded data |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ML / GNN | PyTorch, PyTorch Geometric (PyG), NetworkX |
| Backend | FastAPI, Uvicorn, Pydantic |
| Frontend | React 18, Vite, D3.js |
| Visualisation | Custom D3 force-directed graph |
| Styling | Pure CSS custom design system (dark theme) |
| PDF Generation | Browser `window.print()` with print CSS |

---

## Team

| Member | Role |
|--------|------|
| Harsh | Full-stack, ML integration, FastAPI backend |
| Tanvi | ML model, data generation, GNN architecture |
| Shravani | Frontend, UI/UX, evidence dossier design |

---

## Hackathon

**YC P26 · Mumbai Hack · September 2026**

> "This works" beats "this is a bigger diagram."
