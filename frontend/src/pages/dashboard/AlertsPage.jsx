import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataset } from '../../context/DatasetContext';
import { AlertTriangle, Eye, ShieldAlert, ArrowRight, CheckCircle, Crosshair } from 'lucide-react';

export function AlertsPage() {
  const { currentDataset, openDossier, addToWatchlist, setFocusedNodeId } = useDataset();
  const navigate = useNavigate();
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [actionMessage, setActionMessage] = useState(null);

  // Read live alerts pulled from the FastAPI backend into currentDataset.cases
  const rawAlerts = (currentDataset.cases || []).map((c, i) => ({
    id: `ALT-${1000 + i}`,
    caseId: c.id,
    severity: c.status,
    type: 'Algorithmic Detection',
    target: c.accounts?.[0] || 'Unknown',
    score: c.risk,
    timestamp: new Date().toLocaleTimeString(),
    description: c.summary,
    details: 'View dossier for full transaction edge ablation.',
  }));

  const alerts = rawAlerts.filter(a => filterSeverity === 'ALL' || a.severity === filterSeverity);

  const handleInitiateFreeze = alert => {
    setActionMessage(`Emergency Freeze Order drafted for ${alert.target} under RBI SOP Section 4(b).`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleViewInGraph = alert => {
    setFocusedNodeId(alert.target);
    navigate('/app/overview');
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <span className="eyebrow">SECURITY INCIDENT QUEUE</span>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', marginTop: '6px' }}>
            Flagged Anomaly Alerts
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '13.5px', marginTop: '4px' }}>
            Real-time contact tracing alerts flagged by the Heterogeneous GNN engine.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'CRITICAL', 'ELEVATED', 'LOW'].map(sev => (
            <button
              key={sev}
              className={`btn btn-sm ${filterSeverity === sev ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterSeverity(sev)}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div className="alert-strip" style={{ marginBottom: '20px' }}>
          <CheckCircle size={18} color="var(--green)" />
          <div style={{ fontWeight: 500 }}>{actionMessage}</div>
        </div>
      )}

      {/* Alert List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
        {alerts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--line)' }}>
            No active alerts matching this severity.
          </div>
        ) : alerts.map(alt => (
          <div key={alt.id} className="card" style={{ padding: '0', display: 'flex', overflow: 'hidden' }}>
            <div style={{
              width: '4px',
              background: alt.severity === 'CRITICAL' ? 'var(--red)' : alt.severity === 'ELEVATED' ? 'var(--orange)' : 'var(--blue)'
            }} />
            <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>{alt.id}</span>
                    <span className={`case-status`} style={{ fontSize: '10px', background: 'transparent', padding: 0 }}>
                      {alt.severity}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{alt.timestamp}</span>
                  </div>
                  <h3 style={{ fontSize: '17px', color: '#fff' }}>{alt.type}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: alt.score > 80 ? 'var(--red)' : '#fff' }}>{alt.score}/100</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>RISK SCORE</div>
                </div>
              </div>

              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-main)', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
                  <Crosshair size={14} color="var(--red)" />
                  Target: {alt.target}
                </div>
                <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text)' }}>
                  {alt.description}
                </p>
                <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-dim)', marginTop: '6px' }}>
                  {alt.details}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Linked Case: <b style={{ color: '#fff' }}>{alt.caseId}</b>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => addToWatchlist({ id: alt.target, type: 'Account', risk: alt.score, reason: alt.type, addedAt: new Date().toISOString().slice(0, 10), status: 'Active Monitoring' })}>
                    <ShieldAlert size={13} />
                    Watchlist
                  </button>

                  <button className="btn btn-ghost btn-sm" onClick={() => handleViewInGraph(alt)}>
                    <ArrowRight size={13} />
                    Focus in Graph
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleInitiateFreeze(alt)}
                  >
                    Initiate Freeze
                  </button>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const matchedCase = currentDataset.cases?.find(c => c.id === alt.caseId) || currentDataset.cases?.[0];
                      if (matchedCase) openDossier(matchedCase);
                    }}
                  >
                    <Eye size={13} />
                    Open Case Dossier
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
