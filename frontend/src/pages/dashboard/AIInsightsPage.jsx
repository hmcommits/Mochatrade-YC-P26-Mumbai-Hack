import React, { useEffect, useState } from 'react';
import { useDataset } from '../../context/DatasetContext';
import { fetchExplain } from '../../utils/api';
import { Sparkles, GitGraph, Clock, Layers, ShieldCheck, Cpu, AlertTriangle } from 'lucide-react';

export function AIInsightsPage() {
  const { focusedNodeId, currentDataset } = useDataset();
  const [explainData, setExplainData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      const loadInsights = async () => {
          if (!focusedNodeId || !focusedNodeId.startsWith("ACC")) return;
          setLoading(true);
          try {
              const res = await fetchExplain(focusedNodeId);
              setExplainData(res);
          } catch(e) {
              console.error("Failed to load explanations", e);
          }
          setLoading(false);
      };
      loadInsights();
  }, [focusedNodeId]);

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: '24px' }}>
        <span className="eyebrow">MODEL EXPLAINABILITY & SIGNALS</span>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', marginTop: '6px' }}>
          Heterogeneous GNNExplainer Intelligence
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '13.5px', marginTop: '4px' }}>
          Transparent, audited topological scoring metrics and sub-graph attribution weights.
        </p>
      </div>

      {!focusedNodeId ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <AlertTriangle size={32} color="var(--orange)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>No Account Focused</h3>
              <p style={{ color: 'var(--text-dim)' }}>Go to the Overview graph or Alerts page and click "Focus in Graph" on an account to generate live AI explainability insights.</p>
          </div>
      ) : loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-dim)' }}>Computing ablation gradients for {focusedNodeId}...</p>
          </div>
      ) : explainData ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
            
            {/* Attribution Breakdown */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <Cpu size={18} color="var(--blue)" />
                    <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '16px' }}>GNN Explainer Ablation Scores</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                    Topological edges mathematically identified as the strongest contributors to {focusedNodeId}'s current risk score.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {explainData.edges.length === 0 && <p style={{color: 'var(--text-dim)'}}>No high-importance edges found.</p>}
                    {explainData.edges.map((e, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{e.source} → {e.target}</span>
                                <span style={{ color: 'var(--red)', fontWeight: 700 }}>{e.importance.toFixed(2)}x</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                <div style={{ width: `${Math.min(100, e.importance * 50)}%`, height: '100%', background: 'var(--red)', borderRadius: '2px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subgraph Info */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <Layers size={18} color="var(--purple)" />
                    <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '16px' }}>Contextual Subgraph</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                    The neural network analyzed a localized {explainData.method} hop radius around {focusedNodeId}.
                </p>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1, background: 'var(--bg-main)', padding: '20px', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>{explainData.nodes.length}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Nodes in Receptive Field</div>
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg-main)', padding: '20px', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>{explainData.edges.length}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Critical Edges Analyzed</div>
                    </div>
                </div>
            </div>

          </div>
      ) : null}
    </div>
  );
}
