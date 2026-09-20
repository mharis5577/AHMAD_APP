import React, { useState, useMemo } from 'react';
import { Search, Receipt, CheckCircle, Clock, Eye, Trash2, RotateCcw, FileSpreadsheet, Edit2, Copy, Calendar, ArrowUpDown, CheckSquare, Square, X } from 'lucide-react';
import { showAppConfirm, showAppAlert } from '../utils/dialog';
import { exportBillsHistoryToExcel } from '../utils/excelExport';

export default function BillsHistory({ bills, onUpdateBillStatus, onDeleteBill, onViewBill, onEditBill, onDuplicateBill, onBulkUpdateStatus, onLoadDemoBills }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All'); // 'All', 'Today', 'Week', 'Month'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'customer'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [selectedBills, setSelectedBills] = useState([]); // For bulk selection
  const [customerFilter, setCustomerFilter] = useState(''); // Quick filter by customer name

  // Filtered and sorted bills
  const filteredBills = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    let filtered = bills.filter(b => {
      const q = search.toLowerCase();
      const matchesSearch = 
        b.id.toLowerCase().includes(q) ||
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        (b.customerPhone && b.customerPhone.includes(q)) ||
        (b.notes && b.notes.toLowerCase().includes(q)); // Include notes in search
      
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;

      // Customer quick filter
      const matchesCustomer = !customerFilter || 
        (b.customerName && b.customerName.toLowerCase() === customerFilter.toLowerCase());

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'All' && b.date) {
        const billDate = new Date(b.date);
        if (dateFilter === 'Today') {
          matchesDate = billDate >= today;
        } else if (dateFilter === 'Week') {
          matchesDate = billDate >= weekAgo;
        } else if (dateFilter === 'Month') {
          matchesDate = billDate >= monthAgo;
        }
      }

      return matchesSearch && matchesStatus && matchesDate && matchesCustomer;
    });

    // Sort bills
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date || 0) - new Date(b.date || 0);
      } else if (sortBy === 'amount') {
        comparison = (a.netTotal || 0) - (b.netTotal || 0);
      } else if (sortBy === 'customer') {
        comparison = (a.customerName || '').localeCompare(b.customerName || '');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [bills, search, statusFilter, dateFilter, customerFilter, sortBy, sortOrder]);

  // Toggle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Bulk selection handlers
  const toggleBillSelection = (billId) => {
    setSelectedBills(prev => 
      prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId]
    );
  };

  const selectAllVisible = () => {
    const allVisibleIds = filteredBills.map(b => b.id);
    setSelectedBills(allVisibleIds);
  };

  const clearSelection = () => {
    setSelectedBills([]);
  };

  const handleBulkMarkPaid = () => {
    if (selectedBills.length === 0) return;
    showAppConfirm({
      title: 'Mark Bills as Paid?',
      message: `Mark ${selectedBills.length} selected bill(s) as Paid?`,
      confirmText: 'Mark All Paid',
      confirmStyle: 'success',
      onConfirm: () => {
        selectedBills.forEach(id => onUpdateBillStatus(id, 'Paid'));
        setSelectedBills([]);
        showAppAlert({ title: 'Done!', message: `${selectedBills.length} bills marked as Paid`, type: 'success' });
      }
    });
  };

  // Customer quick filter
  const handleCustomerClick = (customerName) => {
    if (customerFilter === customerName) {
      setCustomerFilter(''); // Toggle off
    } else {
      setCustomerFilter(customerName);
    }
  };

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
            placeholder="Search Bill #, Name, Phone, Notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '34px', height: '36px', fontSize: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
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

          <span style={{ color: 'var(--border-subtle)', margin: '0 2px' }}>|</span>

          {['All', 'Today', 'Week', 'Month'].map((period) => (
            <button
              key={period}
              onClick={() => setDateFilter(period)}
              title={period === 'All' ? 'All Time' : `Last ${period}`}
              style={{
                background: dateFilter === period ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                color: dateFilter === period ? '#60a5fa' : 'var(--text-muted)',
                border: `1px solid ${dateFilter === period ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                padding: '6px 8px',
                fontSize: '10.5px',
                fontWeight: dateFilter === period ? '700' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              {period === 'All' && <Calendar size={10} />}
              {period === 'All' ? '' : period}
            </button>
          ))}

          <button
            onClick={() => exportBillsHistoryToExcel(filteredBills)}
            title="Export filtered bills to Excel (.xlsx)"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FileSpreadsheet size={13} />
            <span>Excel</span>
          </button>
        </div>

      </div>

      {/* Customer Quick Filter Badge */}
      {customerFilter && (
        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Filtering by customer:</span>
          <span 
            style={{ 
              background: 'rgba(168, 85, 247, 0.2)', 
              color: '#c084fc', 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '11px', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {customerFilter}
            <button 
              onClick={() => setCustomerFilter('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <X size={12} color="#c084fc" />
            </button>
          </span>
        </div>
      )}

      {/* Sort Options & Bulk Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        
        {/* Sort Options */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginRight: '4px' }}>Sort:</span>
          {[
            { key: 'date', label: 'Date' },
            { key: 'amount', label: 'Amount' },
            { key: 'customer', label: 'Name' }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => handleSort(opt.key)}
              style={{
                background: sortBy === opt.key ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                color: sortBy === opt.key ? 'var(--gold-primary)' : 'var(--text-muted)',
                border: `1px solid ${sortBy === opt.key ? 'var(--gold-primary)' : 'transparent'}`,
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: sortBy === opt.key ? '700' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              {opt.label}
              {sortBy === opt.key && (
                <ArrowUpDown size={10} style={{ transform: sortOrder === 'asc' ? 'scaleY(-1)' : 'none' }} />
              )}
            </button>
          ))}
        </div>

        {/* Bulk Selection Actions */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {selectedBills.length > 0 ? (
            <>
              <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: '600' }}>
                {selectedBills.length} selected
              </span>
              <button
                onClick={handleBulkMarkPaid}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle size={11} />
                Mark Paid
              </button>
              <button
                onClick={clearSelection}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </>
          ) : (
            <button
              onClick={selectAllVisible}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Square size={10} />
              Select All ({filteredBills.length})
            </button>
          )}
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

            const isSelected = selectedBills.includes(bill.id);

            return (
              <div 
                key={bill.id} 
                className="glass-card"
                style={{ 
                  padding: '12px 14px',
                  borderLeft: `4px solid ${isPaid ? '#10b981' : '#f59e0b'}`,
                  background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Selection Checkbox */}
                    <button
                      onClick={() => toggleBillSelection(bill.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        marginTop: '2px',
                        color: isSelected ? '#60a5fa' : 'var(--text-dim)'
                      }}
                    >
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '800', color: 'var(--gold-primary)', fontSize: '14px' }}>
                          {bill.id}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {dateStr}
                        </span>
                      </div>

                      {/* Clickable Customer Name for Quick Filter */}
                      <button
                        onClick={() => handleCustomerClick(bill.customerName)}
                        style={{
                          background: customerFilter === bill.customerName ? 'rgba(168, 85, 247, 0.15)' : 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          marginLeft: '-6px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          color: customerFilter === bill.customerName ? '#c084fc' : 'var(--text-main)',
                          fontSize: '13px',
                          marginTop: '2px',
                          textAlign: 'left'
                        }}
                        title="Click to filter by this customer"
                      >
                        {bill.customerName}
                      </button>

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
                        onClick={() => onEditBill && onEditBill(bill)} 
                        className="btn-icon" 
                        style={{ width: '30px', height: '30px', color: '#3b82f6' }}
                        title="Edit Bill"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button 
                        onClick={() => onDuplicateBill && onDuplicateBill(bill)} 
                        className="btn-icon" 
                        style={{ width: '30px', height: '30px', color: '#a855f7' }}
                        title="Duplicate Bill (Repeat Order)"
                      >
                        <Copy size={13} />
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
