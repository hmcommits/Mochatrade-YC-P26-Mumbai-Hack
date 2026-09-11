import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Upload, RefreshCw } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export function DashboardTopBar() {
  const {
    activeMode,
    currentDataset,
    loadDemoDataset,
    searchAccountQuery,
    setSearchAccountQuery
  } = useDataset();

  const navigate = useNavigate();

  return (
    <>
      <header className="dashboard-topbar">
        <div className="topbar-left">
          <div className="topbar-search">
            <Search />
            <input
              type="text"
              placeholder="Search entity, account, device, IP..."
              value={searchAccountQuery}
              onChange={e => setSearchAccountQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="topbar-right">
          {/* Ticker metrics */}
          <div className="dash-ticker">
            <div className="dash-ticker-item">
              <div className="dash-ticker-val">{(currentDataset?.stats?.accCount || 0).toLocaleString('en-IN')}</div>
              <div className="dash-ticker-lbl">accounts monitored</div>
            </div>
            <div className="dash-ticker-item">
              <div className="dash-ticker-val live">{currentDataset?.alerts?.length || currentDataset?.cases?.length || 0}</div>
              <div className="dash-ticker-lbl">flagged today</div>
            </div>
            <div className="dash-ticker-item">
              <div className="dash-ticker-val">{currentDataset?.stats?.network_risk ?? '--'}</div>
              <div className="dash-ticker-lbl">network risk score</div>
            </div>
          </div>
        </div>
      </header>

      {/* Dataset Status Bar */}
      <div className="dataset-status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-faint)', fontSize: '10px', letterSpacing: '0.5px' }}>DATA SOURCE:</span>
          <span className={`status-pill ${activeMode}`}>
            {activeMode === 'uploaded' ? 'Uploaded Dataset' : 'Demo Dataset'}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>
            {activeMode === 'uploaded'
              ? `${currentDataset?.stats?.accCount || 0} accounts · ${currentDataset?.stats?.txCount || 0} transactions · ${currentDataset?.alerts?.length || 0} alerts detected`
              : currentDataset.statusDetails || 'Network Risk: 100 | High-risk transaction pattern detected'
            }
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeMode === 'uploaded' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadDemoDataset}
              style={{ display: 'inline-flex', gap: '6px' }}
            >
              <RefreshCw size={12} />
              Switch to Demo Dataset
            </button>
          )}

          <Link to="/app/input" className="btn btn-ghost btn-sm">
            <Upload size={12} />
            Upload Dataset
          </Link>
        </div>
      </div>
    </>
  );
}
