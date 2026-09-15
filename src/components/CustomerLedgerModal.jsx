import React, { useState, useMemo } from 'react';
import { X, User, Phone, MapPin, Share2, CheckCircle, Clock, Eye, Check, Plus, Trash2, Receipt, Sparkles } from 'lucide-react';
import { BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';
import { shareBillText } from '../utils/shareUtils';
import confetti from 'canvas-confetti';

const QUICK_CHOCOLATES = [
  'Assorted Chocolate Box',
  'Dark Truffles (12 pcs)',
  'Pistachio Kunafa Bar',
  'Milk Chocolate Bar',
  'Luxury Gift Hamper'
];

export default function CustomerLedgerModal({ 
  client, 
  onClose, 
  onUpdateBillStatus, 
  onViewBill, 
  banks = BANK_ACCOUNTS,
  onBillCreated 
}) {
  if (!client) return null;

  const activeBanks = (banks && banks.length > 0) ? banks : BANK_ACCOUNTS;
  const hasDue = client.totalDue > 0;

  // Add Bill state
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [rows, setRows] = useState([
    { id: '1', name: '', qty: 1, price: '', total: 0 }
  ]);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [paymentMethod, setPaymentMethod] = useState(() => 
    activeBanks[0] ? `Bank Transfer (${activeBanks[0].bankName})` : 'Cash on Delivery'
  );
  const [deliveryAddress, setDeliveryAddress] = useState(client.address || '');
  const [notes, setNotes] = useState('');

  // Row changes
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

  const handleAddQuickChip = (chocName) => {
    const emptyRow = rows.find(r => !r.name.trim());
    if (emptyRow) {
      handleRowChange(emptyRow.id, 'name', chocName);
    } else {
      handleAddRow(chocName);
    }
  };

  const subtotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  }, [rows]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - (Number(discount) || 0));
  }, [subtotal, discount]);

  const handleSaveBill = (e) => {
    e.preventDefault();

    const validItems = rows
      .filter(r => r.name.trim() !== '' && Number(r.price) > 0)
      .map((r, i) => ({
        id: `item_${i + 1}`,
        name: r.name.trim(),
        qty: Number(r.qty) || 1,
        price: Number(r.price) || 0,
        total: (Number(r.qty) || 1) * (Number(r.price) || 0)
      }));

    if (validItems.length === 0) {
      alert('Please enter at least one item with a valid price!');
      return;
    }

    const billId = `TCH-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBill = {
      id: billId,
      date: new Date().toISOString(),
      customerName: client.name,
      customerPhone: client.phone || '',
      deliveryAddress: (deliveryAddress || client.address || '').trim(),
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
        colors: ['#d4a359', '#f3ce8a', '#10b981']
      });
    } catch (err) {
      // safe fallback
    }

    onBillCreated?.(newBill);

    // Reset form
    setRows([{ id: '1', name: '', qty: 1, price: '', total: 0 }]);
    setDiscount(0);
    setNotes('');
    setIsAddingBill(false);
  };

  // Send WhatsApp Account Statement
  const sendWhatsAppStatement = async () => {
    const pendingBills = client.bills.filter(b => b.status === 'Pending');

    let msg = `🍫 *${BUSINESS_INFO.name.toUpperCase()} — ACCOUNT STATEMENT*\n`;
    msg += `═══════════════════════════\n`;
    msg += `👤 Customer: *${client.name}*\n`;
    if (client.phone) msg += `📞 Phone: ${client.phone}\n`;
    msg += `📅 Date: ${new Date().toLocaleDateString('en-PK', { dateStyle: 'medium' })}\n`;
    msg += `═══════════════════════════\n\n`;

    msg += `• Total Bills Generated: Rs. ${client.totalPurchased.toLocaleString()}\n`;
    msg += `• Total Amount Paid: Rs. ${client.totalPaid.toLocaleString()}\n`;
    msg += `• *OUTSTANDING DUE: Rs. ${client.totalDue.toLocaleString()}*\n\n`;

    if (pendingBills.length > 0) {
      msg += `📋 *PENDING UNPAID INVOICES:*\n`;
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

    await shareBillText({
      title: `Account Statement - ${client.name}`,
      text: msg,
      phone: client.phone
    });
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

        {/* Primary Action Buttons: Add Bill, WhatsApp Statement & Settle All */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsAddingBill(!isAddingBill)}
            className="btn-gold"
            style={{ flex: '1 1 140px', padding: '10px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            {isAddingBill ? <X size={15} /> : <Plus size={15} />}
            <span>{isAddingBill ? 'Close Bill Form' : '+ Add Bill to Ledger'}</span>
          </button>

          <button
            onClick={sendWhatsAppStatement}
            className="btn-secondary"
            style={{ flex: '1 1 140px', padding: '10px', fontSize: '12px', borderColor: '#25D366', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Share2 size={14} color="#25D366" />
            <span>WhatsApp Statement</span>
          </button>

          {hasDue && (
            <button
              onClick={handleSettleAll}
              className="btn-secondary"
              style={{ padding: '10px 14px', fontSize: '12px', borderColor: '#10b981', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Mark all pending bills as paid"
            >
              <Check size={14} />
              <span>Settle All</span>
            </button>
          )}
        </div>

        {/* IN-LEDGER ADD BILL FORM */}
        {isAddingBill && (
          <form 
            onSubmit={handleSaveBill}
            className="glass-card" 
            style={{ 
              padding: '16px', 
              marginBottom: '18px', 
              border: '2px solid var(--gold-primary)', 
              borderRadius: '14px',
              background: 'linear-gradient(145deg, rgba(38, 20, 12, 0.95), rgba(24, 13, 8, 0.98))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-light)', fontWeight: '800', fontSize: '14px' }}>
                <Receipt size={16} />
                <span>New Bill for {client.name}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddingBill(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Chips */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '5px' }}>Quick Chocolate Presets:</div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {QUICK_CHOCOLATES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleAddQuickChip(c)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '12px',
                      background: 'rgba(212, 163, 89, 0.12)',
                      border: '1px solid rgba(212, 163, 89, 0.3)',
                      color: 'var(--gold-light)',
                      cursor: 'pointer'
                    }}
                  >
                    + {c}
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
                    placeholder={`Item ${idx + 1} Name`}
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
                    placeholder="Price (Rs)"
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
                    title="Remove item"
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
                <span>Discount (Rs):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="form-input"
                  style={{ width: '90px', height: '26px', fontSize: '12px', textAlign: 'right', padding: '0 6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: 'var(--gold-light)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span>Net Total Bill:</span>
                <span>Rs. {netTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Status: Pending vs Paid */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>Khata / Payment Status:</label>
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
                  <span>Unpaid / Due (Khata)</span>
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
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Payment Account / Method:</label>
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
                <option value="Cash / Hand-to-Hand">Cash / Hand-to-Hand</option>
                <option value="Online Delivery">Online Delivery</option>
              </select>
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsAddingBill(false)}
                className="btn-secondary"
                style={{ flex: 1, padding: '10px', fontSize: '12.5px' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-gold"
                style={{ flex: 2, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Sparkles size={15} />
                <span>Create & Add Bill</span>
              </button>
            </div>
          </form>
        )}

        {/* List of Bills for this Customer */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold-light)' }}>
              Order History ({client.bills.length} {client.bills.length === 1 ? 'bill' : 'bills'}):
            </div>
            {!isAddingBill && (
              <button
                onClick={() => setIsAddingBill(true)}
                className="btn-secondary"
                style={{ padding: '3px 9px', fontSize: '11px', borderColor: 'var(--gold-primary)', color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={12} />
                <span>+ Add Bill</span>
              </button>
            )}
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
