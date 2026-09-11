const API_URL = 'http://localhost:8000';

export async function fetchLiveDataset() {
    // Only fetch nodes with elevated risk (>40) to keep the visualization clean and performant
    const graphRes = await fetch(`${API_URL}/graph?min_risk=40`);
    const graphData = await graphRes.json();
    
    const statsRes = await fetch(`${API_URL}/stats`);
    const statsData = await statsRes.json();
    
    const alertsRes = await fetch(`${API_URL}/alerts`);
    const alertsData = await alertsRes.json();

    const nodes = graphData.nodes.map(n => {
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

    const edges = graphData.edges
        .filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target))
        .map((e, idx) => ({
            from: e.source,
            to: e.target,
            amount: e.amount || 0,
            dwellSec: e.dwell_seconds || 0,
            type: e.amount ? 'tx' : 'device',
            tag: `tx${idx}`
        }));

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
