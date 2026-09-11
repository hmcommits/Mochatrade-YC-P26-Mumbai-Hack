import React, { useEffect } from 'react';
import { useDataset } from '../../context/DatasetContext';
import { fmtCurrency } from '../../utils/csvParser';
import { Printer, X } from 'lucide-react';

export function DossierModal() {
  const { isDossierOpen, activeDossierCase, closeDossier } = useDataset();

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') closeDossier();
    };
    if (isDossierOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDossierOpen, closeDossier]);

  if (!isDossierOpen || !activeDossierCase) return null;

  const c = activeDossierCase;
  const genTime = new Date().toLocaleString('en-IN');
  const hash = '7a41c9889f02be3a10b42d87e14c3309e451b689a77cd0219485f81bb2049e71';
  const dwellList = c.dwellRows || [];
  const devRec = c.deviceRecord || {
    id: 'DEV-CF19A3',
    accounts: 'ACC-7734, ACC-9081',
    firstSeen: '2026-08-29',
    priorCases: 'CASE-0201, CASE-0388'
  };

  // Build dynamic SVG subgraph representation
  const nodes = c.subgraphNodes || ['ACC-7734', 'ACC-2210', 'ACC-5589', 'ACC-9081'];
  const pos = {};
  if (nodes.length === 2) {
    pos[nodes[0]] = [140, 80];
    pos[nodes[1]] = [140, 200];
  } else if (nodes.length === 3) {
    pos[nodes[0]] = [140, 50];
    pos[nodes[1]] = [60, 200];
    pos[nodes[2]] = [220, 200];
  } else {
    // Scatter-gather layout: hub at top, legs in middle, cashout at bottom
    pos[nodes[0]] = [140, 40];   // hub
    pos[nodes[1]] = [60, 150];   // scatter leg 1
    pos[nodes[2]] = [220, 150];  // scatter leg 2
    pos[nodes[3] || nodes[0]] = [140, 250]; // cashout
  }

  // Draw edges: hub → each scatter leg → cashout (always, regardless of flow string format)
  const nodeKeys = Object.keys(pos);
  const hub = nodeKeys[0];
  const cashout = nodeKeys[nodeKeys.length - 1];
  const middleLegs = nodeKeys.slice(1, nodeKeys.length - 1);

  const lines = [];
  // hub → each middle leg
  middleLegs.forEach((legId, idx) => {
    const [x1, y1] = pos[hub];
    const [x2, y2] = pos[legId];
    const amtRow = dwellList[idx];
    lines.push(
      <g key={`hub-${idx}`}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E5484D" strokeWidth="1.6" opacity="0.7" markerEnd="url(#arrow)" />
        {amtRow && (
          <text x={(x1+x2)/2 + 6} y={(y1+y2)/2} fontFamily="Space Mono, monospace" fontSize="9" fill="#F2A0A2" textAnchor="middle">
            {fmtCurrency(amtRow.amount)}
          </text>
        )}
      </g>
    );
  });
  // each middle leg → cashout
  if (nodeKeys.length > 2) {
    middleLegs.forEach((legId, idx) => {
      const [x1, y1] = pos[legId];
      const [x2, y2] = pos[cashout];
      const amtRow = dwellList[middleLegs.length + idx];
      lines.push(
        <g key={`leg-cashout-${idx}`}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E5484D" strokeWidth="1.6" opacity="0.7" markerEnd="url(#arrow)" />
          {amtRow && (
            <text x={(x1+x2)/2 + 6} y={(y1+y2)/2} fontFamily="Space Mono, monospace" fontSize="9" fill="#F2A0A2" textAnchor="middle">
              {fmtCurrency(amtRow.amount)}
            </text>
          )}
        </g>
      );
    });
  }

  const nodeCircles = Object.entries(pos).map(([id, [x, y]], idx) => {
    const isHub = idx === 0;
    const isCashout = idx === Object.keys(pos).length - 1 && Object.keys(pos).length > 2;
    return (
      <g key={id}>
        <circle cx={x} cy={y} r="22" fill={isHub || isCashout ? '#E5484D' : '#4C8DFF'} opacity={isHub || isCashout ? 0.9 : 0.85} />
        <text x={x} y={y + 4} fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" fill="#0B0F1A" textAnchor="middle">
          {id.slice(-4)}
        </text>
        <text x={x} y={y + 36} fontFamily="Inter, sans-serif" fontSize="9.5" fill="#8B96AC" textAnchor="middle">
          {isHub ? 'hub' : isCashout ? 'cash-out' : 'scatter leg'}
        </text>
      </g>
    );
  });

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) closeDossier(); }}>
      <div className="dossier-content" id="dossierModalContent">
        <div className="d-head">
          <div className="d-head-left">
            <div className="d-eyebrow">EVIDENTIARY DOSSIER · AUTO-COMPILED</div>
            <h2>{c.id}</h2>
            <div className="d-sub">
              risk score {c.risk}/100 · {c.status} · generated {genTime}
            </div>
          </div>
          <button className="d-close" onClick={closeDossier} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <div className="d-body">
          <div className="d-section">
            <h3>Summary</h3>
            <p className="d-narrative">{c.summary}</p>
          </div>

          <div className="d-section">
            <h3>Isolated subgraph — GNNExplainer output</h3>
            <div className="subgraph-box">
              <svg viewBox="0 0 280 290" width="100%" style={{ maxWidth: '320px', display: 'block', margin: '0 auto' }}>
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#E5484D" opacity="0.8" />
                  </marker>
                </defs>
                {lines}
                {nodeCircles}
              </svg>
            </div>
          </div>

          <div className="d-section">
            <h3>Dwell-time ledger ({dwellList.length} transactions)</h3>
            <table className="d-table">
              <thead>
                <tr>
                  <th>Leg</th>
                  <th>Flow</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                  <th>Dwell</th>
                </tr>
              </thead>
              <tbody>
                {dwellList.map((r, i) => (
                  <tr key={i}>
                    <td className="id">{r.tag}</td>
                    <td>{r.flow}</td>
                    <td>{fmtCurrency(r.amount)}</td>
                    <td>{r.t}</td>
                    <td className="hot">{r.dwellSec}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-section">
            <h3>Device fingerprint record</h3>
            <div className="hash-block">{devRec.id} — sha256:{hash.slice(0, 40)}…</div>
            <table className="d-table" style={{ marginTop: '10px' }}>
              <thead>
                <tr>
                  <th>Linked accounts</th>
                  <th>First seen</th>
                  <th>Prior mule cases</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="id">{devRec.accounts}</td>
                  <td>{devRec.firstSeen}</td>
                  <td>{devRec.priorCases}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="d-section">
            <h3>Regulatory basis</h3>
            <p className="d-narrative">
              Compiled to support an account freeze order under the mule-account reporting and compliance provisions of
              the RBI Standard Operating Procedure framework for payment intermediaries. This isolated topology,
              dwell-time ledger, and device record represent the minimal evidentiary basis for the risk score —
              sufficient for compliance review without disclosing unnecessary third-party account telemetry.
            </p>
          </div>
        </div>

        <div className="d-footer">
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={14} />
            Generate Evidence Dossier
          </button>
          <button className="btn btn-ghost" onClick={closeDossier}>
            Close
          </button>
          <div className="integrity">
            dossier hash<br />
            {hash.slice(0, 16)}…
          </div>
        </div>

        <div className="disclaimer">
          Prototype output for hackathon demonstration purposes only — not an actual regulatory filing or legal instrument.
          Prototype heuristic proxy for H-GNN model.
        </div>
      </div>
    </div>
  );
}
