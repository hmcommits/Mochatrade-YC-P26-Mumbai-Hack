# MuleNet — Project Plan

Team 3Hacks · Harsh, Tanvi, Shravani

---

## 1. Problem

Legacy fraud systems score transactions one row at a time, so a stolen ₹50,000 split into five ₹10,000 transfers across five mule accounts in seconds looks like five ordinary payments — the network pattern is invisible.

India's new Supreme Court mandate forces banks into an impossible choice: freeze within a 180-second window and risk blocking innocent customers, or wait and let the money vanish through 3–5 hops before cashing out via crypto or ATM. This is enabled by organized mule networks and costs Indian businesses and citizens over ₹1,250+ crore a year.

## 2. Solution

MuleNet models accounts, devices, and transactions as a graph and scores risk with a heterogeneous GNN, using transaction dwell time (ΔT) as the core signal — legitimate money sits in an account; mule money moves through in seconds. When a network is flagged, GNNExplainer extracts the minimal causal subgraph and auto-generates a court-admissible evidence dossier, so the output is a defensible freeze, not a black-box alert.

---

## 3. What to Build

**Build (real, working):**
- Synthetic transaction graph with planted mule rings (scatter → multi-hop → cash-out)
- A genuine heterogeneous graph — 2 node types (Account, Device) — scored by a GraphSAGE model via PyG's `to_hetero`
- Zero-dwell / velocity scoring (ΔT edge weights) — cheap to compute, highly discriminative, your best "this is real ML" moment
- GNNExplainer (or a saliency fallback — see Important Points) producing a causal subgraph
- One-click PDF dossier generated from that subgraph
- 3 UI screens: Overview (graph + risk), Alerts, AI Insights/Dossier

**Don't build — state plainly if asked, don't fake it:**
- Neo4j, Redis, Spring Boot, Node backend, WebSockets, real UPI API, 3D graph, actual cross-bank data sharing

Cutting these isn't a downgrade — it's what makes the parts you do show fully real instead of half-fake. "This works" beats "this is a bigger diagram."

---

## 4. How to Build

### 4.1 Data strategy (build this first — everything depends on it)

There is no public Indian UPI mule-ring dataset, so generate synthetic data that encodes the exact playbook from the problem statement, not random noise:

- N accounts (2,000–5,000 is enough to look real and train fast)
- ~90% normal accounts: random peer-to-peer transactions, Poisson-distributed timing, no ring structure
- ~10% planted mule rings, built from the 4-stage playbook:
  1. Source account receives a large stolen-funds deposit
  2. **Scatter**: fans out to 3–6 mule accounts within seconds (ΔT ≈ 1–5s), roughly equal splits
  3. **Gather**: 3–5 further hops through intermediate mules, ΔT still low — this low-dwell pattern is the core fraud signature
  4. **Cash-out**: terminal transfer to a synthetic off-ramp account
- Label: `is_mule = 1` for every account inside a planted ring, `0` otherwise (binary node classification)
- Device nodes: most accounts get 1 device, but ~15% of mule accounts **share** a device — this is your "ghost emulator farm" signal and your strongest single feature

**Node features:** Account — in/out-degree, total volume, avg ΔT to neighbors, account age, is_new_account. Device — number of linked accounts, device age.
**Edge features:** amount, ΔT = t_out − t_in, hop_index.

### 4.2 Model architecture

```
HeteroData:
  node_types = ['account', 'device']
  edge_types = [('account','transacts','account'),
                ('account','uses','device')]

base_model = GraphSAGE(2 layers, hidden=64)
model = to_hetero(base_model, data.metadata(), aggr='sum')

# per-account output: sigmoid -> risk score 0-100
```

2 layers is enough — mule signal is local (1–2 hops), depth isn't needed. Train on planted labels with binary cross-entropy. Measure your held-out test-set false positive rate and know the number — don't estimate it.

### 4.3 Role split (default — swap based on actual strengths)

- **ML lead**: data generator → HeteroData construction → model training → GNNExplainer/saliency → risk-scoring function
- **Backend**: FastAPI skeleton → ingestion endpoint (velocity calc) → scoring endpoint (calls ML lead's function) → dossier endpoint
- **Frontend**: Next.js shell (4-tab nav) → force-graph wired to live API → Alerts + Transactions tables → dossier "Generate" button + download

Agree the JSON shape of `/score` and `/dossier` responses before anyone writes real code, then don't touch that contract again — it's what lets all three tracks build in parallel against mocks from the start.

### 4.4 Build sequence

1. Lock scope and the API contract
2. Build in parallel against mocks: data generator (ML) · FastAPI skeleton + in-memory graph store (backend) · Next.js shell + force-graph on mock JSON (frontend)
3. Swap mocks for real: train the hetero GraphSAGE model · wire velocity calc and real `/score` · wire Overview/Alerts to the real endpoint
4. Add explainability and the dossier: GNNExplainer/saliency + `/explain` · PDF dossier endpoint · AI Insights tab, Transactions ledger, "Generate Dossier" button
5. Integrate the full pipeline end to end: ingest → score → alert → explain → dossier
6. Script and seed a "hero scenario" — a transaction sequence guaranteed to trigger a clean, dramatic detection for the demo
7. Bug bash and polish: fix model edge cases, API errors, loading states, projector-safe UI
8. Rehearse the live demo and prep Q&A answers (see Other Points)

### 4.5 Fallback ladder — cut in this order if a piece stalls

1. **Hetero model won't train cleanly** → drop the separate Device node type, fold device info into account node features instead. Still real GraphSAGE, still real detection — call it "graph-based," not "heterogeneous," in the pitch.
2. **GNNExplainer broken or too slow** → fall back to input-gradient saliency: rank each neighbor's contribution by `∂risk_score/∂node_feature`. Still produces a ranked causal subgraph. If asked, say plainly it's saliency-based, not full GNNExplainer.
3. **PDF generation broken** → render the dossier as a styled webpage and demo "Print to PDF" from the browser.
4. **Force-graph performance issues** → switch from live physics simulation to a static SVG snapshot re-rendered on each poll.
5. **Never attempt**: Neo4j, Redis, Spring Boot, WebSockets, 3D graph, real UPI API, actual cross-bank federation — these are cut by design, not by time pressure. Don't let them creep back in.

---

## 5. What to Use

| Layer | Use this | Not this | Why |
|---|---|---|---|
| Backend | **FastAPI only** | Spring Boot + Node | One service, one language, no gateway plumbing to debug under pressure |
| Graph store | **In-memory NetworkX**, pickled/JSON snapshot | Neo4j | No Cypher learning curve; `torch_geometric.utils.from_networkx` converts straight to PyG |
| Cache/velocity | **Plain Python dict**, computed at ingest | Redis | Velocity check is just `tx.timestamp - account.last_seen` — a dict lookup does the same job with zero setup |
| ML | **PyTorch Geometric**: `SAGEConv` + `to_hetero()` | Hand-rolled RGCN | `to_hetero` auto-converts a homogeneous model given node/edge metadata — real heterogeneity, far less code |
| Explainability | **PyG `Explainer` + `GNNExplainer`**, fallback: input-gradient saliency | — | See fallback ladder above |
| Frontend | **Next.js + Tailwind + `react-force-graph-2d`** | 3D force graph, custom D3 | 2D is stable and fast to theme; 3D burns hours on camera/lighting for no judging upside |
| Dossier PDF | **WeasyPrint** (HTML/CSS → PDF) | ReportLab canvas API | Reuses HTML/CSS skill you already have instead of a new drawing API |
| Demo hosting | Local laptop, or Vercel (frontend) + ngrok tunnel to FastAPI | Cloud deploy | Don't spend build time on deploy when judges watch a laptop |

---

## 6. Important Points

- **Build the data generator before anything else.** The model, the demo, and the pitch all depend on it — nothing else can start meaningfully until it exists.
- **Measure your false positive rate and know the number.** "99.4% accuracy" with no FPR is the fastest way to lose credibility with judges in FinTech — they will ask.
- **Lock the node/edge feature schema in writing early**, so ML, backend, and frontend aren't debating data shape mid-build.
- **The device-sharing signal (ghost emulator farms) is your strongest feature** — make sure the synthetic generator actually plants it, and that it shows up clearly in the demo.
- **Don't fake what you cut.** If asked about Neo4j, cross-bank federation, or Redis, say directly that they're out of scope for this build and why — that reads as engineering judgment, not as a gap.
- **Script one clean "hero scenario"** you know will trigger a dramatic, correct detection live — don't rely on judges clicking randomly into an untested code path.

---

## 7. Other Points

### Judge Q&A — honest, decisive answers

**"What's your training data?"**
Synthetic transaction graphs generated from the documented mule playbook — planted scatter/gather/cash-out rings with realistic timing. No public Indian UPI mule dataset exists; that's the exact gap a shared registry like I4C/RBI's MuleHunter.AI would fill for production training data.

**"What's your false positive rate?"**
State your actual measured number from the held-out test set. Be upfront that it's a synthetic-data ceiling, not a production guarantee — validating that needs real bank data.

**"How does cross-bank linkage actually work?"**
It's simulated for the demo, as if fed by a shared registry. MuleNet is the detection layer that sits on top of that data-sharing infrastructure, not the infrastructure itself — that's the role the I4C/RBI Innovation Hub MoU is meant to create.

**"Can you really score in the 180-second window?"**
Velocity checks are O(1) at ingest. GNN inference runs on a bounded k-hop subgraph around the transacting accounts, not the whole graph — that's what keeps it fast. Quote your actual measured inference latency; don't estimate it.

### Before you start building

- Repo created, all three invited, branch structure agreed
- PyTorch + PyTorch Geometric installed and import-tested on every laptop in advance — this install is slow and a common early blocker
- Node LTS + pnpm installed
- Node/edge feature schema agreed in writing so there's no mid-build debate
- Dossier HTML/CSS template drafted ahead of time — it only needs data-binding during the build
- Pitch narrative skeleton written: problem → solution → live demo → business model → close, so rehearsal time is spent rehearsing, not authoring
