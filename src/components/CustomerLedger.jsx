import React, { useState, useMemo } from 'react';
import { Search, User, Phone, Share2, Building2, ChevronRight, Eye, Building, CreditCard, CheckCircle, Clock } from 'lucide-react';
import { BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';
import CustomerLedgerModal from './CustomerLedgerModal';
import SupplierLedgerModal from './SupplierLedgerModal';

export default function CustomerLedger({ 
  bills, 
  purchases = [], 
  banks,
  onUpdateBillStatus, 
  onUpdatePurchaseStatus, 
  onViewBill, 
  onViewPurchase,
  onBillCreated,
  onPurchaseCreated
}) {
  const [ledgerType, setLedgerType] = useState('customers'); // 'customers' or 'suppliers'
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // 'All', 'Unpaid', 'Settled'
  const [selectedClientModal, setSelectedClientModal] = useState(null);
  const [selectedSupplierModal, setSelectedSupplierModal] = useState(null);

  // Group bills by customer
  const customerLedgers = useMemo(() => {
    const map = new Map();

    bills.forEach(bill => {
      const name = (bill.customerName || 'Walk-in Customer').trim();
      const phone = (bill.customerPhone || '').trim();
      const key = phone || name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          phone,
          address: bill.deliveryAddress || '',
          bills: [],
          totalBilled: 0,
          totalPaid: 0,
          totalDue: 0
        });
      }

      const client = map.get(key);
      client.bills.push(bill);
      if (!client.address && bill.deliveryAddress) {
        client.address = bill.deliveryAddress;
      }

      const amount = Number(bill.netTotal) || 0;
      client.totalBilled += amount;

      if (bill.status === 'Paid') {
        client.totalPaid += amount;
      } else {
        client.totalDue += amount;
      }
    });

    return Array.from(map.values());
  }, [bills]);

  // Group purchases by supplier
  const supplierLedgers = useMemo(() => {
    const map = new Map();

    purchases.forEach(pur => {
      const name = (pur.supplierName || 'Unknown Supplier').trim();
      const phone = (pur.supplierPhone || '').trim();
      const key = phone || name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          phone,
          bank: pur.supplierBank || {},
          purchases: [],
          totalPurchased: 0,
          totalPaid: 0,
          totalPayable: 0
        });
      }

      const sup = map.get(key);
      sup.purchases.push(pur);
      if (!sup.bank?.bankName && pur.supplierBank?.bankName) {
        sup.bank = pur.supplierBank;
      }

      const amount = Number(pur.netTotal) || 0;
      sup.totalPurchased += amount;

      if (pur.status === 'Paid') {
        sup.totalPaid += amount;
      } else {
        sup.totalPayable += amount;
      }
    });

    return Array.from(map.values());
  }, [purchases]);

  // Overall Financial Summary
  const grandTotals = useMemo(() => {
    const totalSales = bills.reduce((sum, b) => sum + (Number(b.netTotal) || 0), 0);
    const salesReceived = bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + (Number(b.netTotal) || 0), 0);
    const salesDue = bills.filter(b => b.status === 'Pending').reduce((sum, b) => sum + (Number(b.netTotal) || 0), 0);

    const totalPurchases = purchases.reduce((sum, p) => sum + (Number(p.netTotal) || 0), 0);
    const purchasesPaid = purchases.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (Number(p.netTotal) || 0), 0);
    const purchasesPayable = purchases.filter(p => p.status === 'Pending').reduce((sum, p) => sum + (Number(p.netTotal) || 0), 0);

    return { totalSales, salesReceived, salesDue, totalPurchases, purchasesPaid, purchasesPayable };
  }, [bills, purchases]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customerLedgers.filter(c => {
      const q = search.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(q) || c.phone.includes(q);
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Unpaid' && c.totalDue > 0) ||
        (filter === 'Settled' && c.totalDue === 0);

      return matchesSearch && matchesFilter;
    });
  }, [customerLedgers, search, filter]);

  // Filtered supplier list
  const filteredSuppliers = useMemo(() => {
    return supplierLedgers.filter(s => {
      const q = search.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(q) || s.phone.includes(q);
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Unpaid' && s.totalPayable > 0) ||
        (filter === 'Settled' && s.totalPayable === 0);

      return matchesSearch && matchesFilter;
    });
  }, [supplierLedgers, search, filter]);

  const activeModalClient = useMemo(() => {
    if (!selectedClientModal) return null;
    return customerLedgers.find(c => c.key === selectedClientModal.key) || selectedClientModal;
  }, [customerLedgers, selectedClientModal]);

  const activeModalSupplier = useMemo(() => {
    if (!selectedSupplierModal) return null;
    return supplierLedgers.find(s => s.key === selectedSupplierModal.key) || selectedSupplierModal;
  }, [supplierLedgers, selectedSupplierModal]);

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '14px 14px 40px 14px' }}>
      
      {/* LEDGER TYPE SWITCHER (Customers vs Suppliers) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => { setLedgerType('customers'); setFilter('All'); }}
          style={{
            padding: '12px 8px',
            borderRadius: '12px',
            border: ledgerType === 'customers' ? '2px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
            background: ledgerType === 'customers' ? 'rgba(212, 163, 89, 0.22)' : 'rgba(24, 13, 8, 0.7)',
            color: ledgerType === 'customers' ? 'var(--gold-light)' : 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <User size={16} />
          <span>Customer Khata (Receivable)</span>
        </button>

        <button
          type="button"
          onClick={() => { setLedgerType('suppliers'); setFilter('All'); }}
          style={{
            padding: '12px 8px',
            borderRadius: '12px',
            border: ledgerType === 'suppliers' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
            background: ledgerType === 'suppliers' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(24, 13, 8, 0.7)',
            color: ledgerType === 'suppliers' ? '#34d399' : 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Building size={16} />
          <span>Supplier Khata (Payable)</span>
        </button>
      </div>

      {/* Financial Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
        {ledgerType === 'customers' ? (
          <>
            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid var(--gold-primary)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Sales</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginTop: '3px' }}>
                Rs. {grandTotals.totalSales.toLocaleString()}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid var(--status-paid)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Received</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#34d399', marginTop: '3px' }}>
                Rs. {grandTotals.salesReceived.toLocaleString()}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid var(--status-pending)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Receivable (Due)</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#fbbf24', marginTop: '3px' }}>
                Rs. {grandTotals.salesDue.toLocaleString()}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid #10b981' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Purchases</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#34d399', marginTop: '3px' }}>
                Rs. {grandTotals.totalPurchases.toLocaleString()}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid var(--gold-primary)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Paid to Suppliers</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--gold-light)', marginTop: '3px' }}>
                Rs. {grandTotals.purchasesPaid.toLocaleString()}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid var(--status-pending)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Payable (Owed)</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#fbbf24', marginTop: '3px' }}>
                Rs. {grandTotals.purchasesPayable.toLocaleString()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search & Status Filter */}
      <div className="glass-panel" style={{ padding: '12px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder={ledgerType === 'customers' ? 'Search customer name or phone...' : 'Search supplier or bank...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '12.5px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['All', 'Unpaid', 'Settled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? (ledgerType === 'customers' ? 'var(--gold-primary)' : '#10b981') : 'rgba(255,255,255,0.05)',
                color: filter === f ? '#120904' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: filter === f ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* CUSTOMER LEDGER VIEW */}
      {ledgerType === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredCustomers.length === 0 ? (
            <div className="glass-card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
              No customer accounts found.
            </div>
          ) : (
            filteredCustomers.map((client) => {
              const hasDue = client.totalDue > 0;
              return (
                <div
                  key={client.key}
                  onClick={() => setSelectedClientModal(client)}
                  className="glass-card"
                  style={{
                    padding: '14px 16px',
                    borderLeft: `4px solid ${hasDue ? '#f59e0b' : '#10b981'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={15} color="var(--gold-primary)" />
                      <span style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {client.name}
                      </span>
                    </div>
                    {client.phone && (
                      <div style={{ fontSize: '11px', color: 'var(--gold-light)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {client.bills.length} {client.bills.length === 1 ? 'order' : 'orders'} • Total: Rs. {client.totalBilled.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {hasDue ? 'Balance Due' : 'Status'}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: hasDue ? '#fbbf24' : '#34d399', marginTop: '1px' }}>
                        {hasDue ? `Rs. ${client.totalDue.toLocaleString()}` : 'Settled ✓'}
                      </div>
                    </div>

                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(212, 163, 89, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronRight size={16} color="var(--gold-primary)" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUPPLIER LEDGER VIEW */}
      {ledgerType === 'suppliers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredSuppliers.length === 0 ? (
            <div className="glass-card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
              No supplier accounts found.
            </div>
          ) : (
            filteredSuppliers.map((sup) => {
              const hasPayable = sup.totalPayable > 0;
              return (
                <div
                  key={sup.key}
                  onClick={() => setSelectedSupplierModal(sup)}
                  className="glass-card"
                  style={{
                    padding: '14px 16px',
                    borderLeft: `4px solid ${hasPayable ? '#f59e0b' : '#10b981'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={15} color="#34d399" />
                      <span style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {sup.name}
                      </span>
                    </div>

                    {sup.phone && (
                      <div style={{ fontSize: '11px', color: 'var(--gold-light)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} />
                        <span>{sup.phone}</span>
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {sup.purchases.length} {sup.purchases.length === 1 ? 'purchase' : 'purchases'} • Total: Rs. {sup.totalPurchased.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {hasPayable ? 'Balance Due' : 'Status'}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: hasPayable ? '#fbbf24' : '#34d399', marginTop: '1px' }}>
                        {hasPayable ? `Rs. ${sup.totalPayable.toLocaleString()}` : 'Settled ✓'}
                      </div>
                    </div>

                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronRight size={16} color="#34d399" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Customer Detail Window Modal */}
      {activeModalClient && (
        <CustomerLedgerModal
          client={activeModalClient}
          banks={banks}
          onClose={() => setSelectedClientModal(null)}
          onUpdateBillStatus={onUpdateBillStatus}
          onViewBill={onViewBill}
          onBillCreated={onBillCreated}
        />
      )}

      {/* Supplier Detail Window Modal */}
      {activeModalSupplier && (
        <SupplierLedgerModal
          supplier={activeModalSupplier}
          banks={banks}
          onClose={() => setSelectedSupplierModal(null)}
          onUpdatePurchaseStatus={onUpdatePurchaseStatus}
          onViewPurchase={onViewPurchase}
          onPurchaseCreated={onPurchaseCreated}
        />
      )}

    </div>
  );
}
