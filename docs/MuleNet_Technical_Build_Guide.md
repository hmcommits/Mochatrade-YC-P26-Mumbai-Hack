# MuleNet — Technical Build Guide

Companion to the Project Plan. This is the "exactly how" for dataset, ML, backend, and frontend.

---

## 0. Dataset — how to actually get it

Don't look for a ready-made Indian UPI mule dataset — it doesn't exist publicly. Two moves, both needed:

**A. Generate the graph yourself (primary source, this is non-negotiable)**
You need planted ring labels to train on, and only a generator gives you that. Below is a working structure.

```python
import networkx as nx
import numpy as np
import random
from datetime import datetime, timedelta

random.seed(42); np.random.seed(42)
START = datetime(2026, 1, 1)

def normal_traffic(accounts, n_tx=15000):
    rows = []
    for _ in range(n_tx):
        src, dst = random.sample(accounts, 2)
        amount = float(np.random.lognormal(mean=8, sigma=1.2))
        ts = START + timedelta(seconds=random.randint(0, 60*60*24*90))
        # normal money sits around for hours/days before moving again
        dwell = float(np.random.exponential(scale=3600 * 8))
        rows.append(dict(src=src, dst=dst, amount=amount, ts=ts, dwell=dwell, is_mule=0))
    return rows

def mule_ring(accounts_pool, ring_id):
    source = random.choice(accounts_pool)
    fanout = random.randint(3, 6)
    mules = random.sample(accounts_pool, fanout)
    stolen = float(np.random.uniform(20000, 100000))
    split = stolen / fanout
    t0 = START + timedelta(seconds=random.randint(0, 60*60*24*90))
    rows, ring_accounts = [], set(mules)

    # scatter: near-zero dwell, this is the core fraud signature
    for i, m in enumerate(mules):
        rows.append(dict(src=source, dst=m, amount=split,
                          ts=t0 + timedelta(seconds=i), dwell=random.uniform(1, 5), is_mule=1))

    # gather: 2-4 more hops
    current = mules
    for hop in range(random.randint(2, 4)):
        nxt = random.sample(accounts_pool, len(current))
        for a, b in zip(current, nxt):
            rows.append(dict(src=a, dst=b, amount=split * random.uniform(0.9, 1.0),
                              ts=t0 + timedelta(minutes=hop + 1), dwell=random.uniform(1, 8), is_mule=1))
        ring_accounts.update(nxt)
        current = nxt

    # cash-out
    offramp = f"OFFRAMP_{ring_id}"
    for a in current:
        rows.append(dict(src=a, dst=offramp, amount=split,
                          ts=t0 + timedelta(minutes=10), dwell=random.uniform(1, 10), is_mule=1))
    return rows, ring_accounts

accounts = [f"ACC_{i}" for i in range(3000)]
all_rows = normal_traffic(accounts, 15000)
mule_labels = set()
for i in range(40):  # ~40 rings, tune until ~10% of accounts are mules
    rows, ring = mule_ring(accounts, i)
    all_rows += rows
    mule_labels |= ring
```

**Device assignment** — give most accounts one unique device; deliberately share a device across ~15% of mule accounts within the same ring. This single feature (shared device fingerprint) is your strongest signal — don't skip it:

```python
devices = {a: f"DEV_{i}" for i, a in enumerate(accounts)}
mule_list = list(mule_labels)
for ring_start in range(0, len(mule_list), 6):
    ring_slice = mule_list[ring_start: ring_start + 6]
    if random.random() < 0.6 and len(ring_slice) >= 2:
        shared = f"DEV_SHARED_{ring_start}"
        for a in random.sample(ring_slice, max(2, len(ring_slice)//2)):
            devices[a] = shared
```

**B. Anchor it against a real public dataset — links and exact steps**

Your own generator (above) is still what you train on and demo — it's the only source that gives you guaranteed planted labels matching your exact playbook. These two public datasets exist to make your generator's numbers realistic instead of guessed, and to give you a citable, credible source when judges ask "is this grounded in anything real." Assume zero prior Kaggle experience — here's the whole path.

**Dataset 1 — IBM Transactions for Anti-Money Laundering (AML)** *(the better fit — has real graph structure and laundering labels)*
Link: `https://www.kaggle.com/datasets/ealtman2019/ibm-transactions-for-anti-money-laundering-aml`

This is a synthetic-but-published dataset (IBM, used in NeurIPS research) simulating a virtual world of banks and accounts, with real transaction-graph structure — every row has a sender account, a receiver account, an amount, a timestamp, and an `Is Laundering` flag. It comes in 6 files: HI-Small, LI-Small, HI-Medium, LI-Medium, HI-Large, LI-Large ("HI" = higher illicit ratio, "LI" = lower/more realistic ratio). **Use `HI-Small_Trans.csv`** — higher illicit ratio means more fraud examples to learn from in limited time, and "Small" keeps it manageable on a laptop. Each size also ships a matching `*_Patterns.txt` file — this lists the exact account IDs involved in each known laundering pattern (fan-out, fan-in, gather-scatter, cycle, etc.). That file is a shortcut straight to real, pre-labeled ring examples — pull a few of these directly to seed your demo instead of hunting for rings yourself.

Steps, assuming you've never touched Kaggle:
1. Go to `kaggle.com` → click **Register** (top right) → sign up free with Google or email. No verification wait, you can use it immediately.
2. Open the dataset link above. You'll land on the dataset's overview page.
3. Click the **Data Explorer** tab (or the file list on the left side of the page) — it shows each CSV/txt file individually rather than one giant zip.
4. Find `HI-Small_Trans.csv` and `HI-Small_Patterns.txt` in that list and click the download icon next to each one individually — don't download the full bundle, you don't need the Medium/Large files.
5. **If you'd rather not download anything at all:** click **New Notebook** on the dataset page instead. This opens a free Kaggle cloud notebook (runs in your browser, no install) with the dataset already mounted at `/kaggle/input/ibm-transactions-for-anti-money-laundering-aml/`. You can explore it there and export just a trimmed CSV to your laptop — this is the path with the least setup.
6. Once you have the CSV locally, load it:

```python
import pandas as pd
df = pd.read_csv("HI-Small_Trans.csv")
df.columns
# Timestamp, From Bank, Account, To Bank, Account.1,
# Amount Received, Receiving Currency, Amount Paid,
# Payment Currency, Payment Format, Is Laundering
```

7. Map it into the same shape your generator produces, so everything downstream (HeteroData construction, training) doesn't care which source it came from:

```python
mapped = df.rename(columns={
    "Account": "src", "Account.1": "dst",
    "Amount Paid": "amount", "Timestamp": "ts", "Is Laundering": "is_mule"
})[["src", "dst", "amount", "ts", "is_mule"]]
```

8. Use it two ways: (a) sample `mapped[mapped.is_mule == 0]`'s amount and inter-transaction-time distributions to replace the guessed `lognormal`/`exponential` parameters in your own generator's `normal_traffic()` function, and (b) pull the account IDs listed in `HI-Small_Patterns.txt` for a couple of laundering patterns and inject those exact real sub-rings into your training graph alongside your own planted rings — real labeled examples, not just synthetic ones.

There's no `device_id` column in this dataset — keep using your own synthetic device-sharing overlay (the code above §0.A) on top of it; that signal doesn't exist in any public dataset and has to stay self-generated either way.

**Dataset 2 — PaySim (simpler, optional, use only if IBM's file feels like too much)**
Link: `https://www.kaggle.com/datasets/ealaxi/paysim1`
Same signup process as above. This is a mobile-money simulator with columns `step, type, amount, nameOrig, nameDest, isFraud` — no graph-linking structure, just transaction-level fraud labels. It's useful only for one thing: realistic amount and timing distributions, the same role described in step 8 above. If you've already pulled distributions from the IBM dataset, skip this one entirely — it adds no graph structure the IBM dataset doesn't already give you.

Build order: get your own generator's pipeline working end to end first with the guessed parameters, then swap in real distributions and real seeded rings from the IBM dataset if time remains. Don't let downloading or exploring either public dataset block the pipeline — it's a realism upgrade, not a dependency.

---

## 1. ML — exact build

### 1.1 Turn the transaction rows into a PyG HeteroData object

```python
import torch
from torch_geometric.data import HeteroData

account_ids = sorted(set(a for r in all_rows for a in (r['src'], r['dst']) if not a.startswith('OFFRAMP')))
acc_idx = {a: i for i, a in enumerate(account_ids)}
device_ids = sorted(set(devices.values()))
dev_idx = {d: i for i, d in enumerate(device_ids)}

data = HeteroData()
data['account'].x = build_account_features(account_ids, all_rows)   # [num_accounts, F]
data['account'].y = torch.tensor([1 if a in mule_labels else 0 for a in account_ids])
data['device'].x = build_device_features(device_ids, devices)       # [num_devices, F]

tx_edges = [(acc_idx[r['src']], acc_idx[r['dst']]) for r in all_rows if r['src'] in acc_idx and r['dst'] in acc_idx]
data['account', 'transacts', 'account'].edge_index = torch.tensor(tx_edges).t().contiguous()
data['account', 'transacts', 'account'].edge_attr = build_edge_features(all_rows)  # amount, dwell, hop

use_edges = [(acc_idx[a], dev_idx[d]) for a, d in devices.items() if a in acc_idx]
data['account', 'uses', 'device'].edge_index = torch.tensor(use_edges).t().contiguous()
```

`build_account_features` should return, per account: in-degree, out-degree, total volume, mean dwell time to neighbors, account age (synthetic, assign randomly), is_new_account flag. `build_device_features`: number of linked accounts, device age. Compute these with plain pandas groupby over `all_rows` — don't overengineer this part.

### 1.2 Model — heterogeneous GraphSAGE via `to_hetero`

```python
from torch_geometric.nn import SAGEConv, to_hetero
import torch.nn.functional as F

class SAGE(torch.nn.Module):
    def __init__(self, hidden=64, out=1):
        super().__init__()
        self.conv1 = SAGEConv((-1, -1), hidden)
        self.conv2 = SAGEConv((-1, -1), out)
    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index).relu()
        return self.conv2(x, edge_index)

model = to_hetero(SAGE(), data.metadata(), aggr='sum')
```

`to_hetero` inspects `data.metadata()` (node types + edge types) and duplicates the message-passing logic per relation automatically — this is what gives you genuine heterogeneity without hand-writing RGCN.

### 1.3 Train

```python
train_mask, test_mask = split_accounts(account_ids, test_frac=0.2)  # stratified by label
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

for epoch in range(100):
    model.train()
    optimizer.zero_grad()
    out = model(data.x_dict, data.edge_index_dict)['account'].squeeze()
    loss = F.binary_cross_entropy_with_logits(out[train_mask], data['account'].y[train_mask].float())
    loss.backward()
    optimizer.step()

# after training: measure and record this, don't skip it
model.eval()
with torch.no_grad():
    probs = torch.sigmoid(model(data.x_dict, data.edge_index_dict)['account'].squeeze())
    preds = (probs > 0.5).int()
    fp = ((preds == 1) & (data['account'].y == 0))[test_mask].sum()
    tn = ((preds == 0) & (data['account'].y == 0))[test_mask].sum()
    fpr = fp / (fp + tn)
    print("Test FPR:", fpr.item())

torch.save(model.state_dict(), "mulenet_model.pt")
```

Train once, save the checkpoint, load it at backend startup. Never retrain live during the demo.

### 1.4 Scoring a single account at inference time

Don't run the full graph through the model on every request — pull a bounded k-hop subgraph around the account being scored, so latency stays low regardless of total graph size:

```python
def score_account(account_id, G, model, k=2):
    sub = nx.ego_graph(G, account_id, radius=k)
    sub_data = to_hetero_data(sub, devices)   # same construction as 1.1, scoped to `sub`
    with torch.no_grad():
        out = model(sub_data.x_dict, sub_data.edge_index_dict)['account'].squeeze()
    idx = list(sub.nodes()).index(account_id)
    return round(float(torch.sigmoid(out[idx])) * 100, 1)
```

### 1.5 Explainability — GNNExplainer, with a fallback you'll likely need

```python
from torch_geometric.explain import Explainer, GNNExplainer

explainer = Explainer(
    model=model,
    algorithm=GNNExplainer(epochs=100),
    explanation_type='model',
    node_mask_type='attributes',
    edge_mask_type='object',
    model_config=dict(mode='binary_classification', task_level='node', return_type='raw'),
)
explanation = explainer(sub_data.x_dict, sub_data.edge_index_dict, index=idx)
```

**Flag this honestly:** PyG's `Explainer` on `HeteroData` is less mature than on homogeneous graphs and can throw shape/masking errors depending on your PyG version. Budget time to hit this wall. If it doesn't cooperate, use **edge-ablation importance** instead — simpler, robust, and easy to explain to judges as "we remove each edge and measure the score drop":

```python
def edge_importance(account_id, G, model, k=2, top_n=8):
    sub = nx.ego_graph(G, account_id, radius=k)
    base = score_account(account_id, sub, model)
    scores = []
    for u, v in sub.edges():
        trimmed = sub.copy(); trimmed.remove_edge(u, v)
        drop = base - score_account(account_id, trimmed, model)
        scores.append((u, v, drop))
    return sorted(scores, key=lambda t: -t[2])[:top_n]
```

Either path returns the same shape of output the backend needs: a small set of nodes/edges ranked by importance — that's your "causal subgraph" for the dossier.

---

## 2. Backend — exact build

Single FastAPI service. In-memory `networkx.MultiDiGraph` as the graph store — no external DB.

### 2.1 App skeleton and graph store

```python
from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
import networkx as nx

app = FastAPI()
G = nx.MultiDiGraph()
model = load_model_checkpoint("mulenet_model.pt")   # loaded once at startup

class Transaction(BaseModel):
    src: str
    dst: str
    amount: float
    timestamp: datetime
    device_id: str | None = None
```

### 2.2 Ingest — this is where velocity/dwell gets computed

```python
@app.post("/ingest")
def ingest(tx: Transaction):
    last_seen = G.nodes.get(tx.src, {}).get('last_seen')
    dwell = (tx.timestamp - last_seen).total_seconds() if last_seen else None
    G.add_edge(tx.src, tx.dst, amount=tx.amount, ts=tx.timestamp, dwell=dwell)
    G.nodes[tx.dst]['last_seen'] = tx.timestamp
    if tx.device_id:
        G.add_edge(tx.src, tx.device_id, kind='uses')
    return {"status": "ok", "dwell_seconds": dwell}
```

This is your entire "velocity check" — no Redis needed, it's an O(1) dict lookup on the node.

### 2.3 Score, graph, alerts, explain, dossier

```python
@app.get("/score/{account_id}")
def score(account_id: str):
    risk = score_account(account_id, G, model)
    return {"account_id": account_id, "risk_score": risk,
            "factors": get_risk_factors(G, account_id)}  # e.g. ["low dwell time", "shared device"]

@app.get("/graph")
def graph(min_risk: float = 0):
    return {"nodes": [...], "edges": [...]}  # filtered/scored for the force-graph

@app.get("/alerts")
def alerts(threshold: float = 70):
    flagged = [a for a in G.nodes if score_account(a, G, model) >= threshold]
    return [{"account_id": a, "risk_score": score_account(a, G, model),
             "pattern": classify_pattern(G, a)} for a in flagged]

@app.post("/explain/{account_id}")
def explain(account_id: str):
    subgraph = edge_importance(account_id, G, model)  # or GNNExplainer path
    return {"account_id": account_id, "causal_subgraph": subgraph}

@app.post("/dossier/{account_id}")
def dossier(account_id: str):
    from weasyprint import HTML
    from jinja2 import Environment, FileSystemLoader
    ctx = build_dossier_context(account_id, G, model)  # score, factors, subgraph, device hashes, timeline
    html = Environment(loader=FileSystemLoader("templates")).get_template("dossier.html").render(**ctx)
    pdf = HTML(string=html).write_pdf()
    return Response(pdf, media_type="application/pdf",
                     headers={"Content-Disposition": f"attachment; filename=dossier_{account_id}.pdf"})
```

`classify_pattern` is simple rule logic layered on top of the GNN score for a human-readable tag (e.g., high fan-out in a short window → "Scatter-Gather"; shared device across ≥2 flagged accounts → "Device Hash Match") — this is what fills the Alert type badges in the frontend without needing a separate model.

Build `templates/dossier.html` early (before the endpoint), in plain HTML/CSS — the same skill your frontend dev already has. The endpoint just binds data into it.

---

## 3. Frontend — every screen, in detail

**Global shell:** dark theme (near-black background, one accent color for brand, red/amber/green reserved strictly for risk level — don't reuse them decoratively). Left sidebar with icon + label nav: **Overview, Alerts, Transactions, AI Insights**. Top bar: account search box, a live-connection indicator ("● Live"), and the overall network risk number displayed prominently (top-right, large font, colored by severity).

Keep the sidebar visually complete by also listing **Watchlist, Reports, Case Management, Settings** as grayed-out/disabled nav items — this signals product maturity to judges without costing you build time. Don't build their logic.

### 3.1 Overview

**Purpose:** the "wow" screen — live graph, risk at a glance.

- **Center:** large force-directed graph (`react-force-graph-2d`). Account nodes as circles, device nodes as small squares (shape difference makes shared-device rings visually obvious at a glance). Node color = risk (grey/green = clean, amber = medium, red = flagged mule). Edge thickness = transaction amount; edge color intensity = low dwell time (near-instant transfers glow brighter).
- **Top-right card:** overall network risk score as a large number/gauge (e.g. "96/100"), plus a one-line status ("High-risk transaction pattern detected").
- **Below that:** a short live feed of the last few detections as small toast-style entries — each with the account ID, one-line reason ("Rapid fund dispersal", "Shared device detected"), and an **"Investigate Now"** button that highlights that account's subgraph on the main graph and jumps focus to it.
- **Controls above/below the graph:** a risk-threshold slider (hide nodes below X risk, keeps the graph legible as it grows), a search box to jump to a specific account ID, and a **Reset** button to re-center/re-run the force layout.
- **Bottom-left legend:** small fixed panel explaining node color and shape meaning — don't make judges guess.

### 3.2 Alerts

**Purpose:** the actionable queue — this is what a bank analyst would actually work from.

- **Top bar:** title "Actionable Alerts", an **Acknowledge All** button (top-right), and a filter dropdown (by pattern type / severity).
- **List, one card per alert**, each showing:
  - Pattern badge (Scatter-Gather / Device Hash Match / Structuring / Dormant Wakeup), color-coded by severity
  - Account ID and a one-line description ("High-velocity fund dispersal detected across 4 mule accounts")
  - Risk score badge
  - Timestamp ("2m ago" style)
  - Two icon buttons on the right: a checkmark (**Acknowledge** — marks reviewed, removes from active queue) and an eye/expand icon (**View** — opens the detail drawer with the account's subgraph and factors)
- Clicking a card (not just the icons) should also open the detail view — don't make the icons the only click target.

### 3.3 Transactions

**Purpose:** the raw ledger, for anyone who wants to verify the graph isn't a black box.

- **Table columns:** Transaction ID, Timestamp, Source account, Destination account, Amount, **Dwell (ΔT)**, Risk score, Status (OK / Flagged / Monitoring), and a view-detail icon per row.
  - Surface dwell time as its own column, not buried — it's the core signal of the whole system and judges should be able to see it directly.
- **Top bar:** filter controls (risk level, status, date range), a search box (by account or transaction ID), and an **Export CSV** button (top-right — matches the "table of raw evidence" role this screen plays).
- **Row click:** opens a side panel with full transaction detail plus a mini-graph of the immediate neighborhood.

### 3.4 AI Insights (this is where the dossier lives)

**Purpose:** show the model is real, then produce the artifact judges can hold.

- **Top row of stat cards:** Detection accuracy (small print/tooltip stating this is measured on the synthetic test set, not production — don't let a bare percentage stand alone), number of active clusters, total nodes scanned, GNN inference latency.
- **Model panel:** a card labeled "Graph Neural Network (H-GNN)" with a small bar chart of feature importance (pulls straight from your edge-ablation / GNNExplainer output) and a short anomaly-detection-rate sparkline.
- **Selected-account explainer view:** when an account is selected (from Alerts, Transactions, or Overview), render its causal subgraph here as a small, clean mini force-graph — just the minimal set of nodes/edges the explainer flagged, with each edge labeled by its importance score. This is the visual proof behind the dossier.
- **Primary CTA — "Generate Dossier" button:** large, unmissable, placed directly under the selected-account explainer. On click: show a brief loading state ("Generating evidentiary dossier…"), then a **Download PDF** button once the `/dossier` call returns.
- **Below the button:** a small checklist mirroring what the PDF actually contains — Visual subgraph, Account details, Device fingerprints (hashes), Transaction timeline, Audit trail — so judges see the mapping between what's on screen and what's in the document before they even open it.

Build order for frontend matches the plan's build sequence: shell + nav first, Overview wired to mock data second, Alerts/Transactions third, AI Insights + dossier button last — it depends on every other endpoint being live.
