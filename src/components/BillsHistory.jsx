import React, { useState, useMemo } from 'react';
import { Search, Receipt, CheckCircle, Clock, Eye, Trash2, RotateCcw } from 'lucide-react';
import { showAppConfirm } from '../utils/dialog';

export default function BillsHistory({ bills, onUpdateBillStatus, onDeleteBill, onViewBill, onLoadDemoBills }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Filtered bills
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const q = search.toLowerCase();
      const matchesSearch = 
        b.id.toLowerCase().includes(q) ||
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        (b.customerPhone && b.customerPhone.includes(q));
      
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  // Analytics
  const metrics = useMemo(() => {
    const totalSales = bills.reduce((sum, b) => sum + (b.netTotal || 0), 0);
    const paidSales = bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + (b.netTotal || 0), 0);
    const pendingSales = bills.filter(b => b.status === 'Pending').reduce((sum, b) => sum + (b.netTotal || 0), 0);
    const countPaid = bills.filter(b => b.status === 'Paid').length;
    const countPending = bills.filter(b => b.status === 'Pending').length;

    return { totalSales, paidSales, pendingSales, countPaid, countPending, totalCount: bills.length };
  }, [bills]);

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '14px 14px 40px 14px' }}>
      
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
        
        <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center', borderTop: '3px solid var(--gold-primary)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Sales</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold-light)', marginTop: '2px' }}>
            Rs. {metrics.totalSales.toLocaleString()}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {metrics.totalCount} bills
          </div>
        </div>

        <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center', borderTop: '3px solid var(--status-paid)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Paid Sales</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>
            Rs. {metrics.paidSales.toLocaleString()}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {metrics.countPaid} settled
          </div>
        </div>

        <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center', borderTop: '3px solid var(--status-pending)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Unpaid</div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#fbbf24', marginTop: '2px' }}>
            Rs. {metrics.pendingSales.toLocaleString()}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {metrics.countPending} pending
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '12px', marginBottom: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Search Bill #, Name, Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '34px', height: '36px', fontSize: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          {['All', 'Paid', 'Pending'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                background: statusFilter === status ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                color: statusFilter === status ? '#140a05' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '11.5px',
                fontWeight: statusFilter === status ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              {status}
            </button>
          ))}
        </div>

      </div>

      {/* Mobile-Friendly Bills Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredBills.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <Receipt size={32} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
            <p style={{ fontSize: '13px', margin: 0 }}>No bills recorded yet</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Create a new customer sale bill to see it here.</p>
          </div>
        ) : (
          filteredBills.map((bill) => {
            const dateStr = new Date(bill.date).toLocaleDateString('en-PK', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const isPaid = bill.status === 'Paid';

            return (
              <div 
                key={bill.id} 
                className="glass-card"
                style={{ 
                  padding: '12px 14px',
                  borderLeft: `4px solid ${isPaid ? '#10b981' : '#f59e0b'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', color: 'var(--gold-primary)', fontSize: '14px' }}>
                        {bill.id}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {dateStr}
                      </span>
                    </div>

                    <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13px', marginTop: '2px' }}>
                      {bill.customerName}
                    </div>

                    {bill.customerPhone && (
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {bill.customerPhone}
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {bill.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </div>

                    <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {bill.paymentMethod}
                    </div>
                  </div>

                  {/* Right: Amount, Status toggle, Actions */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                      Rs. {bill.netTotal.toLocaleString()}
                    </div>

                    <button
                      onClick={() => onUpdateBillStatus(bill.id, isPaid ? 'Pending' : 'Paid')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="Click to toggle status"
                    >
                      <span className={isPaid ? 'badge-paid' : 'badge-pending'}>
                        {isPaid ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </button>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button 
                        onClick={() => onViewBill(bill)} 
                        className="btn-icon" 
                        style={{ width: '30px', height: '30px' }}
                        title="View / Print HD Bill"
                      >
                        <Eye size={13} />
                      </button>

                      <button 
                        onClick={() => {
                          showAppConfirm({
                            title: 'Delete Bill?',
                            message: `Are you sure you want to delete invoice #${bill.id}?`,
                            confirmText: 'Delete Bill',
                            confirmStyle: 'danger',
                            onConfirm: () => onDeleteBill(bill.id)
                          });
                        }} 
                        className="btn-icon" 
                        style={{ width: '30px', height: '30px', color: '#ef4444' }}
                        title="Delete Bill"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
