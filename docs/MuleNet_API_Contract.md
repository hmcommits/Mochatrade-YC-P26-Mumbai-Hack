Here is the finalized and complete API contract, updated with the missing network stats, the unified `Edge` schema, and the demo endpoints for your hackathon pitch.

```markdown
# MuleNet — API Contract

Single FastAPI service. This is the frozen contract — agree it before anyone writes real endpoint code, then don't change field names mid-build; extend with new optional fields instead.

---

## Conventions

- Base URL (local dev): `http://localhost:8000`
- All request/response bodies are JSON, `Content-Type: application/json`, except `/dossier` which returns a PDF binary.
- Timestamps are ISO 8601 strings, UTC: `"2026-09-11T14:32:07Z"`.
- IDs are strings everywhere (`ACC_1042`, `DEV_88`, `TXN_88213`) — never assume they're numeric, even if generated sequentially.
- Risk scores are floats `0–100`, one decimal place.
- No auth for the hackathon build — every endpoint is open. Note this explicitly if a judge asks; it's a stated scope cut, not an oversight.
- The frontend polls rather than subscribes — no WebSocket in this build. Recommended poll intervals: `/graph` and `/alerts` every 5s while the Overview/Alerts tab is active, `/stats` every 10s.
- Errors always return this shape, with a standard HTTP status code:

```json
{ "error": "account_not_found", "message": "No account with id ACC_9999" }

```

---

## Shared Schemas

**RiskFactor**

```json
{ "code": "LOW_DWELL_TIME", "label": "Near-zero dwell time (2.1s)" }

```

`code` is one of: `LOW_DWELL_TIME`, `SHARED_DEVICE`, `HIGH_FANOUT`, `MULTI_HOP_ROUTING`, `NEW_ACCOUNT`, `HIGH_VOLUME_SPIKE`.

**Node**

```json
{
  "id": "ACC_1042",
  "type": "account",              // "account" | "device"
  "risk_score": 87.4,             // null for device nodes
  "label": "ACC_1042"
}

```

**Edge**

```json
{
  "source": "ACC_1042",
  "target": "ACC_2091",
  "kind": "transacts",            // "transacts" | "uses"
  "amount": 10000.0,              // null for "uses" edges
  "dwell_seconds": 2.3,           // null for "uses" edges, null if no prior tx on src
  "timestamp": "2026-09-11T14:32:07Z",
  "importance": 0.92              // optional float, populated for explainer subgraphs
}

```

**Alert**

```json
{
  "alert_id": "ALT_501",
  "account_id": "ACC_1042",
  "pattern": "SCATTER_GATHER",    // "SCATTER_GATHER" | "DEVICE_HASH_MATCH" | "STRUCTURING" | "DORMANT_WAKEUP"
  "risk_score": 87.4,
  "description": "High-velocity fund dispersal detected across 4 mule accounts",
  "created_at": "2026-09-11T14:32:07Z",
  "acknowledged": false
}

```

**Transaction**

```json
{
  "transaction_id": "TXN_88213",
  "src": "ACC_1042",
  "dst": "ACC_2091",
  "amount": 10000.0,
  "dwell_seconds": 2.3,
  "timestamp": "2026-09-11T14:32:07Z",
  "risk_score": 87.4,
  "status": "flagged"             // "ok" | "flagged" | "monitoring"
}

```

---

## 1. Ingestion

### `POST /ingest`

Records one transaction and computes its dwell time against the sender's last activity.

**Request body:**

```json
{
  "src": "ACC_1042",
  "dst": "ACC_2091",
  "amount": 10000.0,
  "timestamp": "2026-09-11T14:32:07Z",
  "device_id": "DEV_88"           // optional
}

```

**Response `200`:**

```json
{
  "status": "ok",
  "transaction_id": "TXN_88213",
  "dwell_seconds": 2.3,           // null if src has no prior transaction on record
  "risk_score": 87.4,             // score computed immediately post-ingest
  "triggered_alert": true         // true if this ingest crossed the alert threshold
}

```

**Errors:** `400` — malformed body (missing `src`/`dst`/`amount`), returns the standard error shape.

---

## 2. Graph & Overview

### `GET /graph`

Returns the current graph, filtered for rendering — powers the Overview screen's force-graph.

**Query params:**

| param | type | default | notes |
| --- | --- | --- | --- |
| `min_risk` | float | `0` | only include account nodes at or above this score |
| `center` | string | none | optional account ID — if set, returns only its k-hop neighborhood instead of the full graph |
| `radius` | int | `2` | hop radius, only used with `center` |

**Response `200`:**

```json
{
  "nodes": [ /* array of Node */ ],
  "edges": [ /* array of Edge */ ],
  "generated_at": "2026-09-11T14:32:07Z"
}

```

**Errors:** `404` if `center` is set to an unknown account ID.

---

## 3. Scoring

### `GET /score/{account_id}`

Risk score for a single account, with the human-readable reasons behind it.

**Response `200`:**

```json
{
  "account_id": "ACC_1042",
  "risk_score": 87.4,
  "factors": [ /* array of RiskFactor */ ],
  "computed_at": "2026-09-11T14:32:07Z"
}

```

**Errors:** `404` — unknown account ID.

### `GET /accounts/{account_id}`

Account detail — backs the detail drawer opened from Alerts/Transactions/Overview.

**Response `200`:**

```json
{
  "account_id": "ACC_1042",
  "risk_score": 87.4,
  "factors": [ /* RiskFactor[] */ ],
  "device_id": "DEV_88",
  "account_age_days": 3,
  "total_volume": 42000.0,
  "in_degree": 1,
  "out_degree": 4,
  "is_new_account": true
}

```

**Errors:** `404` — unknown account ID.

---

## 4. Alerts

### `GET /alerts`

Active alert queue — backs the Alerts screen.

**Query params:**

| param | type | default | notes |
| --- | --- | --- | --- |
| `threshold` | float | `70` | minimum risk score to surface as an alert |
| `pattern` | string | none | filter to one pattern type |
| `include_acknowledged` | bool | `false` |  |

**Response `200`:**

```json
{ "alerts": [ /* array of Alert */ ], "total": 14 }

```

### `POST /alerts/{alert_id}/acknowledge`

Backs the checkmark button on each alert card, and the "Acknowledge All" bulk action (call once per `alert_id`, or use the bulk variant below).

**Response `200`:**

```json
{ "alert_id": "ALT_501", "acknowledged": true }

```

**Errors:** `404` — unknown alert ID.

### `POST /alerts/acknowledge-all`

**Request body:** `{ "pattern": null }` (optional filter — omit or `null` to acknowledge every active alert)
**Response `200`:** `{ "acknowledged_count": 14 }`

---

## 5. Transactions

### `GET /transactions`

Paginated ledger — backs the Transactions screen table.

**Query params:**

| param | type | default | notes |
| --- | --- | --- | --- |
| `page` | int | `1` |  |
| `page_size` | int | `50` | max `200` |
| `status` | string | none | `ok` | `flagged` | `monitoring` |
| `min_risk` | float | `0` |  |
| `account_id` | string | none | filter to transactions touching this account |
| `date_from` / `date_to` | ISO 8601 | none |  |
| `format` | string | `json` | set to `csv` to trigger the Export CSV button's download instead of a JSON body |

**Response `200**` (when `format=json`):

```json
{
  "transactions": [ /* array of Transaction */ ],
  "page": 1,
  "page_size": 50,
  "total": 4213
}

```

When `format=csv`, response is `Content-Type: text/csv` with a `Content-Disposition: attachment` header instead of a JSON body — same filters apply.

### `GET /transactions/{transaction_id}`

Row-click detail panel, includes the immediate neighborhood for the mini-graph.

**Response `200`:**

```json
{
  "transaction": { /* Transaction */ },
  "neighborhood": { "nodes": [ /* Node[] */ ], "edges": [ /* Edge[] */ ] }
}

```

**Errors:** `404` — unknown transaction ID.

---

## 6. Explainability & Dossier

### `POST /explain/{account_id}`

Runs GNNExplainer (or the edge-ablation fallback) and returns the causal subgraph — backs the AI Insights explainer view.

**Response `200`:**

```json
{
  "account_id": "ACC_1042",
  "method": "gnn_explainer",        // "gnn_explainer" | "edge_ablation"
  "causal_subgraph": {
    "nodes": [ /* Node[], the minimal set the explainer flagged */ ],
    "edges": [
      { "source": "ACC_1001", "target": "ACC_1042", "kind": "transacts", "importance": 0.92 },
      { "source": "ACC_1042", "target": "ACC_2091", "kind": "transacts", "importance": 0.81 }
    ]
  },
  "hop_count": 5
}

```

**Errors:** `404` — unknown account ID. `500` with `{ "error": "explainer_failed" }` — if this happens, the frontend should fall back to just showing `/score`'s `factors` list without a subgraph, rather than blocking the screen.

### `POST /dossier/{account_id}`

Generates and returns the PDF dossier — backs the "Generate Dossier" button.

**Response `200`:** binary PDF, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="dossier_ACC_1042.pdf"`.

**Errors:** `404` — unknown account ID. `500` — generation failed; frontend shows "Dossier generation failed, try again" rather than a silent spinner timeout.

---

## 7. AI Insights / Stats

### `GET /stats`

Backs the AI Insights screen's top stat cards and model panel. Includes overall network risk.

**Response `200`:**

```json
{
  "network_risk_score": 88.5,
  "network_status": "High-risk transaction pattern detected",
  "detection_accuracy": 0.994,
  "test_set_fpr": 0.021,             // always populate — never show accuracy without this alongside it
  "active_clusters": 3,
  "nodes_scanned": 3000,
  "avg_inference_latency_ms": 42,
  "feature_importance": [
    { "feature": "dwell_time", "importance": 0.41 },
    { "feature": "shared_device", "importance": 0.33 },
    { "feature": "fanout_count", "importance": 0.19 },
    { "feature": "account_age", "importance": 0.07 }
  ]
}

```

---

## 8. Health

### `GET /health`

Backs the top-bar "● Live" indicator.

**Response `200`:** `{ "status": "ok", "model_loaded": true, "graph_size": { "accounts": 3000, "transactions": 15420 } }`
If `model_loaded` is `false`, the frontend should show the indicator as offline/red rather than a generic error.

---

## 9. Demo & Testing (Hackathon Specific)

### `POST /demo/reset`

Clears the in-memory graph back to initial synthetic background traffic. Drops any generated alerts or seeded hero rings so you can reset smoothly between pitches.

**Response `200`:**

```json
{
  "status": "ok", 
  "graph_size": { "accounts": 3000, "transactions": 15000 } 
}

```

### `POST /demo/seed-hero`

Executes a canned sequence of rapid scatter-gather transactions with shared devices to instantly trigger a clean, high-scoring alert live in front of the judges.

**Response `200`:**

```json
{
  "status": "ok",
  "seeded_account_id": "ACC_HERO_1",
  "triggered_alert_id": "ALT_502"
}

```

---

## Endpoint summary

| Screen / State | Endpoints it calls |
| --- | --- |
| Overview | `GET /graph`, `GET /health`, `GET /stats` (for the top-right risk number) |
| Alerts | `GET /alerts`, `POST /alerts/{id}/acknowledge`, `POST /alerts/acknowledge-all` |
| Transactions | `GET /transactions`, `GET /transactions/{id}` |
| AI Insights | `GET /stats`, `POST /explain/{account_id}`, `POST /dossier/{account_id}` |
| Shared (any detail drawer) | `GET /accounts/{account_id}`, `GET /score/{account_id}` |
| Ingestion (real-time stream) | `POST /ingest` |
| Pitch Demo Controls | `POST /demo/reset`, `POST /demo/seed-hero` |

```

```