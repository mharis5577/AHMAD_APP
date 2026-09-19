import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  HelpCircle, 
  Package, 
  ShoppingBag, 
  PackagePlus, 
  Wallet, 
  Building2, 
  Calendar, 
  Trash2, 
  ChevronDown, 
  Info,
  X,
  CheckCircle,
  AlertCircle,
  Database
} from 'lucide-react';
import { showAppConfirm, showAppAlert } from '../utils/dialog';
import { exportGeneralLedgerToExcel } from '../utils/excelExport';

export default function GeneralLedger({
  bills = [],
  purchases = [],
  items = [],
  manualEntries = [],
  banks = [],
  onSaveManualEntry,
  onDeleteManualEntry,
  onViewBill,
  onViewPurchase,
  onOpenPreviousDataModal
}) {
  const [filterType, setFilterType] = useState('all'); // 'all', 'sale', 'purchase', 'capital', 'expense', 'credit', 'manual'
  const [searchQuery, setSearchQuery] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  // Manual Entry Form State
  const [entryType, setEntryType] = useState('expense'); // 'capital', 'expense', 'income', 'drawing'
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCategory, setEntryCategory] = useState('Shop Rent');
  const [entryAccount, setEntryAccount] = useState('Cash');
  const [entryParticulars, setEntryParticulars] = useState('');

  // 1. Cost lookup map for COGS calculation
  const itemCostMap = useMemo(() => {
    const map = new Map();
    items.forEach(it => {
      const name = (it.name || '').toLowerCase().trim();
      const cost = Number(it.purchasePrice) || 0;
      if (name) map.set(name, cost);
    });
    return map;
  }, [items]);

  // 2. Comprehensive Financial Metrics Calculation
  const financials = useMemo(() => {
    let totalSales = 0;
    let totalCogs = 0;
    let totalPurchases = 0;
    let totalCapital = 0;
    let totalExpenses = 0;
    let totalOtherIncome = 0;
    let totalDrawings = 0;

    // Calculate Sales Revenue & COGS
    bills.forEach(bill => {
      totalSales += Number(bill.netTotal || 0);

      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(item => {
          const qty = Number(item.qty || 1);
          const matchedCost = itemCostMap.get((item.name || '').toLowerCase().trim());
          if (matchedCost && matchedCost > 0) {
            totalCogs += matchedCost * qty;
          } else {
            // Default 70% wholesale cost if not specified
            totalCogs += (Number(item.price || 0) * qty) * 0.70;
          }
        });
      }
    });

    // Calculate Stock Purchases
    purchases.forEach(pur => {
      totalPurchases += Number(pur.netTotal || 0);
    });

    // Current Stock Asset Valuation
    let currentStockValuation = 0;
    items.forEach(it => {
      const stockQty = Math.max(0, Number(it.stock || 0));
      const cost = Number(it.purchasePrice) || (Number(it.salePrice || 0) * 0.70);
      currentStockValuation += stockQty * cost;
    });

    // Calculate Manual Entries
    manualEntries.forEach(entry => {
      const amt = Number(entry.amount || 0);
      if (entry.type === 'capital') {
        totalCapital += amt;
      } else if (entry.type === 'expense' || entry.type === 'debit') {
        totalExpenses += amt;
      } else if (entry.type === 'income' || entry.type === 'credit') {
        totalOtherIncome += amt;
      } else if (entry.type === 'drawing') {
        totalDrawings += amt;
      }
    });

    // Profit Calculations
    const grossProfit = totalSales - totalCogs;
    const netProfit = grossProfit - totalExpenses + totalOtherIncome;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0.0';

    // Liquid Cash & Bank Position
    // Cash Inflow: Capital + Sales + Other Income
    // Cash Outflow: Purchases + Expenses + Drawings
    const totalCashInflow = totalCapital + totalSales + totalOtherIncome;
    const totalCashOutflow = totalPurchases + totalExpenses + totalDrawings;
    const netCashBalance = totalCashInflow - totalCashOutflow;

    return {
      totalCapital,
      totalPurchases,
      currentStockValuation,
      totalSales,
      totalCogs,
      grossProfit,
      totalExpenses,
      totalOtherIncome,
      totalDrawings,
      netProfit,
      profitMargin,
      netCashBalance
    };
  }, [bills, purchases, items, manualEntries, itemCostMap]);

  // 3. Compile Unified Chronological Ledger Entries
  const compiledLedger = useMemo(() => {
    const list = [];

    // A. Sale Invoices (Credit to Sales / Debit to Cash or Receivables)
    bills.forEach(b => {
      list.push({
        id: `sale_${b.id}`,
        refId: b.id,
        date: b.date || new Date().toISOString(),
        type: 'sale',
        typeLabel: 'Sale Invoice',
        particulars: `Sale to ${b.customerName || 'Walk-in'} (${(b.items || []).length} items)`,
        category: 'Customer Sale',
        paymentMethod: b.paymentMethod || 'Cash',
        status: b.status || 'Paid',
        debit: 0,
        credit: Number(b.netTotal || 0),
        rawBill: b
      });
    });

    // B. Purchase Invoices (Debit to Purchases / Credit to Supplier or Cash)
    purchases.forEach(p => {
      list.push({
        id: `pur_${p.id}`,
        refId: p.id,
        date: p.date || new Date().toISOString(),
        type: 'purchase',
        typeLabel: 'Purchase Invoice',
        particulars: `Stock Purchase from ${p.supplierName || 'Supplier'}`,
        category: 'Inventory Stock',
        paymentMethod: p.paidFromBank || 'Cash',
        status: p.status || 'Paid',
        debit: Number(p.netTotal || 0),
        credit: 0,
        rawPurchase: p
      });
    });

    // C. Manual Entries (Capital, Expenses, Other Income, Drawings)
    manualEntries.forEach(m => {
      const isCredit = m.type === 'capital' || m.type === 'income' || m.type === 'credit';
      const amt = Number(m.amount || 0);

      let label = 'Manual Entry';
      if (m.type === 'capital') label = 'Capital Investment';
      else if (m.type === 'expense') label = 'Operating Expense';
      else if (m.type === 'income') label = 'Other Income';
      else if (m.type === 'drawing') label = 'Owner Drawing';

      list.push({
        id: m.id,
        refId: m.refId || `TXN-${m.id.slice(-4)}`,
        date: m.date || new Date().toISOString(),
        type: m.type,
        typeLabel: label,
        particulars: m.particulars || m.notes || label,
        category: m.category || 'General',
        paymentMethod: m.paymentMethod || 'Cash',
        status: 'Completed',
        debit: isCredit ? 0 : amt,
        credit: isCredit ? amt : 0,
        isManual: true,
        rawManual: m
      });
    });

    // Sort chronologically (oldest to newest for running balance calculation)
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate Running Cash/Ledger Balance
    let running = 0;
    const withBalance = list.map(entry => {
      running += (entry.credit - entry.debit);
      return {
        ...entry,
        runningBalance: running
      };
    });

    // Return reversed for latest-first UI view
    return withBalance.reverse();
  }, [bills, purchases, manualEntries]);

  // Filtered ledger entries
  const filteredLedger = useMemo(() => {
    return compiledLedger.filter(entry => {
      // Type filter
      if (filterType === 'sale' && entry.type !== 'sale') return false;
      if (filterType === 'purchase' && entry.type !== 'purchase') return false;
      if (filterType === 'capital' && entry.type !== 'capital') return false;
      if (filterType === 'expense' && (entry.type !== 'expense' && entry.type !== 'debit')) return false;
      if (filterType === 'credit' && (entry.type !== 'income' && entry.type !== 'credit')) return false;
      if (filterType === 'manual' && !entry.isManual) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = (entry.refId || '').toLowerCase().includes(q);
        const matchesPart = (entry.particulars || '').toLowerCase().includes(q);
        const matchesCat = (entry.category || '').toLowerCase().includes(q);
        const matchesMode = (entry.paymentMethod || '').toLowerCase().includes(q);
        return matchesRef || matchesPart || matchesCat || matchesMode;
      }

      return true;
    });
  }, [compiledLedger, filterType, searchQuery]);

  // Handle saving manual entry
  const handleSubmitManualEntry = (e) => {
    e.preventDefault();
    const amountNum = Number(entryAmount);
    if (!amountNum || amountNum <= 0) {
      showAppAlert({
        title: 'Invalid Amount',
        message: 'Please enter a valid amount greater than 0.',
        type: 'warning'
      });
      return;
    }

    const newEntry = {
      id: `man_${Date.now()}`,
      refId: `MN-${Math.floor(1000 + Math.random() * 9000)}`,
      date: entryDate ? new Date(entryDate).toISOString() : new Date().toISOString(),
      type: entryType,
      amount: amountNum,
      category: entryCategory,
      paymentMethod: entryAccount,
      particulars: entryParticulars.trim() || `${entryType.toUpperCase()} - ${entryCategory}`,
      createdAt: new Date().toISOString()
    };

    onSaveManualEntry?.(newEntry);
    setIsManualModalOpen(false);

    // Reset Form
    setEntryAmount('');
    setEntryParticulars('');

    showAppAlert({
      title: 'Entry Recorded',
      message: `Recorded ${entryType === 'capital' ? 'Capital Investment' : entryCategory} of Rs. ${amountNum.toLocaleString()} successfully.`,
      type: 'success'
    });
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '14px 14px 40px 14px' }}>
      
      {/* 1. TOP HEADER & EXPLANATION BANNER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
              General Ledger & Profit
            </h2>
            <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(212, 163, 89, 0.15)', color: 'var(--gold-light)', border: '1px solid rgba(212, 163, 89, 0.3)', fontWeight: '700' }}>
              Financial Flow
            </span>
          </div>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>
            Capital Investment → Stock Purchases → Sales Invoices → Profit
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="How Amount & Profit is Calculated"
          >
            <HelpCircle size={14} color="var(--gold-primary)" />
            <span>How Amount?</span>
          </button>

          <button
            type="button"
            onClick={onOpenPreviousDataModal}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderColor: 'rgba(212, 163, 89, 0.4)', color: 'var(--gold-light)' }}
            title="Import Previous App Records into Main Store Account"
          >
            <Database size={14} color="var(--gold-primary)" />
            <span>Import Old Records</span>
          </button>

          <button
            type="button"
            onClick={() => exportGeneralLedgerToExcel(compiledLedger, financials)}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
            title="Export full General Ledger to Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="btn-gold"
            style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Plus size={15} />
            <span>+ Manual Entry</span>
          </button>
        </div>
      </div>

      {/* 2. THE 4-STAGE FINANCIAL FLOW CARDS (Capital -> Stock -> Sale -> Profit) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
        
        {/* Stage 1: Capital Investment */}
        <div className="glass-card" style={{ padding: '14px', borderLeft: '4px solid #3b82f6', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '700' }}>
              1. Capital Invested
            </span>
            <Wallet size={16} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#93c5fd', marginTop: '4px' }}>
            Rs. {financials.totalCapital.toLocaleString()}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Owner business capital funding
          </div>
        </div>

        {/* Stage 2: Stock (Purchases & Valuation) */}
        <div className="glass-card" style={{ padding: '14px', borderLeft: '4px solid #10b981', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '700' }}>
              2. Stock & Purchases
            </span>
            <Package size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#34d399', marginTop: '4px' }}>
            Rs. {financials.totalPurchases.toLocaleString()}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Current Stock Asset: Rs. {Math.round(financials.currentStockValuation).toLocaleString()}
          </div>
        </div>

        {/* Stage 3: Sales Revenue */}
        <div className="glass-card" style={{ padding: '14px', borderLeft: '4px solid var(--gold-primary)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '700' }}>
              3. Sales Invoices
            </span>
            <ShoppingBag size={16} color="var(--gold-primary)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold-light)', marginTop: '4px' }}>
            Rs. {financials.totalSales.toLocaleString()}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {bills.length} Customer bills generated
          </div>
        </div>

        {/* Stage 4: Net Profit */}
        <div className="glass-card" style={{ padding: '14px', borderLeft: `4px solid ${financials.netProfit >= 0 ? '#10b981' : '#ef4444'}`, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '700' }}>
              4. Net Profit ({financials.profitMargin}%)
            </span>
            <TrendingUp size={16} color={financials.netProfit >= 0 ? '#34d399' : '#f87171'} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: financials.netProfit >= 0 ? '#34d399' : '#f87171', marginTop: '4px' }}>
            {financials.netProfit >= 0 ? '+' : '-'} Rs. {Math.abs(financials.netProfit).toLocaleString()}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Gross: Rs. {financials.grossProfit.toLocaleString()} (COGS: Rs. {Math.round(financials.totalCogs).toLocaleString()})
          </div>
        </div>

      </div>

      {/* 3. PROFIT CALCULATION EXPLANATION BANNER */}
      <div 
        onClick={() => setShowFormulaModal(true)}
        style={{
          background: 'linear-gradient(135deg, rgba(212, 163, 89, 0.12), rgba(16, 185, 129, 0.08))',
          border: '1px solid rgba(212, 163, 89, 0.35)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={18} color="var(--gold-primary)" />
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--gold-light)' }}>
              How Amount & Profit is Calculated
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>
              Sales (Rs. {financials.totalSales.toLocaleString()}) - Stock Cost (Rs. {Math.round(financials.totalCogs).toLocaleString()}) - Expenses (Rs. {financials.totalExpenses.toLocaleString()}) = Net Profit
            </div>
          </div>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--gold-light)', textDecoration: 'underline' }}>View Details</span>
      </div>

      {/* 4. UNIFIED LEDGER DAYBOOK SEARCH & FILTERS */}
      <div className="glass-panel" style={{ padding: '12px', marginBottom: '14px' }}>
        
        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            placeholder="Search Ref #, Particulars, Category, Payment Mode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '34px', height: '36px', fontSize: '12.5px' }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'all', label: 'All Entries' },
            { id: 'sale', label: 'Sales Invoices' },
            { id: 'purchase', label: 'Purchases' },
            { id: 'capital', label: 'Capital' },
            { id: 'expense', label: 'Expenses (Debits)' },
            { id: 'credit', label: 'Credits (Income)' },
            { id: 'manual', label: 'Manual Only' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: filterType === tab.id ? '700' : '500',
                background: filterType === tab.id ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                color: filterType === tab.id ? '#120904' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* 5. UNIFIED TRANSACTIONS LEDGER LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredLedger.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <Wallet size={36} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: '13px' }}>No ledger transactions found</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              Sales and purchase invoices automatically record here, or add a manual debit/credit above.
            </p>
          </div>
        ) : (
          filteredLedger.map((entry) => {
            const isCredit = entry.credit > 0;
            const dateStr = new Date(entry.date).toLocaleDateString('en-PK', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={entry.id}
                className="glass-card"
                style={{
                  padding: '12px 14px',
                  borderLeft: `4px solid ${isCredit ? '#10b981' : '#f59e0b'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  
                  {/* Left: Info */}
                  <div style={{ flex: 1 }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '800', color: 'var(--gold-primary)', fontSize: '13px' }}>
                        {entry.refId}
                      </span>
                      
                      <span 
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          background: entry.type === 'sale' ? 'rgba(212, 163, 89, 0.15)' : (entry.type === 'purchase' ? 'rgba(16, 185, 129, 0.15)' : (entry.type === 'capital' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)')),
                          color: entry.type === 'sale' ? 'var(--gold-light)' : (entry.type === 'purchase' ? '#34d399' : (entry.type === 'capital' ? '#93c5fd' : '#f87171'))
                        }}
                      >
                        {entry.typeLabel}
                      </span>

                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {dateStr}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginTop: '3px' }}>
                      {entry.particulars}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
                      <span>Mode: <strong>{entry.paymentMethod}</strong></span>
                      <span>• Category: {entry.category}</span>
                    </div>

                  </div>

                  {/* Right: Amount & Running Balance */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    
                    <div style={{ 
                      fontSize: '15px', 
                      fontWeight: '800', 
                      color: isCredit ? '#34d399' : '#f87171' 
                    }}>
                      {isCredit ? `+ Rs. ${entry.credit.toLocaleString()}` : `- Rs. ${entry.debit.toLocaleString()}`}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      Bal: Rs. {entry.runningBalance.toLocaleString()}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                      {entry.rawBill && (
                        <button
                          type="button"
                          onClick={() => onViewBill?.(entry.rawBill)}
                          className="btn-icon"
                          style={{ width: '28px', height: '28px' }}
                          title="View Sale Invoice"
                        >
                          <ShoppingBag size={13} color="var(--gold-primary)" />
                        </button>
                      )}

                      {entry.rawPurchase && (
                        <button
                          type="button"
                          onClick={() => onViewPurchase?.(entry.rawPurchase)}
                          className="btn-icon"
                          style={{ width: '28px', height: '28px' }}
                          title="View Purchase Invoice"
                        >
                          <PackagePlus size={13} color="#34d399" />
                        </button>
                      )}

                      {entry.isManual && (
                        <button
                          type="button"
                          onClick={() => {
                            showAppConfirm({
                              title: 'Delete Entry?',
                              message: `Are you sure you want to delete this ${entry.typeLabel}?`,
                              confirmText: 'Delete',
                              confirmStyle: 'danger',
                              onConfirm: () => onDeleteManualEntry?.(entry.id)
                            });
                          }}
                          className="btn-icon"
                          style={{ width: '28px', height: '28px', color: '#ef4444' }}
                          title="Delete Manual Entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: ADD MANUAL DEBIT / CREDIT ENTRY */}
      {isManualModalOpen && (
        <div 
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              border: '1px solid var(--gold-primary)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="var(--gold-primary)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Manual Debit / Credit Entry
                </h3>
              </div>
              <button onClick={() => setIsManualModalOpen(false)} className="btn-icon" style={{ width: '30px', height: '30px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Entry Form */}
            <form onSubmit={handleSubmitManualEntry} style={{ padding: '18px' }}>
              
              {/* Type Switcher */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Entry Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'capital', label: 'Capital', color: '#60a5fa' },
                    { id: 'expense', label: 'Expense', color: '#f87171' },
                    { id: 'income', label: 'Income', color: '#34d399' },
                    { id: 'drawing', label: 'Drawing', color: '#fbbf24' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setEntryType(t.id);
                        if (t.id === 'capital') setEntryCategory('Capital Inflow');
                        else if (t.id === 'expense') setEntryCategory('Shop Rent');
                        else if (t.id === 'income') setEntryCategory('Other Income');
                        else if (t.id === 'drawing') setEntryCategory('Personal Drawing');
                      }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: entryType === t.id ? '800' : '600',
                        border: entryType === t.id ? `1px solid ${t.color}` : '1px solid var(--border-subtle)',
                        background: entryType === t.id ? `${t.color}22` : 'rgba(255,255,255,0.03)',
                        color: entryType === t.id ? t.color : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--gold-light)' }}>Amount (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 25000"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    className="form-input"
                    style={{ height: '36px', fontSize: '14px', fontWeight: '800', borderColor: 'var(--gold-primary)' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="form-input"
                    style={{ height: '36px', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Category & Payment Account */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Category</label>
                  <select
                    value={entryCategory}
                    onChange={(e) => setEntryCategory(e.target.value)}
                    className="form-input"
                    style={{ height: '36px', fontSize: '12px' }}
                  >
                    {entryType === 'capital' && (
                      <>
                        <option value="Initial Capital Investment">Initial Capital Investment</option>
                        <option value="Additional Partner Capital">Additional Partner Capital</option>
                        <option value="Owner Capital Contribution">Owner Capital Contribution</option>
                      </>
                    )}
                    {entryType === 'expense' && (
                      <>
                        <option value="Shop Rent">Shop Rent</option>
                        <option value="Electricity / Utilities">Electricity / Utilities</option>
                        <option value="Staff Salaries">Staff Salaries</option>
                        <option value="Packaging & Bags">Packaging & Bags</option>
                        <option value="Rider Delivery / Freight">Rider Delivery / Freight</option>
                        <option value="Tea & Refreshment">Tea & Refreshment</option>
                        <option value="Shop Maintenance">Shop Maintenance</option>
                        <option value="Marketing & Ads">Marketing & Ads</option>
                        <option value="Misc Expense">Misc Expense</option>
                      </>
                    )}
                    {entryType === 'income' && (
                      <>
                        <option value="Bank Profit / Interest">Bank Profit / Interest</option>
                        <option value="Supplier Commission / Rebate">Supplier Commission / Rebate</option>
                        <option value="Scrap / Packaging Sale">Scrap / Packaging Sale</option>
                        <option value="Other Income">Other Income</option>
                      </>
                    )}
                    {entryType === 'drawing' && (
                      <>
                        <option value="Owner Cash Drawing">Owner Cash Drawing</option>
                        <option value="Personal Expense">Personal Expense</option>
                        <option value="Partner Profit Share">Partner Profit Share</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payment Account</label>
                  <select
                    value={entryAccount}
                    onChange={(e) => setEntryAccount(e.target.value)}
                    className="form-input"
                    style={{ height: '36px', fontSize: '12px' }}
                  >
                    <option value="Cash">Cash in Hand</option>
                    {banks.map(b => (
                      <option key={b.id} value={`${b.bankName} (${b.shortCode})`}>
                        {b.bankName} ({b.shortCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Particulars / Description */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Particulars / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Paid shop rent for current month / Initial store funding..."
                  value={entryParticulars}
                  onChange={(e) => setEntryParticulars(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px' }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-gold"
                style={{ width: '100%', padding: '11px', fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={15} />
                <span>Record {entryType.toUpperCase()} Entry</span>
              </button>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: "HOW AMOUNT IS CALCULATED" DETAILED BREAKDOWN */}
      {showFormulaModal && (
        <div 
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              border: '1px solid var(--gold-primary)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="var(--gold-primary)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--gold-light)' }}>
                  Financial Amount & Profit Calculation Formula
                </h3>
              </div>
              <button onClick={() => setShowFormulaModal(false)} className="btn-icon" style={{ width: '30px', height: '30px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '18px', maxHeight: '75vh', overflowY: 'auto' }}>
              
              {/* Step 1: Flow Explanation */}
              <div style={{ background: 'rgba(212, 163, 89, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(212, 163, 89, 0.25)', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gold-light)', marginBottom: '4px' }}>
                  The 4-Step Business Flow:
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  <strong>Capital Investment</strong> (Owner Funds) → Converted into <strong>Stock</strong> (Purchases) → Sold via <strong>Sales Invoices</strong> → Generates <strong>Gross & Net Profit</strong>!
                </div>
              </div>

              {/* Step 2: Step-by-Step Equations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: '700', color: '#93c5fd' }}>1. Total Sales Revenue:</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                    Sum of all generated customer sale bills = <strong>Rs. {financials.totalSales.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: '700', color: '#f87171' }}>2. Cost of Goods Sold (COGS):</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                    Wholesale cost price of items sold in customer bills = <strong>Rs. {Math.round(financials.totalCogs).toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: '700', color: '#34d399' }}>3. Gross Profit (Trading Profit):</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                    Sales Revenue - COGS = <strong>Rs. {financials.grossProfit.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: '700', color: '#fbbf24' }}>4. Operating Expenses (Manual Debits):</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                    Shop rent, salaries, utilities, packaging, delivery = <strong>Rs. {financials.totalExpenses.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                  <div style={{ fontWeight: '800', color: '#34d399', fontSize: '13px' }}>5. Final Net Business Profit:</div>
                  <div style={{ color: 'var(--text-main)', marginTop: '3px', fontWeight: '700' }}>
                    Gross Profit (Rs. {financials.grossProfit.toLocaleString()}) - Expenses (Rs. {financials.totalExpenses.toLocaleString()}) = <span style={{ color: '#34d399' }}>Rs. {financials.netProfit.toLocaleString()}</span> ({financials.profitMargin}% Profit Margin)
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: '700', color: '#60a5fa' }}>6. Remaining Stock Valuation:</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                    Remaining Inventory items in store × Cost Price = <strong>Rs. {Math.round(financials.currentStockValuation).toLocaleString()}</strong>
                  </div>
                </div>

              </div>

              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(false)}
                  className="btn-gold"
                  style={{ width: '100%', padding: '10px' }}
                >
                  Understood
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
