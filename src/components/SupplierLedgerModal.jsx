import React, { useState } from 'react';
import { X, Building, Phone, CreditCard, Share2, CheckCircle, Clock, Eye, Check, Copy } from 'lucide-react';
import { BUSINESS_INFO } from '../data/initialData';

export default function SupplierLedgerModal({ 
  supplier, 
  onClose, 
  onUpdatePurchaseStatus, 
  onViewPurchase 
}) {
  const [copiedField, setCopiedField] = useState(null);

  if (!supplier) return null;

  const hasPayable = supplier.totalPayable > 0;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Send WhatsApp Payment Notice to Supplier
  const sendWhatsAppAdvice = () => {
    const pendingPurchases = supplier.purchases.filter(p => p.status === 'Pending');

    let msg = `🍫 *${BUSINESS_INFO.name.toUpperCase()} — SUPPLIER PAYMENT RECORD*\n`;
    msg += `═══════════════════════════\n`;
    msg += `🏢 Supplier: *${supplier.name}*\n`;
    if (supplier.phone) msg += `📞 Contact: ${supplier.phone}\n`;
    msg += `📅 Date: ${new Date().toLocaleDateString('en-PK', { dateStyle: 'medium' })}\n`;
    msg += `═══════════════════════════\n\n`;

    msg += `📊 *ACCOUNT SUMMARY:*\n`;
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

    const encoded = encodeURIComponent(msg);
    const cleanPhone = supplier.phone ? supplier.phone.replace(/[^0-9]/g, '') : '';
    const waPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    window.open(waPhone ? `https://wa.me/${waPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`, '_blank');
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
          maxWidth: '540px',
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

        {/* Action Buttons: WhatsApp Advice & Settle All */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={sendWhatsAppAdvice}
            className="btn-secondary"
            style={{ flex: 1, padding: '10px', fontSize: '12px', borderColor: '#25D366', color: '#4ade80' }}
          >
            <Share2 size={14} color="#25D366" />
            <span>WhatsApp Payment Advice</span>
          </button>

          {hasPayable && (
            <button
              onClick={handleSettleAll}
              className="btn-gold"
              style={{ padding: '10px 14px', fontSize: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff' }}
              title="Mark all pending purchase invoices as paid"
            >
              <Check size={14} />
              <span>Settle All</span>
            </button>
          )}
        </div>

        {/* List of Purchases for this Supplier */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Purchase Vouchers ({supplier.purchases.length}):</span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 'normal' }}>Tap Mark Paid to update status</span>
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
