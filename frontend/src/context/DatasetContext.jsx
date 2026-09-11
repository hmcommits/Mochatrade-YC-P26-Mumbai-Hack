import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_DATA } from '../data/demoData';
import { fetchLiveDataset, triggerDemoSeed, triggerDemoReset } from '../utils/api';

const DatasetContext = createContext(null);

export function DatasetProvider({ children }) {
  const [activeMode, setActiveMode] = useState('demo'); // 'demo' | 'uploaded'
  const [currentDataset, setCurrentDataset] = useState(DEMO_DATA);
  const [watchlist, setWatchlist] = useState([]);
  const [reports, setReports] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeDossierCase, setActiveDossierCase] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  useEffect(() => {
      // Auto-fetch the actual PyTorch backend graph on load
      const loadAll = async () => {
          try {
              const data = await fetchLiveDataset();
              setCurrentDataset(data);
              
              // Load extra pages data
              import('../utils/api').then(async (api) => {
                  const wl = await api.fetchWatchlist();
                  setWatchlist(wl.watchlist || []);
                  
                  const rp = await api.fetchReports();
                  setReports(rp.reports || []);
                  
                  const tx = await api.fetchTransactions(1);
                  setTransactions(tx.transactions || []);
              });
          } catch(err) { console.error(err); }
      };
      loadAll();
  }, []);

  // Graph state & controls
  const [riskThreshold, setRiskThreshold] = useState(0); // 0-100
  const [searchAccountQuery, setSearchAccountQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [focusedNodeId, setFocusedNodeId] = useState(null);

  

  async function loadDemoDataset() {
    setActiveMode('demo');
    await triggerDemoSeed();
    const liveData = await fetchLiveDataset();
    setCurrentDataset(liveData);
    
    import('../utils/api').then(async (api) => {
        const wl = await api.fetchWatchlist();
        setWatchlist(wl.watchlist || []);
        const rp = await api.fetchReports();
        setReports(rp.reports || []);
        const tx = await api.fetchTransactions(1);
        setTransactions(tx.transactions || []);
    });

    setSelectedNode(null);
    setFocusedNodeId(null);
    setSearchAccountQuery('');
  }

  async function loadUploadedDataset(model) {
    setActiveMode('uploaded');
    // If they uploaded CSV via the old mock risk engine, we just use the fake model for now 
    // unless we also wire up the POST /ingest flow. Let's just fetch live data for simplicity:
    const liveData = await fetchLiveDataset();
    setCurrentDataset(liveData);
    setSelectedNode(null);
    setFocusedNodeId(null);
    setSearchAccountQuery('');
  }

  function openDossier(c) {
    setActiveDossierCase(c);
    setIsDossierOpen(true);
  }

  function closeDossier() {
    setIsDossierOpen(false);
  }

  async function addToWatchlist(item) {
    const api = await import('../utils/api');
    await api.apiAddToWatchlist(item);
    const wl = await api.fetchWatchlist();
    setWatchlist(wl.watchlist || []);
  }

  async function removeFromWatchlist(id) {
    const api = await import('../utils/api');
    await api.apiRemoveFromWatchlist(id);
    const wl = await api.fetchWatchlist();
    setWatchlist(wl.watchlist || []);
  }

  return (
    <DatasetContext.Provider
      value={{
        activeMode,
        currentDataset,
        loadDemoDataset,
        loadUploadedDataset,
        activeDossierCase,
        isDossierOpen,
        openDossier,
        closeDossier,
        riskThreshold,
        setRiskThreshold,
        searchAccountQuery,
        setSearchAccountQuery,
        selectedNode,
        setSelectedNode,
        focusedNodeId,
        setFocusedNodeId,
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        reports,
        transactions
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}
