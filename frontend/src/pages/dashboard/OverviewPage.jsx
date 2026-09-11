import React from 'react';
import { MuleNetGraph } from '../../components/graph/MuleNetGraph';
import { useDataset } from '../../context/DatasetContext';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export function OverviewPage() {
  const { currentDataset, openDossier } = useDataset();

  const cases = currentDataset.cases || [];
  const logs = currentDataset.logs || [];
  const alert = currentDataset.alert || {
    title: 'SYSTEM SECURE',
    body: 'No active threats detected in current topology.'
  };

  const statusClass = {
    CRITICAL: 'risk-critical',
    ELEVATED: 'risk-elevated',
    CLEAR: 'risk-clear'
  };

  return (
    <div className="overview-stage">
      {/* Left Column: Network Graph & Detection Log */}
      <div className="dash-panel">
        <div className="panel-head">
          <div className="panel-title">Heterogeneous Network Topology</div>
          <div className="panel-note" id="graphSubtitle">
            accounts · devices · IP subnets — live
          </div>
        </div>

        {/* Pre-emptive Alert Strip */}
        <div className="alert-strip">
          <AlertTriangle size={18} color="#E5484D" />
          <div>
            <div className="a-title">{alert.title}</div>
            <div
              className="a-body"
              dangerouslySetInnerHTML={{ __html: alert.body }}
            />
          </div>
        </div>

        {/* Interactive Preserved MuleNet Graph */}
        <div style={{ flex: 1, minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
          <MuleNetGraph />
        </div>

        {/* Detection Log Panel */}
        <div className="panel-head" style={{ borderTop: '1px solid var(--line-soft)', borderBottom: 'none' }}>
          <div className="panel-title">Detection Log</div>
          <div className="panel-note">chronological detection feed</div>
        </div>

        <div id="eventLog">
          {logs.map((row, idx) => (
            <div key={idx} className={`ev-row ${row.level}`}>
              <div className="ev-t">{row.t}</div>
              <div
                className="ev-text"
                dangerouslySetInnerHTML={{ __html: row.html }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Active Investigations */}
      <div className="dash-panel" style={{ borderLeft: '1px solid var(--line)' }}>
        <div className="panel-head">
          <div className="panel-title">Active Investigations</div>
          <div className="panel-note">{cases.length} cases detected</div>
        </div>

        <div id="caseList">
          {cases.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                No active investigations detected.
              </div>
              <div style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-faint)' }}>
                Upload a transaction dataset or load the demo to begin analysis.
              </div>
            </div>
          ) : cases.map(c => (
            <div
              key={c.id}
              className={`case-card ${statusClass[c.status] || 'risk-elevated'}`}
              onClick={() => openDossier(c)}
            >
              <div className="case-top">
                <div>
                  <div className="case-id">{c.id}</div>
                  <div className="case-status">{c.status}</div>
                </div>
                <div className="case-score">
                  <div className="num">{c.risk}</div>
                  <div className="lbl">RISK SCORE</div>
                </div>
              </div>

              <div className="case-summary">{c.summary}</div>

              <div className="case-meta">
                <span>
                  <b>{Array.isArray(c.accounts) ? c.accounts.length : c.accounts}</b> accounts
                </span>
                <span>
                  <b>{Array.isArray(c.tx) ? c.tx.length : c.tx}</b> transactions
                </span>
              </div>

              <button
                className="case-open"
                onClick={e => {
                  e.stopPropagation();
                  openDossier(c);
                }}
              >
                <ShieldAlert size={13} />
                Open evidentiary dossier →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
