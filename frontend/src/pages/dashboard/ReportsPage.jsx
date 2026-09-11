import React from 'react';
import { useDataset } from '../../context/DatasetContext';
import { FileText, Download, Printer, ShieldCheck, CheckCircle } from 'lucide-react';

export function ReportsPage() {
  const { currentDataset, openDossier, reports } = useDataset();

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <span className="eyebrow">REGULATORY COMPLIANCE</span>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', marginTop: '6px' }}>
            Generated Reports
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '13.5px', marginTop: '4px' }}>
            Auto-generated freeze requests and STR filings for FIU reporting.
          </p>
        </div>

        <button className="btn btn-primary btn-sm">
          <FileText size={14} />
          Generate Custom Report
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
        {reports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--line)' }}>
            No regulatory reports generated.
          </div>
        ) : reports.map((rep, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              padding: '20px 24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '6px',
                background: rep.status === 'Ready for Signature' ? 'rgba(229,72,77,0.1)' : 'var(--bg-main)',
                color: rep.status === 'Ready for Signature' ? 'var(--red)' : 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {rep.status === 'Ready for Signature' ? <ShieldCheck size={20} /> : <CheckCircle size={20} />}
              </div>
              
              <div>
                <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>{rep.title}</h3>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>
                  <span>{rep.category}</span>
                  <span>•</span>
                  <span>Ref: {rep.reference}</span>
                  <span>•</span>
                  <span>{rep.date}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: rep.status === 'Ready for Signature' ? 'var(--red)' : 'var(--green)' }}>
                {rep.status}
              </div>
              
              <div style={{ height: '24px', width: '1px', background: 'var(--line)', margin: '0 8px' }} />

              <button className="btn btn-ghost btn-sm" title="Print Document">
                <Printer size={15} />
              </button>
              <button className="btn btn-ghost btn-sm" title="Download PDF">
                <Download size={15} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const c = currentDataset.cases?.find(c => c.id === rep.caseId);
                if (c) openDossier(c);
              }}>
                Open Case
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
