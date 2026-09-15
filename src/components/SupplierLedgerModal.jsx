import React, { useState, useMemo } from 'react';
import { X, Building, Phone, CreditCard, Share2, CheckCircle, Clock, Eye, Check, Copy, Plus, Trash2, Receipt, Sparkles } from 'lucide-react';
import { BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';
import { shareBillText } from '../utils/shareUtils';
import confetti from 'canvas-confetti';

const QUICK_STOCK_ITEMS = [
  'Cocoa Butter (kg)',
  'Dark Chocolate Callets (kg)',
  'Milk Chocolate Couverture (kg)',
  'Roasted Hazelnuts (kg)',
  'Custom Packaging Boxes'
];

export default function SupplierLedgerModal({ 
  supplier, 
  banks = BANK_ACCOUNTS,
  onClose, 
  onUpdatePurchaseStatus, 
  onViewPurchase,
  onPurchaseCreated 
}) {
  const [copiedField, setCopiedField] = useState(null);

  if (!supplier) return null;

  const activeBanks = (banks && banks.length > 0) ? banks : BANK_ACCOUNTS;
  const hasPayable = supplier.totalPayable > 0;
  const pendingPurchases = supplier.purchases.filter(p => p.status === 'Pending');

  // Add Purchase state
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [rows, setRows] = useState([
    { id: '1', name: '', qty: 1, price: '', total: 0 }
  ]);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [paymentMethod, setPaymentMethod] = useState(() => 
    activeBanks[0] ? `Bank Transfer (${activeBanks[0].bankName})` : 'Cash'
  );
  const [notes, setNotes] = useState('');

  const copyToClipboard = (text, field) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      console.warn('Copy error', e);
    }
  };

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };
      const qtyNum = Number(updated.qty) || 0;
      const priceNum = Number(updated.price) || 0;
      updated.total = qtyNum * priceNum;
      return updated;
    }));
  };

  const handleAddRow = (initialName = '') => {
    setRows(prev => [
      ...prev,
      { id: Date.now().toString(), name: initialName, qty: 1, price: '', total: 0 }
    ]);
  };

  const handleRemoveRow = (id) => {
    if (rows.length === 1) {
      setRows([{ id: '1', name: '', qty: 1, price: '', total: 0 }]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleAddQuickChip = (itemName) => {
    const emptyRow = rows.find(r => !r.name.trim());
    if (emptyRow) {
      handleRowChange(emptyRow.id, 'name', itemName);
    } else {
      handleAddRow(itemName);
    }
  };

  const subtotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  }, [rows]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - (Number(discount) || 0));
  }, [subtotal, discount]);

  const handleSavePurchase = (e) => {
    e.preventDefault();

    const validItems = rows
      .filter(r => r.name.trim() !== '' && Number(r.price) > 0)
      .map((r, i) => ({
        id: `p_item_${i + 1}`,
        name: r.name.trim(),
        qty: Number(r.qty) || 1,
        price: Number(r.price) || 0,
        total: (Number(r.qty) || 1) * (Number(r.price) || 0)
      }));

    if (validItems.length === 0) {
      alert('Please enter at least one item with valid purchase cost!');
      return;
    }

    const purchaseId = `PUR-${Math.floor(2000 + Math.random() * 8000)}`;
    const newPurchase = {
      id: purchaseId,
      date: new Date().toISOString(),
      supplierName: supplier.name,
      supplierPhone: supplier.phone || '',
      supplierBank: supplier.bank || {},
      items: validItems,
      subtotal,
      discount: Number(discount) || 0,
      netTotal,
      paymentMethod,
      status: paymentStatus,
      notes: notes.trim()
    };

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#f3ce8a']
      });
    } catch (err) {
      // safe fallback
    }

    onPurchaseCreated?.(newPurchase);

    // Reset form
    setRows([{ id: '1', name: '', qty: 1, price: '', total: 0 }]);
    setDiscount(0);
    setNotes('');
    setIsAddingPurchase(false);
  };

  // WhatsApp Payment Advice
  const sendWhatsAppAdvice = async () => {
    let msg = `🍫 *${BUSINESS_INFO.name.toUpperCase()} — SUPPLIER PAYMENT ADVICE*\n`;
    msg += `═══════════════════════════\n`;
    msg += `🏢 Supplier: *${supplier.name}*\n`;
    if (supplier.phone) msg += `📞 Phone: ${supplier.phone}\n`;
    msg += `📅 Date: ${new Date().toLocaleDateString('en-PK', { dateStyle: 'medium' })}\n`;
    msg += `═══════════════════════════\n\n`;

    msg += `• Total Stock Purchases: Rs. ${supplier.totalPurchased.toLocaleString()}\n`;
    msg += `• Total Amount Paid: Rs. ${supplier.totalPaid.toLocaleString()}\n`;
    msg += `• *BALANCE PAYABLE: Rs. ${supplier.totalPayable.toLocaleString()}*\n\n`;

    if (pendingPurchases.length > 0) {
      msg += `📋 *PENDING INVOICES TO PAY:*\n`;
      pendingPurchases.forEach((p, idx) => {
        const d = new Date(p.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
        msg += `${idx + 1}. #${p.id} (${d}) = *Rs. ${p.netTotal.toLocaleString()}*\n`;
      });
      msg += `\n`;
    }

    if (supplier.bank?.bankName) {
      msg += `🏦 *BENEFICIARY BANK ACCOUNT:*\n`;
      msg += `• Bank: ${supplier.bank.bankName}\n`;
      if (supplier.bank.accountTitle) msg += `• Title: ${supplier.bank.accountTitle}\n`;
      if (supplier.bank.accountNo) msg += `• A/C: ${supplier.bank.accountNo}\n`;
      if (supplier.bank.iban) msg += `• IBAN: ${supplier.bank.iban}\n\n`;
    }

    msg += `_Payment advice from The Chocolate House (03353465000)._`;

    await shareBillText({
      title: `Payment Advice - ${supplier.name}`,
      text: msg,
      phone: supplier.phone
    });
  };

  // Settle all unpaid purchases for this supplier
  const handleSettleAll = () => {
    if (window.confirm(`Mark all pending purchases for ${supplier.name} as Paid?`)) {
      supplier.purchases
        .filter(p => p.status === 'Pending')
        .forEach(p => onUpdatePurchaseStatus?.(p.id, 'Paid'));
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 90,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '16px 12px 90px 12px'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          margin: '0 auto',
          padding: '20px 18px',
          border: '1px solid #10b981',
          borderRadius: '16px',
          position: 'relative',
          boxShadow: '0 10px 35px rgba(0,0,0,0.6)'
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px' }}>
                <Building size={18} color="#34d399" />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                {supplier.name}
              </h2>
            </div>

            {supplier.phone && (
              <div style={{ fontSize: '12px', color: 'var(--gold-light)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '34px' }}>
                <Phone size={12} />
                <span>{supplier.phone}</span>
              </div>
            )}
          </div>

          <button 
            onClick={onClose} 
            className="btn-icon" 
            style={{ width: '32px', height: '32px' }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Supplier Beneficiary Bank Box (if available) */}
        {supplier.bank?.bankName && (
          <div style={{ background: 'rgba(18, 10, 6, 0.8)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(212,163,89,0.25)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CreditCard size={13} />
                <span>SUPPLIER BANK DETAILS (FOR TRANSFER)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const full = `${supplier.bank.bankName}\nTitle: ${supplier.bank.accountTitle}\n${supplier.bank.accountNo ? `A/C: ${supplier.bank.accountNo}\n` : ''}IBAN: ${supplier.bank.iban}`;
                  copyToClipboard(full, 'full');
                }}
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '10px', height: '22px' }}
              >
                {copiedField === 'full' ? <Check size={11} color="var(--status-paid)" /> : <Copy size={11} />}
                <span>{copiedField === 'full' ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.4 }}>
              <strong>{supplier.bank.bankName}</strong>: {supplier.bank.accountTitle}<br />
              {supplier.bank.accountNo && <span>A/C: {supplier.bank.accountNo} | </span>}
              <span style={{ fontFamily: 'monospace', color: 'var(--gold-light)' }}>IBAN: {supplier.bank.iban}</span>
            </div>
          </div>
        )}

        {/* Financial Metric Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          <div className="glass-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Total Purchases</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
              Rs. {supplier.totalPurchased.toLocaleString()}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Total Paid</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>
              Rs. {supplier.totalPaid.toLocaleString()}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '10px 8px', textAlign: 'center', border: hasPayable ? '1px solid #f59e0b' : '1px solid #10b981' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Balance Payable</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: hasPayable ? '#fbbf24' : '#34d399', marginTop: '2px' }}>
              {hasPayable ? `Rs. ${supplier.totalPayable.toLocaleString()}` : 'Settled ✓'}
            </div>
          </div>
        </div>

        {/* Action Buttons: Add Purchase, WhatsApp Advice & Settle All */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsAddingPurchase(!isAddingPurchase)}
            className="btn-gold"
            style={{ flex: '1 1 140px', padding: '10px', fontSize: '12.5px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            {isAddingPurchase ? <X size={15} /> : <Plus size={15} />}
            <span>{isAddingPurchase ? 'Close Purchase Form' : '+ Add Stock Voucher'}</span>
          </button>

          <button
            onClick={sendWhatsAppAdvice}
            className="btn-secondary"
            style={{ flex: '1 1 140px', padding: '10px', fontSize: '12px', borderColor: '#25D366', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Share2 size={14} color="#25D366" />
            <span>WhatsApp Advice</span>
          </button>

          {hasPayable && (
            <button
              onClick={handleSettleAll}
              className="btn-secondary"
              style={{ padding: '10px 14px', fontSize: '12px', borderColor: '#10b981', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Mark all pending purchase invoices as paid"
            >
              <Check size={14} />
              <span>Settle All</span>
            </button>
          )}
        </div>

        {/* IN-LEDGER ADD STOCK VOUCHER FORM */}
        {isAddingPurchase && (
          <form 
            onSubmit={handleSavePurchase}
            className="glass-card" 
            style={{ 
              padding: '16px', 
              marginBottom: '18px', 
              border: '2px solid #10b981', 
              borderRadius: '14px',
              background: 'linear-gradient(145deg, rgba(16, 40, 28, 0.95), rgba(12, 24, 18, 0.98))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: '800', fontSize: '14px' }}>
                <Receipt size={16} />
                <span>New Stock Purchase for {supplier.name}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddingPurchase(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Chips */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '5px' }}>Common Stock Items:</div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {QUICK_STOCK_ITEMS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleAddQuickChip(item)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      cursor: 'pointer'
                    }}
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {rows.map((row, idx) => (
                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 65px 85px 30px', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={`Stock Item ${idx + 1}`}
                    value={row.name}
                    onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                    className="form-input"
                    style={{ height: '34px', fontSize: '12px', padding: '0 8px' }}
                    required={idx === 0}
                  />

                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={row.qty}
                    onChange={(e) => handleRowChange(row.id, 'qty', e.target.value)}
                    className="form-input"
                    style={{ height: '34px', fontSize: '12px', padding: '0 6px', textAlign: 'center' }}
                  />

                  <input
                    type="number"
                    placeholder="Cost (Rs)"
                    min="0"
                    value={row.price}
                    onChange={(e) => handleRowChange(row.id, 'price', e.target.value)}
                    className="form-input"
                    style={{ height: '34px', fontSize: '12px', padding: '0 8px', textAlign: 'right' }}
                    required={idx === 0}
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    style={{
                      height: '34px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove row"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => handleAddRow()}
                className="btn-secondary"
                style={{ alignSelf: 'flex-start', padding: '5px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
              >
                <Plus size={12} />
                <span>Add Item Row</span>
              </button>
            </div>

            {/* Financial Summary Strip */}
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>Rs. {subtotal.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                <span>Supplier Discount (Rs):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="form-input"
                  style={{ width: '90px', height: '26px', fontSize: '12px', textAlign: 'right', padding: '0 6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: '#34d399', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span>Net Purchase Total:</span>
                <span>Rs. {netTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Status: Pending vs Paid */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>Khata / Payable Status:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('Pending')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: paymentStatus === 'Pending' ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
                    background: paymentStatus === 'Pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0,0,0,0.3)',
                    color: paymentStatus === 'Pending' ? '#fbbf24' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <Clock size={13} />
                  <span>Unpaid / Payable (Khata)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentStatus('Paid')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: paymentStatus === 'Paid' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                    background: paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)',
                    color: paymentStatus === 'Paid' ? '#34d399' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <CheckCircle size={13} />
                  <span>Paid (Settled)</span>
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Paid / Transfer From:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="form-input"
                style={{ width: '100%', height: '34px', fontSize: '12px' }}
              >
                {activeBanks.map((b) => (
                  <option key={b.id} value={`Bank Transfer (${b.bankName})`}>
                    {b.bankName} ({b.accountTitle})
                  </option>
                ))}
                <option value="Cash">Cash</option>
              </select>
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsAddingPurchase(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '10px', fontSize: '12.5px' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-gold"
                style={{ flex: 2, padding: '10px', fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Sparkles size={15} />
                <span>Save Stock Voucher</span>
              </button>
            </div>
          </form>
        )}

        {/* List of Purchases for this Supplier */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Purchase Vouchers ({supplier.purchases.length}):</span>
            {!isAddingPurchase && (
              <button
                onClick={() => setIsAddingPurchase(true)}
                className="btn-secondary"
                style={{ padding: '3px 9px', fontSize: '11px', borderColor: '#10b981', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={12} />
                <span>+ Add Stock Bill</span>
              </button>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
            <span>Tap Mark Paid to update status</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
            {supplier.purchases.map((p) => {
              const dateStr = new Date(p.date).toLocaleDateString('en-PK', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const isPaid = p.status === 'Paid';

              return (
                <div
                  key={p.id}
                  className="glass-card"
                  style={{
                    padding: '12px',
                    borderLeft: `4px solid ${isPaid ? '#10b981' : '#f59e0b'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', color: '#34d399', fontSize: '13px' }}>
                        {p.id}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                        {dateStr}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {p.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </div>

                    {p.paidFromBank && (
                      <div style={{ fontSize: '10.5px', color: 'var(--gold-light)', marginTop: '2px' }}>
                        Paid From: {p.paidFromBank}
                      </div>
                    )}
                  </div>

                  {/* Right side: Amount & Actions */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                      Rs. {p.netTotal.toLocaleString()}
                    </div>

                    <button
                      onClick={() => onUpdatePurchaseStatus?.(p.id, isPaid ? 'Pending' : 'Paid')}
                      style={{
                        background: isPaid ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                        color: isPaid ? '#34d399' : '#fbbf24',
                        border: `1px solid ${isPaid ? '#10b981' : '#f59e0b'}`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Click to toggle Paid / Unpaid"
                    >
                      {isPaid ? <CheckCircle size={10} /> : <Clock size={10} />}
                      <span>{isPaid ? 'Paid' : 'Unpaid'}</span>
                    </button>

                    {onViewPurchase && (
                      <button
                        onClick={() => onViewPurchase(p)}
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={11} />
                        <span>View</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
