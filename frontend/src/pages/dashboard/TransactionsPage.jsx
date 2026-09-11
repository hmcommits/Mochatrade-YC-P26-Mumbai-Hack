import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDataset } from "../../context/DatasetContext";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { fmtCurrency } from "../../utils/csvParser";

const API_URL = "http://localhost:8000";

export function TransactionsPage() {
  const { setFocusedNodeId } = useDataset();
  const navigate = useNavigate();

  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [minAmount, setMinAmount] = useState(0);
  const [accountFilter, setAccountFilter] = useState("");

  const PAGE_SIZE = 50;

  const fetchTxs = async (pg = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pg, page_size: PAGE_SIZE });
      if (accountFilter) params.set("account_id", accountFilter);
      const res = await fetch(`${API_URL}/transactions?${params}`);
      const data = await res.json();
      const rows = (data.transactions || []).map((r, i) => ({
        id: r.transaction_id || `TX-${(pg - 1) * PAGE_SIZE + i + 1000}`,
        sender: r.src || r.sender_id || "—",
        receiver: r.dst || r.receiver_id || "—",
        amount: r.amount || 0,
        timestamp: r.timestamp || "—",
        device: r.device_id || "—",
        dwellSec: r.dwell_seconds ?? null,
        riskScore: r.risk_score ?? null,
      }));
      setTxs(rows);
      setTotalCount(data.total || rows.length);
      setTotalPages(data.pages || Math.ceil((data.total || rows.length) / PAGE_SIZE) || 1);
      setPage(pg);
    } catch (e) {
      setError("Failed to load transactions from backend.");
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTxs(1); }, [accountFilter]);

  const filtered = txs.filter(tx => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      tx.id.toLowerCase().includes(term) ||
      tx.sender.toLowerCase().includes(term) ||
      tx.receiver.toLowerCase().includes(term);
    const matchAmt = tx.amount >= minAmount;
    return matchSearch && matchAmt;
  });

  const handleRowClick = tx => {
    setFocusedNodeId(tx.sender);
    navigate("/app/overview");
  };

  const riskColor = score => {
    if (score == null) return "var(--text-faint)";
    if (score >= 70) return "var(--red)";
    if (score >= 40) return "var(--amber)";
    return "var(--text-dim)";
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px" }}>
        <div>
          <span className="eyebrow">DATA LAKE VIEW</span>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: "24px", marginTop: "6px" }}>
            Raw Transaction Ledger
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: "13.5px", marginTop: "4px" }}>
            {totalCount.toLocaleString()} transactions ingested into the heterogeneous graph.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="search-bar" style={{ width: "200px" }}>
            <Search size={14} color="var(--text-dim)" />
            <input type="text" placeholder="Search TX, Account..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-input)", padding: "6px 12px", borderRadius: "4px", border: "1px solid var(--line)" }}>
            <Filter size={14} color="var(--text-dim)" />
            <input type="text" placeholder="Account ID" value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
              style={{ width: "90px", background: "transparent", border: "none", color: "#fff", fontSize: "12px", outline: "none" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-input)", padding: "6px 12px", borderRadius: "4px", border: "1px solid var(--line)" }}>
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Min</span>
            <input type="number" value={minAmount} onChange={e => setMinAmount(Number(e.target.value))}
              style={{ width: "70px", background: "transparent", border: "none", color: "#fff", fontSize: "13px", outline: "none" }} />
          </div>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>TX ID</th>
              <th>TIMESTAMP</th>
              <th>SENDER</th>
              <th>RECEIVER</th>
              <th style={{ textAlign: "right" }}>AMOUNT</th>
              <th>DEVICE</th>
              <th style={{ textAlign: "center" }}>RISK</th>
              <th>DWELL</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>Loading transactions…</td></tr>}
            {error && <tr><td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--red)" }}>{error}</td></tr>}
            {!loading && !error && filtered.length === 0 && (
              <tr><td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
                No transactions found. Upload a CSV to populate the ledger.
              </td></tr>
            )}
            {!loading && !error && filtered.map(tx => (
              <tr key={tx.id} style={{ cursor: "pointer" }} onClick={() => handleRowClick(tx)}>
                <td style={{ color: "var(--text-faint)", fontSize: "11px", fontFamily: "var(--font-mono)" }}>{tx.id}</td>
                <td style={{ fontSize: "11px", color: "var(--text-dim)" }}>{tx.timestamp}</td>
                <td><span style={{ color: "var(--blue)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{tx.sender}</span></td>
                <td><span style={{ color: "var(--teal)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{tx.receiver}</span></td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#fff" }}>{fmtCurrency(tx.amount)}</td>
                <td style={{ fontSize: "11px", color: "var(--amber)" }}>{tx.device}</td>
                <td style={{ textAlign: "center" }}>
                  {tx.riskScore != null
                    ? <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, color: riskColor(tx.riskScore) }}>{Math.round(tx.riskScore)}</span>
                    : <span style={{ color: "var(--text-faint)" }}>—</span>}
                </td>
                <td style={{ fontSize: "11px", color: tx.dwellSec != null && tx.dwellSec < 10 ? "var(--red)" : "var(--text-dim)" }}>
                  {tx.dwellSec != null ? `${tx.dwellSec}s` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Page {page} of {totalPages} · {totalCount.toLocaleString()} total</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => fetchTxs(page - 1)}><ChevronLeft size={14} /> Prev</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => fetchTxs(page + 1)}>Next <ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
