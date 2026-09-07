import React from 'react';
import { X, User, Phone, MapPin, Share2, CheckCircle, Clock, Eye, Check } from 'lucide-react';
import { BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';

export default function CustomerLedgerModal({ client, onClose, onUpdateBillStatus, onViewBill, banks = BANK_ACCOUNTS }) {
  if (!client) return null;

  const activeBanks = (banks && banks.length > 0) ? banks : BANK_ACCOUNTS;
  const hasDue = client.totalDue > 0;

  // Send WhatsApp Account Statement
  const sendWhatsAppStatement = () => {
    const pendingBills = client.bills.filter(b => b.status === 'Pending');

    let msg = `🍫 *${BUSINESS_INFO.name.toUpperCase()} — ACCOUNT STATEMENT*\n`;
    msg += `═══════════════════════════\n`;
    msg += `👤 Customer: *${client.name}*\n`;
    if (client.phone) msg += `📞 Phone: ${client.phone}\n`;
    msg += `📅 Date: ${new Date().toLocaleDateString('en-PK', { dateStyle: 'medium' })}\n`;
    msg += `═══════════════════════════\n\n`;

    msg += `📊 *LEDGER SUMMARY:*\n`;
    msg += `• Total Orders: Rs. ${client.totalBilled.toLocaleString()}\n`;
    msg += `• Amount Paid: Rs. ${client.totalPaid.toLocaleString()}\n`;
    msg += `• *BALANCE DUE: Rs. ${client.totalDue.toLocaleString()}*\n\n`;

    if (pendingBills.length > 0) {
      msg += `📋 *UNPAID ORDERS:*\n`;
      pendingBills.forEach((b, idx) => {
        const d = new Date(b.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
        msg += `${idx + 1}. #${b.id} (${d}) = *Rs. ${b.netTotal.toLocaleString()}*\n`;
      });
      msg += `\n`;
    }

    msg += `═══════════════════════════\n`;
    msg += `💳 *BANK TRANSFER DETAILS:*\n\n`;

    activeBanks.forEach((bank) => {
      msg += `🏛 *${bank.bankName}*\n`;
      msg += `Title: ${bank.accountTitle}\n`;
      if (bank.accountNo) msg += `A/C: ${bank.accountNo}\n`;
      msg += `IBAN: ${bank.iban}\n\n`;
    });

    msg += `_Please share screenshot after payment transfer._\n`;
    msg += `Thank you! 🍫`;

    const encoded = encodeURIComponent(msg);
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    window.open(waPhone ? `https://wa.me/${waPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`, '_blank');
  };

  // Settle all unpaid bills for this client
  const handleSettleAll = () => {
    if (window.confirm(`Mark all unpaid bills for ${client.name} as Paid?`)) {
      client.bills
        .filter(b => b.status === 'Pending')
        .forEach(b => onUpdateBillStatus(b.id, 'Paid'));
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
          border: '1px solid var(--gold-primary)',
          borderRadius: '16px',
          position: 'relative'
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--gold-primary)" />
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                {client.name}
              </h2>
            </div>

            {client.phone && (
              <div style={{ fontSize: '12px', color: 'var(--gold-light)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={12} />
                <span>{client.phone}</span>
              </div>
            )}

            {client.address && (
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={11} />
                <span>{client.address}</span>
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

        {/* Customer Balance Metric Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          <div className="glass-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Total Billed</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
              Rs. {client.totalBilled.toLocaleString()}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Total Paid</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>
              Rs. {client.totalPaid.toLocaleString()}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '10px 8px', textAlign: 'center', border: hasDue ? '1px solid #f59e0b' : '1px solid #10b981' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Balance Due</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: hasDue ? '#fbbf24' : '#34d399', marginTop: '2px' }}>
              {hasDue ? `Rs. ${client.totalDue.toLocaleString()}` : 'Settled ✓'}
            </div>
          </div>
        </div>

        {/* Action Buttons: WhatsApp Statement & Settle All */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={sendWhatsAppStatement}
            className="btn-secondary"
            style={{ flex: 1, padding: '10px', fontSize: '12px', borderColor: '#25D366', color: '#4ade80' }}
          >
            <Share2 size={14} color="#25D366" />
            <span>WhatsApp Khata Statement</span>
          </button>

          {hasDue && (
            <button
              onClick={handleSettleAll}
              className="btn-gold"
              style={{ padding: '10px 14px', fontSize: '12px' }}
              title="Mark all pending bills as paid"
            >
              <Check size={14} />
              <span>Settle All</span>
            </button>
          )}
        </div>

        {/* List of Bills for this Customer */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold-light)', marginBottom: '8px' }}>
            Order History ({client.bills.length} {client.bills.length === 1 ? 'bill' : 'bills'}):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
            {client.bills.map((bill) => {
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
                      <span style={{ fontWeight: '800', color: 'var(--gold-primary)', fontSize: '13px' }}>
                        {bill.id}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                        {dateStr}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {bill.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </div>

                    <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {bill.paymentMethod}
                    </div>
                  </div>

                  {/* Right side: Price & Action */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                      Rs. {bill.netTotal.toLocaleString()}
                    </div>

                    <button
                      onClick={() => onUpdateBillStatus(bill.id, isPaid ? 'Pending' : 'Paid')}
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

                    <button
                      onClick={() => {
                        onViewBill(bill);
                      }}
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={11} />
                      <span>View Bill</span>
                    </button>
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
