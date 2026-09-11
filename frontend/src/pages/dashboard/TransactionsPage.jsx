import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataset } from '../../context/DatasetContext';
import { Search, Filter, ArrowRightLeft } from 'lucide-react';
import { fmtCurrency } from '../../utils/csvParser';

export function TransactionsPage() {
  const { currentDataset, setFocusedNodeId, transactions } = useDataset();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState(0);

  const rawTx = transactions.map((r, i) => ({
      id: `TX-${1000 + i}`,
      sender: r.sender_id,
      receiver: r.receiver_id,
      amount: r.amount,
      timestamp: r.timestamp,
      device: r.device_id || 'N/A',
      subnet: r.ip_subnet || 'N/A',
      dwellSec: r.dwellSec || 0
  }));

  const filteredTx = rawTx.filter(tx => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = tx.id.toLowerCase().includes(term) ||
                          tx.sender.toLowerCase().includes(term) ||
                          tx.receiver.toLowerCase().includes(term);
    const matchesAmt = tx.amount >= minAmount;
    return matchesSearch && matchesAmt;
  });

  const handleRowClick = tx => {
    setFocusedNodeId(tx.sender);
    navigate('/app/overview');
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div>
          <span className="eyebrow">DATA LAKE VIEW</span>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', marginTop: '6px' }}>
            Raw Transaction Ledger
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '13.5px', marginTop: '4px' }}>
            All ingested records mapped into the heterogeneous graph.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="search-bar" style={{ width: '240px' }}>
            <Search size={14} color="var(--text-dim)" />
            <input 
              type="text" 
              placeholder="Search TX, Account..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <Filter size={14} color="var(--text-dim)" />
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Min ₹</span>
            <input 
              type="number" 
              value={minAmount} 
              onChange={e => setMinAmount(Number(e.target.value))}
              style={{ width: '60px', background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>TX ID</th>
              <th>TIMESTAMP</th>
              <th>SENDER</th>
              <th>RECEIVER</th>
              <th style={{ textAlign: 'right' }}>AMOUNT</th>
              <th>DEVICE / SUBNET</th>
            </tr>
          </thead>
          <tbody>
            {filteredTx.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No transactions found.</td></tr>
            )}
            {filteredTx.map(tx => (
              <tr key={tx.id} style={{ cursor: 'pointer' }} onClick={() => handleRowClick(tx)}>
                <td style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{tx.id}</td>
                <td style={{ fontSize: '12px' }}>{tx.timestamp}</td>
                <td>
                  <span style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{tx.sender}</span>
                </td>
                <td>
                  <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{tx.receiver}</span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {fmtCurrency(tx.amount)}
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  {tx.device} <br/> {tx.subnet}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
