import React, { useEffect, useState } from 'react';
import { useDataset } from '../../context/DatasetContext';
import { fetchExplain } from '../../utils/api';
import { Layers, Cpu, AlertTriangle, RefreshCw } from 'lucide-react';

export function AIInsightsPage() {
  const { focusedNodeId, currentDataset } = useDataset();
  const [explainData, setExplainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [targetAccount, setTargetAccount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const focused = focusedNodeId?.startsWith('ACC') ? focusedNodeId : null;
    const topAlert = currentDataset?.alerts?.[0]?.target || currentDataset?.cases?.[0]?.accounts?.[0];
    const fallback = currentDataset?.nodes?.find(n => n.id?.startsWith('ACC_'))?.id;
    const best = focused || topAlert || fallback;
    if (best) setTargetAccount(best);
  }, [focusedNodeId, currentDataset]);

  useEffect(() => {
    if (!targetAccount) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchExplain(targetAccount);
        setExplainData({
          account_id: res.account_id,
          method: res.method,
          nodes: res.causal_subgraph?.nodes || [],
          edges: res.causal_subgraph?.edges || [],
          hop_count: res.hop_count
        });
      } catch (e) {
        setError('Failed to reach explainability backend.');
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [targetAccount]);

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <span className="eyebrow">MODEL EXPLAINABILITY &amp; SIGNALS</span>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', marginTop: '6px' }}>
            Heterogeneous GNNExplainer Intelligence
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '13.5px', marginTop: '4px' }}>
            Transparent, audited topological scoring metrics and sub-graph attribution weights.
          </p>
        </div>
        {targetAccount && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-dim)' }}>ANALYZING:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--blue)' }}>{targetAccount}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const acc = prompt('Enter account ID to analyze (e.g. ACC_101):');
                if (acc && acc.startsWith('ACC')) setTargetAccount(acc.trim());
              }}
            >
              <RefreshCw size={12} /> Change
            </button>
          </div>
        )}
      </div>

      {!targetAccount ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <AlertTriangle size={32} color="var(--orange)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>No Dataset Loaded</h3>
          <p style={{ color: 'var(--text-dim)' }}>Load the demo dataset or upload a CSV file first, then return here for live AI insights.</p>
        </div>
      ) : loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--text-dim)' }}>Computing edge-ablation gradients for <b style={{color:'#fff'}}>{targetAccount}</b>...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--red)' }}>{error}</div>
      ) : explainData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          <div className="card" style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Method</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--teal)', fontWeight: 600 }}>{explainData.method}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nodes in Receptive Field</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#fff', fontWeight: 700 }}>{explainData.nodes.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Critical Edges</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#fff', fontWeight: 700 }}>{explainData.edges.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>GNN Hop Radius</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#fff', fontWeight: 700 }}>{explainData.hop_count}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Cpu size={18} color="var(--blue)" />
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '16px' }}>GNN Edge Attribution Scores</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                Topological edges with highest contribution to <b style={{color:'#fff'}}>{targetAccount}</b>'s risk score.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {explainData.edges.length === 0 && <p style={{color:'var(--text-dim)'}}>No high-importance edges found.</p>}
                {explainData.edges.map((e, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{e.source} to {e.target}</span>
                      <span style={{ color: 'var(--red)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{(e.importance || 0).toFixed(2)}x</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                      <div style={{ width: `${Math.min(100, (e.importance || 0) * 50)}%`, height: '100%', background: 'var(--red)', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Layers size={18} color="var(--purple)" />
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '16px' }}>Contextual Subgraph Nodes</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                Accounts and devices in the receptive field used by the model for scoring.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {explainData.nodes.length === 0 && <p style={{color:'var(--text-dim)'}}>No subgraph nodes returned.</p>}
                {explainData.nodes.map((n, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '5px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: n.id === targetAccount ? 'var(--blue)' : '#fff' }}>{n.id}</span>
                    {n.risk_score != null && (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: n.risk_score > 70 ? 'var(--red)' : 'var(--text-dim)' }}>
                        {Math.round(n.risk_score)}/100
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
