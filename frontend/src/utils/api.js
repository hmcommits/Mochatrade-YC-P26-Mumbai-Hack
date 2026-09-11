const API_URL = 'http://localhost:8000';

export async function fetchLiveDataset(minRisk = 40) {
    // Only fetch nodes with elevated risk to keep the visualization clean and performant
    const graphRes = await fetch(`${API_URL}/graph?min_risk=${minRisk}`);
    const graphData = await graphRes.json();
    
    const statsRes = await fetch(`${API_URL}/stats`);
    const statsData = await statsRes.json();
    
    const alertsRes = await fetch(`${API_URL}/alerts`);
    const alertsData = await alertsRes.json();

    // Filter the raw nodes to keep the graph small and readable for the demo.
    // The backend leaks all device nodes because they don't have risk scores. We need to manually prune them.
    let demoNodes = graphData.nodes.filter(n => {
        const isAccount = n.id.startsWith("ACC_");
        // Keep all flagged/high-risk accounts, plus a tiny random sample of normal accounts for background visual
        if (isAccount) {
            return n.risk_score >= 60 || Math.random() > 0.95; 
        }
        return true; // Keep devices temporarily, we will prune orphans next
    });

    // Determine which nodes actually have valid connections
    const tempNodeIds = new Set(demoNodes.map(n => n.id));
    const connectedNodeIds = new Set();
    
    graphData.edges.forEach(e => {
        if (tempNodeIds.has(e.source) && tempNodeIds.has(e.target)) {
            connectedNodeIds.add(e.source);
            connectedNodeIds.add(e.target);
        }
    });

    // Final prune: Only keep accounts we selected, and ONLY keep devices that connect to them
    const nodes = demoNodes.filter(n => connectedNodeIds.has(n.id)).map(n => {
        const isAccount = n.id.startsWith("ACC_");
        const isFlagged = n.risk_score >= 70;
        let type = isAccount ? 'account' : 'device';
        
        return {
            id: n.id,
            label: n.id,
            type: type,
            sub: isAccount ? `Risk Score: ${n.risk_score}` : 'Hardware Fingerprint',
            cluster: isFlagged ? 'c1' : 'n',
            flagged: isFlagged,
            riskScore: n.risk_score || 0
        };
    });

    const validNodeIds = new Set(nodes.map(n => n.id));

    const edgeMap = new Map();
    graphData.edges.forEach((e, idx) => {
        if (!validNodeIds.has(e.source) || !validNodeIds.has(e.target)) return;
        // Create an undirected key so multi-directional edges merge into one physics spring
        const key = e.source < e.target ? `${e.source}-${e.target}` : `${e.target}-${e.source}`;
        if (!edgeMap.has(key)) {
            edgeMap.set(key, {
                from: e.source,
                to: e.target,
                amount: e.amount || 0,
                dwellSec: e.dwell_seconds || 0,
                type: e.amount ? 'tx' : 'device',
                tag: `tx${idx}`
            });
        } else {
            // Aggregate amounts for visual weight, but keep single physics spring
            edgeMap.get(key).amount += (e.amount || 0);
        }
    });
    const edges = Array.from(edgeMap.values());

    const cases = alertsData.alerts.map(a => ({
        id: a.alert_id,
        cluster: 'c1',
        risk: Math.round(a.risk_score),
        status: a.status === 'open' ? 'CRITICAL' : 'ELEVATED',
        accounts: a.involved_accounts,
        tx: a.involved_transactions,
        summary: a.reason,
        dwellRows: []
    }));

    return {
        sourceName: 'Live PyTorch Model',
        statusDetails: `Network Risk: ${statsData.network_risk_score} | ${statsData.network_status}`,
        stats: { 
            txCount: edges.filter(e => e.type === 'tx').length, 
            accCount: nodes.filter(n=>n.type==='account').length, 
            devCount: nodes.filter(n=>n.type==='device').length,
            totalVolume: Math.round(edges.reduce((acc, e) => acc + (e.amount || 0), 0))
        },
        alert: cases.length > 0 ? {
            title: 'MULE RING DETECTED',
            body: cases[0].summary
        } : null,
        nodes,
        edges,
        cases,
        logs: [
            { t: new Date().toLocaleTimeString(), level: 'warn', html: `Live data loaded from FastAPI backend. Nodes: ${nodes.length}, Edges: ${edges.length}` }
        ]
    };
}

export async function triggerDemoSeed() {
    await fetch(`${API_URL}/demo/seed-hero`, { method: 'POST' });
}

export async function triggerDemoReset() {
    await fetch(`${API_URL}/demo/reset`, { method: 'POST' });
}

export async function fetchTransactions(page = 1) {
    const res = await fetch(`${API_URL}/transactions?page=${page}`);
    return res.json();
}

export async function fetchWatchlist() {
    const res = await fetch(`${API_URL}/watchlist`);
    return res.json();
}

export async function apiAddToWatchlist(item) {
    await fetch(`${API_URL}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
}

export async function apiRemoveFromWatchlist(id) {
    await fetch(`${API_URL}/watchlist/${id}`, { method: 'DELETE' });
}

export async function fetchReports() {
    const res = await fetch(`${API_URL}/reports`);
    return res.json();
}

export async function fetchExplain(accountId) {
    const res = await fetch(`${API_URL}/explain/${accountId}`, { method: 'POST' });
    return res.json();
}
