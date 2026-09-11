import urllib.request, json, time

base = 'http://localhost:8000'

def req(method, path):
    r = urllib.request.Request(base + path, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())

print('1. Emptying the system (Simulating a fresh start)...')
req('POST', '/demo/reset')
stats1 = req('GET', '/stats')
print(f"   Stats: Risk={stats1['network_risk_score']}, Alerts={stats1['active_clusters']}, Status={stats1['network_status']}")

print('\n2. Clicking "Load Synthetic Demo Dataset" (Seeding Hero Ring)...')
req('POST', '/demo/seed-hero')
time.sleep(1)

print('\n3. Navigating to "Overview" (Fetching stats & alerts)...')
stats2 = req('GET', '/stats')
alerts = req('GET', '/alerts')['alerts']
print(f"   Stats: Risk={stats2['network_risk_score']}, Alerts={stats2['active_clusters']}, Status={stats2['network_status']}")
if alerts:
    a = alerts[0]
    print(f"   CRITICAL ALERT TRIGGERED: {a['reason']}")
    print(f"   Risk Score: {a['risk_score']:.1f}/100")

print('\n4. Navigating to "AI Insights" (Running GNN Explainer on the ring)...')
if alerts and len(alerts[0]['involved_accounts']) > 0:
    hub = alerts[0]['involved_accounts'][0]
    explain = req('POST', f'/explain/{hub}')
    print(f"   Analyzed Account: {hub}")
    print(f"   Top 3 Suspicious Edges (Ranked by AI):")
    for e in explain['edges'][:3]:
        print(f"     {e['source']} -> {e['target']} | Importance Score: {e['importance']:.2f}")
