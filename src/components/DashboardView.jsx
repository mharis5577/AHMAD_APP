import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingBag, 
  PackagePlus, 
  Users, 
  Package, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Eye,
  CreditCard,
  Building2,
  Sparkles
} from 'lucide-react';

export default function DashboardView({ 
  bills = [], 
  purchases = [], 
  items = [], 
  parties = [],
  payments = [],
  onNavigateTab, 
  onViewBill, 
  onViewPurchase 
}) {
  const [daybookFilter, setDaybookFilter] = useState('all'); // 'today', 'week', 'month', 'all'

  // Time boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - (now.getDay() * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Vyapar KPI calculations
  const metrics = useMemo(() => {
    let todaySales = 0;
    let todaySalesCount = 0;
    let monthSales = 0;
    let totalSalesRevenue = 0;
    let totalPurchasesSpent = 0;

    // Item cost lookup map for profit calculation
    const itemCostMap = new Map();
    items.forEach(it => {
      itemCostMap.set(it.name.toLowerCase().trim(), Number(it.purchasePrice) || 0);
    });

    let totalCogs = 0; // Cost of goods sold

    bills.forEach(bill => {
      const net = Number(bill.netTotal) || 0;
      const billTime = new Date(bill.date).getTime();

      totalSalesRevenue += net;

      if (billTime >= startOfToday) {
        todaySales += net;
        todaySalesCount++;
      }
      if (billTime >= startOfMonth) {
        monthSales += net;
      }

      // Estimate COGS
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(itemRow => {
          const rowQty = Number(itemRow.qty) || 1;
          const matchedCost = itemCostMap.get((itemRow.name || '').toLowerCase().trim());
          if (matchedCost) {
            totalCogs += matchedCost * rowQty;
          } else {
            // fallback: default 75% cost assumption
            totalCogs += (Number(itemRow.price) || 0) * rowQty * 0.75;
          }
        });
      }
    });

    purchases.forEach(pur => {
      const net = Number(pur.netTotal) || 0;
      totalPurchasesSpent += net;
    });

    // Accurately compute Customer Receivables (including Opening balances and Payments)
    const customerMap = new Map();
    parties.filter(p => p.type !== 'supplier').forEach(p => {
      const key = (p.phone || p.name).toLowerCase().trim();
      const opening = Number(p.openingBalance) || 0;
      const openingType = p.openingBalanceType || 'debit';
      customerMap.set(key, openingType === 'debit' ? opening : -opening);
    });
    // All bills are debits - payments handle the credit side (no status check needed)
    bills.forEach(b => {
      const key = (b.customerPhone || b.customerName || 'walkin').toLowerCase().trim();
      const current = customerMap.get(key) || 0;
      customerMap.set(key, current + (Number(b.netTotal) || 0));
    });
    payments.filter(p => p.partyType !== 'supplier').forEach(pmt => {
      const key = (pmt.partyPhone || pmt.partyName || '').toLowerCase().trim();
      const current = customerMap.get(key) || 0;
      const isSend = pmt.paymentType === 'send';
      customerMap.set(key, isSend ? current + (Number(pmt.amount) || 0) : current - (Number(pmt.amount) || 0));
    });
    let totalReceivables = 0;
    for (const bal of customerMap.values()) {
      if (bal > 0) totalReceivables += bal;
    }

    // Accurately compute Supplier Payables (including Opening balances and Payments)
    const supplierMap = new Map();
    parties.filter(p => p.type === 'supplier').forEach(p => {
      const key = (p.phone || p.name).toLowerCase().trim();
      const opening = Number(p.openingBalance) || 0;
      const openingType = p.openingBalanceType || 'credit';
      supplierMap.set(key, openingType === 'credit' ? opening : -opening);
    });
    // All purchases are credits (payables) - payments handle the debit side (no status check needed)
    purchases.forEach(pur => {
      const key = (pur.supplierPhone || pur.supplierName || 'supplier').toLowerCase().trim();
      const current = supplierMap.get(key) || 0;
      supplierMap.set(key, current + (Number(pur.netTotal) || 0));
    });
    payments.filter(p => p.partyType === 'supplier').forEach(pmt => {
      const key = (pmt.partyPhone || pmt.partyName || '').toLowerCase().trim();
      const current = supplierMap.get(key) || 0;
      supplierMap.set(key, current - (Number(pmt.amount) || 0));
    });
    let totalPayables = 0;
    for (const bal of supplierMap.values()) {
      if (bal > 0) totalPayables += bal;
    }

    // Gross Profit
    const estimatedGrossProfit = Math.max(0, totalSalesRevenue - totalCogs);

    // Total Stock Value
    let totalStockValuation = 0;
    items.forEach(it => {
      totalStockValuation += (Number(it.stock) || 0) * (Number(it.purchasePrice) || 0);
    });

    return {
      totalReceivables,
      totalPayables,
      todaySales,
      todaySalesCount,
      monthSales,
      totalSalesRevenue,
      totalPurchasesSpent,
      estimatedGrossProfit,
      totalStockValuation
    };
  }, [bills, purchases, items, parties, payments, startOfToday, startOfMonth]);

  // Combined Daybook Transactions
  const daybookEntries = useMemo(() => {
    const combined = [
      ...bills.map(b => ({
        type: 'sale',
        id: b.id,
        date: b.date,
        rawDate: new Date(b.date).getTime(),
        party: b.customerName || 'Customer',
        phone: b.customerPhone || '',
        amount: Number(b.netTotal) || 0,
        status: b.status,
        paymentMethod: b.paymentMethod || 'Bank',
        itemsCount: b.items ? b.items.length : 0,
        raw: b
      })),
      ...purchases.map(p => ({
        type: 'purchase',
        id: p.id,
        date: p.date,
        rawDate: new Date(p.date).getTime(),
        party: p.supplierName || 'Supplier',
        phone: p.supplierPhone || '',
        amount: Number(p.netTotal) || 0,
        status: p.status,
        paymentMethod: p.paidFromBank || 'Bank',
        itemsCount: p.items ? p.items.length : 0,
        raw: p
      })),
      ...payments.map(pmt => {
        const isCustomer = pmt.partyType !== 'supplier';
        const isSend = pmt.paymentType === 'send';
        return {
          type: isCustomer ? (isSend ? 'customer_send' : 'receipt') : 'payment',
          id: pmt.id,
          date: pmt.date,
          rawDate: new Date(pmt.date).getTime(),
          party: pmt.partyName || (isCustomer ? 'Customer' : 'Supplier'),
          phone: pmt.partyPhone || '',
          amount: Number(pmt.amount) || 0,
          status: isSend ? 'Sent' : 'Received',
          paymentMethod: pmt.paymentMethod || 'Cash',
          itemsCount: 1,
          raw: pmt,
          notes: pmt.notes
        };
      })
    ];

    // Sort descending by date
    combined.sort((a, b) => b.rawDate - a.rawDate);

    // Filter by date range
    return combined.filter(entry => {
      if (daybookFilter === 'today') return entry.rawDate >= startOfToday;
      if (daybookFilter === 'week') return entry.rawDate >= startOfWeek;
      if (daybookFilter === 'month') return entry.rawDate >= startOfMonth;
      return true;
    });
  }, [bills, purchases, payments, daybookFilter, startOfToday, startOfWeek, startOfMonth]);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '16px 14px 80px 14px' }}>
      
      {/* Top Welcome Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(226, 178, 101, 0.15)', border: '1px solid var(--gold-border)' }}>
              <LayoutDashboard size={20} color="var(--gold-primary)" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--gold-light)' }}>
                Vyapar Business Dashboard
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Real-time cashflow, receivables, payables, and daybook overview
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(20, 11, 7, 0.8)', padding: '6px 10px', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
          <Calendar size={13} color="var(--gold-primary)" />
          <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* VYAPAR TOP BALANCE CARDS: "You'll Get" & "You'll Give" */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        
        {/* You'll Get (Customer Receivables) */}
        <div 
          onClick={() => onNavigateTab('ledger')}
          style={{
            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.15), rgba(20, 11, 7, 0.95))',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              You'll Get (Customers)
            </span>
            <ArrowDownLeft size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#10b981' }}>
            Rs. {metrics.totalReceivables.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unpaid Customer Bills</span>
            <ChevronRight size={13} color="var(--text-dim)" />
          </div>
        </div>

        {/* You'll Give (Supplier Payables) */}
        <div 
          onClick={() => onNavigateTab('ledger')}
          style={{
            background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.15), rgba(20, 11, 7, 0.95))',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              You'll Give (Suppliers)
            </span>
            <ArrowUpRight size={16} color="#f87171" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#ef4444' }}>
            Rs. {metrics.totalPayables.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Supplier Udhar / Dues</span>
            <ChevronRight size={13} color="var(--text-dim)" />
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS BUTTONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '18px' }}>
        <button
          type="button"
          onClick={() => onNavigateTab('pos', 'sale')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 6px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(226, 178, 101, 0.15), rgba(20, 11, 7, 0.9))',
            border: '1px solid var(--gold-border)',
            color: 'var(--gold-light)',
            cursor: 'pointer'
          }}
        >
          <div style={{ padding: '8px', borderRadius: '10px', background: 'linear-gradient(135deg, #e2b265, #ba8339)', color: '#120904' }}>
            <ShoppingBag size={18} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '800' }}>+ Sale</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('pos', 'purchase')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 6px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(20, 11, 7, 0.9))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            cursor: 'pointer'
          }}
        >
          <div style={{ padding: '8px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff' }}>
            <PackagePlus size={18} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '800' }}>+ Purchase</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('items')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 6px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.12), rgba(20, 11, 7, 0.9))',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            color: '#60a5fa',
            cursor: 'pointer'
          }}
        >
          <div style={{ padding: '8px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#ffffff' }}>
            <Package size={18} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '800' }}>Inventory</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('ledger')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 6px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(20, 11, 7, 0.9))',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            color: '#c084fc',
            cursor: 'pointer'
          }}
        >
          <div style={{ padding: '8px', borderRadius: '10px', background: 'linear-gradient(135deg, #a855f7, #7e22ce)', color: '#ffffff' }}>
            <Users size={18} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '800' }}>Parties</span>
        </button>
      </div>

      {/* SECONDARY METRICS: Today's Sales, Monthly Sales, Gross Profit, Stock Value */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        
        {/* Today's Sales */}
        <div style={{ background: 'rgba(25, 14, 9, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Today's Sales</span>
            <TrendingUp size={14} color="var(--gold-primary)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold-light)' }}>
            Rs. {metrics.todaySales.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
            {metrics.todaySalesCount} {metrics.todaySalesCount === 1 ? 'sale bill' : 'sale bills'}
          </div>
        </div>

        {/* This Month's Sales */}
        <div style={{ background: 'rgba(25, 14, 9, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Month Sales</span>
            <DollarSign size={14} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#f3f4f6' }}>
            Rs. {metrics.monthSales.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
            Current month total
          </div>
        </div>

        {/* Gross Profit */}
        <div style={{ background: 'rgba(25, 14, 9, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Gross Profit</span>
            <Sparkles size={14} color="#10b981" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>
            Rs. {metrics.estimatedGrossProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
            Sales revenue minus COGS
          </div>
        </div>

        {/* Total Stock Value */}
        <div style={{ background: 'rgba(25, 14, 9, 0.85)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Stock Asset</span>
            <Package size={14} color="#e2b265" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold-light)' }}>
            Rs. {metrics.totalStockValuation.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
            {items.length} items in catalog
          </div>
        </div>

      </div>

      {/* VYAPAR DAYBOOK SECTION */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(28, 16, 10, 0.9), rgba(18, 10, 6, 0.96))',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
      }}>
        
        {/* Daybook Header & Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--gold-light)' }}>
              Business Daybook
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              Chronological log of customer sales and supplier purchases
            </p>
          </div>

          {/* Time Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDaybookFilter(t.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: daybookFilter === t.id ? 'var(--gold-primary)' : 'transparent',
                  color: daybookFilter === t.id ? '#120904' : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: daybookFilter === t.id ? '800' : '500',
                  cursor: 'pointer'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Daybook Timeline Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {daybookEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No transactions recorded for this selected period.
            </div>
          ) : (
            daybookEntries.map((entry) => {
              const isSale = entry.type === 'sale';
              const isPurchase = entry.type === 'purchase';
              const isReceipt = entry.type === 'receipt';
              const isCustomerSend = entry.type === 'customer_send';
              const isSupplierPayment = entry.type === 'payment';
              const isPaid = entry.status === 'Paid' || entry.status === 'Received' || entry.status === 'Sent' || entry.status === 'Settled';

              const icon = isSale ? <ShoppingBag size={16} /> :
                           isPurchase ? <PackagePlus size={16} /> :
                           isReceipt ? <ArrowDownLeft size={16} /> :
                           isCustomerSend ? <ArrowUpRight size={16} /> :
                           <ArrowUpRight size={16} />;

              const iconBg = isSale ? 'rgba(226, 178, 101, 0.15)' :
                             isPurchase ? 'rgba(16, 185, 129, 0.15)' :
                             isReceipt ? 'rgba(52, 211, 153, 0.15)' :
                             isCustomerSend ? 'rgba(244, 63, 94, 0.15)' :
                             'rgba(96, 165, 250, 0.15)';

              const iconBorder = isSale ? '1px solid var(--gold-border)' :
                                 isPurchase ? '1px solid rgba(16, 185, 129, 0.3)' :
                                 isReceipt ? '1px solid rgba(52, 211, 153, 0.3)' :
                                 isCustomerSend ? '1px solid rgba(244, 63, 94, 0.3)' :
                                 '1px solid rgba(96, 165, 250, 0.3)';

              const iconColor = isSale ? 'var(--gold-light)' :
                                isPurchase ? '#34d399' :
                                isReceipt ? '#34d399' :
                                isCustomerSend ? '#fb7185' :
                                '#93c5fd';

              const badgeLabel = isSale ? 'Sale Bill' :
                                 isPurchase ? 'Purchase' :
                                 isReceipt ? 'Receipt 💰' :
                                 isCustomerSend ? 'Refund / Sent 📤' :
                                 'Payment 💳';

              const badgeBg = isSale ? 'rgba(226, 178, 101, 0.2)' :
                              isPurchase ? 'rgba(16, 185, 129, 0.2)' :
                              isReceipt ? 'rgba(52, 211, 153, 0.2)' :
                              isCustomerSend ? 'rgba(244, 63, 94, 0.2)' :
                              'rgba(96, 165, 250, 0.2)';

              const amountColor = isSale ? 'var(--gold-light)' :
                                  isReceipt ? '#34d399' :
                                  isCustomerSend ? '#fb7185' :
                                  isPurchase ? '#f87171' :
                                  '#93c5fd';

              const amountPrefix = (isSale || isReceipt) ? '+' : '-';

              const handleClick = () => {
                if (isSale) onViewBill(entry.raw);
                else if (isPurchase) onViewPurchase(entry.raw);
                else onNavigateTab?.('ledger');
              };

              return (
                <div
                  key={`${entry.type}-${entry.id}`}
                  onClick={handleClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(14, 7, 4, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {/* Left: Icon & Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      padding: '8px',
                      borderRadius: '10px',
                      background: iconBg,
                      border: iconBorder,
                      color: iconColor
                    }}>
                      {icon}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {entry.party}
                        </span>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '800',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: badgeBg,
                          color: iconColor,
                          textTransform: 'uppercase'
                        }}>
                          {badgeLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{entry.id}</span>
                        <span>•</span>
                        <span>{new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        <span>•</span>
                        <span>{entry.notes || (isReceipt || isSupplierPayment ? entry.paymentMethod : `${entry.itemsCount} ${entry.itemsCount === 1 ? 'item' : 'items'}`)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Status Badge */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '800',
                      color: amountColor
                    }}>
                      {amountPrefix}Rs. {entry.amount.toLocaleString()}
                    </div>

                    <div style={{ marginTop: '3px', display: 'inline-block' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isPaid ? '#34d399' : '#f87171',
                        border: isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        {isPaid ? (isReceipt ? 'Received' : 'Paid') : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
