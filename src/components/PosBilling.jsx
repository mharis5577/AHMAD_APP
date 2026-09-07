import React, { useState, useMemo } from 'react';
import { Plus, Trash2, User, Sparkles, RefreshCw, Clock, CheckCircle, Building2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PosBilling({ onBillCreated, banks = [], onNavigateToBanks }) {
  // Customer details for online orders
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [discount, setDiscount] = useState(0);

  const bankOptions = useMemo(() => {
    if (banks && banks.length > 0) {
      return banks.map((b) => ({
        id: `Bank Transfer (${b.bankName})`,
        name: b.bankName,
        short: b.shortCode || b.bankName.slice(0, 5).toUpperCase()
      }));
    }
    return [
      { id: 'Bank Transfer (Meezan)', name: 'Meezan Bank', short: 'Meezan' },
      { id: 'Bank Transfer (Dubai Islamic)', name: 'Dubai Islamic Bank', short: 'DIB' },
      { id: 'Bank Transfer (UBL)', name: 'United Bank Limited', short: 'UBL' }
    ];
  }, [banks]);

  const [paymentMethod, setPaymentMethod] = useState(() => bankOptions[0]?.id || 'Bank Transfer (Meezan)');
  const [paymentStatus, setPaymentStatus] = useState('Pending'); // DEFAULT IS UNPAID / PENDING!
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (bankOptions.length > 0 && !bankOptions.some(b => b.id === paymentMethod)) {
      setPaymentMethod(bankOptions[0].id);
    }
  }, [bankOptions, paymentMethod]);

  // Table rows with purely manual chocolate name and price
  const [rows, setRows] = useState([
    { id: '1', name: '', qty: 1, price: '', total: 0 },
    { id: '2', name: '', qty: 1, price: '', total: 0 }
  ]);

  // Handle row field change
  const handleRowChange = (id, field, value) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };
        const qtyNum = Number(updated.qty) || 0;
        const priceNum = Number(updated.price) || 0;
        updated.total = qtyNum * priceNum;

        return updated;
      })
    );
  };

  // Add new manual row
  const addRow = () => {
    const newId = String(Date.now());
    setRows(prev => [...prev, { id: newId, name: '', qty: 1, price: '', total: 0 }]);
  };

  // Add multiple rows
  const addMultipleRows = (count = 3) => {
    const newRows = Array.from({ length: count }, (_, i) => ({
      id: String(Date.now() + i),
      name: '',
      qty: 1,
      price: '',
      total: 0
    }));
    setRows(prev => [...prev, ...newRows]);
  };

  // Remove row
  const removeRow = (id) => {
    if (rows.length === 1) {
      setRows([{ id: String(Date.now()), name: '', qty: 1, price: '', total: 0 }]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Reset rows
  const handleReset = () => {
    setRows([
      { id: '1', name: '', qty: 1, price: '', total: 0 },
      { id: '2', name: '', qty: 1, price: '', total: 0 }
    ]);
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setDiscount(0);
    setPaymentMethod('Bank Transfer (Meezan)');
    setPaymentStatus('Pending');
    setNotes('');
  };

  // Totals
  const subtotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  }, [rows]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - (Number(discount) || 0));
  }, [subtotal, discount]);

  const validItemsCount = useMemo(() => {
    return rows.filter(r => r.name.trim() !== '' && (Number(r.price) > 0)).length;
  }, [rows]);

  // Submit and generate HD bill
  const handleGenerateBill = (e) => {
    e.preventDefault();

    const validItems = rows
      .filter(r => r.name.trim() !== '' && (Number(r.price) > 0))
      .map((r, i) => ({
        id: `item_${i + 1}`,
        name: r.name.trim(),
        qty: Number(r.qty) || 1,
        price: Number(r.price) || 0,
        total: (Number(r.qty) || 1) * (Number(r.price) || 0)
      }));

    if (validItems.length === 0) {
      alert('Please enter at least one chocolate name and price!');
      return;
    }

    const billId = `TCH-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBill = {
      id: billId,
      date: new Date().toISOString(),
      customerName: customerName.trim() || 'Online Customer',
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      items: validItems,
      subtotal,
      discount: Number(discount) || 0,
      netTotal,
      paymentMethod,
      status: paymentStatus,
      notes: notes.trim()
    };

    // Confetti effect
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#d4a359', '#f3ce8a', '#5a301a', '#ffffff']
    });

    onBillCreated(newBill);
    handleReset();
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '14px 14px 40px 14px' }}>
      
      <form onSubmit={handleGenerateBill}>
        
        {/* Customer & Online Delivery Info */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <User size={16} color="var(--gold-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--gold-light)' }}>
              Online Order Details
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Customer Name</label>
              <input
                type="text"
                placeholder="e.g. Ayesha Khan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="form-input"
                style={{ padding: '9px 12px', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>WhatsApp / Mobile No.</label>
              <input
                type="text"
                placeholder="03xxxxxxxxx"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="form-input"
                style={{ padding: '9px 12px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Delivery Address / City (Optional)</label>
            <input
              type="text"
              placeholder="e.g. DHA Phase 6, Karachi / House #, Street..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="form-input"
              style={{ padding: '9px 12px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* MOBILE-PERFECT ITEMS ENTRY SECTION */}
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '14px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                Write Items (Name & Price)
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Manually enter chocolate name, quantity, and price
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px' }}
              title="Clear all rows"
            >
              <RefreshCw size={12} />
              <span>Clear</span>
            </button>
          </div>

          {/* List of Item Cards (Never squished on any phone screen!) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rows.map((row, index) => (
              <div
                key={row.id}
                style={{
                  background: 'rgba(24, 13, 8, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Header of each item: Item Number & Delete button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      background: 'var(--gold-primary)', 
                      color: '#120904', 
                      borderRadius: '50%', 
                      width: '20px', 
                      height: '20px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '11px', 
                      fontWeight: '800' 
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold-light)' }}>
                      Chocolate Item
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.12)', 
                      border: '1px solid rgba(239, 68, 68, 0.25)', 
                      color: '#ef4444', 
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>

                {/* Full-width Chocolate Name Input */}
                <div>
                  <input
                    type="text"
                    placeholder="Type chocolate name (e.g. Ferrero Rocher, Lindt, Patchi...)"
                    value={row.name}
                    onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                    autoComplete="off"
                  />
                </div>

                {/* Sub-row: Qty, Price, Line Total */}
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1.2fr 1fr', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={row.qty}
                      onChange={(e) => handleRowChange(row.id, 'qty', e.target.value)}
                      className="form-input"
                      style={{ padding: '8px 4px', fontSize: '13px', textAlign: 'center' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
                      Unit Price (Rs.)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={row.price}
                      onChange={(e) => handleRowChange(row.id, 'price', e.target.value)}
                      className="form-input"
                      style={{ padding: '8px 10px', fontSize: '13px', textAlign: 'right' }}
                    />
                  </div>

                  <div style={{ textAlign: 'right', background: 'rgba(0,0,0,0.25)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '1px' }}>
                      Row Total
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--gold-light)' }}>
                      {row.total ? `Rs. ${row.total.toLocaleString()}` : 'Rs. 0'}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Row Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={addRow}
              className="btn-gold"
              style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
            >
              <Plus size={15} />
              <span>Add Item</span>
            </button>

            <button
              type="button"
              onClick={() => addMultipleRows(3)}
              className="btn-secondary"
              style={{ padding: '10px 16px', fontSize: '12.5px' }}
              title="Add 3 blank items"
            >
              <span>+ 3 Items</span>
            </button>
          </div>

        </div>

        {/* ONLINE PAYMENT, STATUS & SUMMARY */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '18px' }}>
          
          {/* Bank Account Selection - Sleek 1-Tap Pills (No OS Dropdowns!) */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} color="var(--gold-primary)" />
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>
                  Select Receiving Bank Account
                </label>
              </div>
              {onNavigateToBanks && (
                <button
                  type="button"
                  onClick={onNavigateToBanks}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold-primary)',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Go to Bank Accounts management"
                >
                  <span>Edit Details →</span>
                </button>
              )}
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${Math.min(bankOptions.length, 3)}, 1fr)`, 
              gap: '6px' 
            }}>
              {bankOptions.map((b) => {
                const isSelected = paymentMethod === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setPaymentMethod(b.id)}
                    style={{
                      padding: '9px 4px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'linear-gradient(135deg, rgba(212,163,89,0.25), rgba(170,122,52,0.3))' : 'rgba(255,255,255,0.04)',
                      color: isSelected ? 'var(--gold-light)' : 'var(--text-muted)',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: isSelected ? '0 0 10px rgba(212,163,89,0.2)' : 'none',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '800' }}>{b.short}</span>
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>Bank</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Status (Default Unpaid / Pending) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
              Payment Status
            </label>
            <div style={{ display: 'flex', gap: '8px', height: '40px' }}>
              <button
                type="button"
                onClick={() => setPaymentStatus('Pending')}
                style={{
                  flex: 1,
                  padding: '0 8px',
                  borderRadius: '10px',
                  border: paymentStatus === 'Pending' ? '1.5px solid #f59e0b' : '1px solid var(--border-subtle)',
                  background: paymentStatus === 'Pending' ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                  color: paymentStatus === 'Pending' ? '#fbbf24' : 'var(--text-muted)',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={14} />
                <span>Unpaid / Pending</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatus('Paid')}
                style={{
                  flex: 1,
                  padding: '0 8px',
                  borderRadius: '10px',
                  border: paymentStatus === 'Paid' ? '1.5px solid #10b981' : '1px solid var(--border-subtle)',
                  background: paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                  color: paymentStatus === 'Paid' ? '#34d399' : 'var(--text-muted)',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle size={14} />
                <span>Paid / Received</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Discount (Rs.)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="form-input"
                style={{ padding: '9px 12px', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Order Notes / Special Packing</label>
              <input
                type="text"
                placeholder="e.g. Gift box, satin ribbon, ice packs..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                style={{ padding: '9px 12px', fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* Subtotal, Discount & Net Payable */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              <span>Subtotal ({validItemsCount} items):</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {Number(discount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#f87171' }}>
                <span>Discount:</span>
                <span>- Rs. {Number(discount).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Total Payable:</span>
              <span className="gold-gradient-text" style={{ fontSize: '22px', fontWeight: '800' }}>
                Rs. {netTotal.toLocaleString()}
              </span>
            </div>
          </div>

        </div>

        {/* Big HD Bill Generation Button */}
        <button
          type="submit"
          disabled={validItemsCount === 0}
          className="btn-gold"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '15px',
            opacity: validItemsCount === 0 ? 0.5 : 1,
            cursor: validItemsCount === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          <Sparkles size={18} />
          <span>Generate HD Mobile Size Bill</span>
        </button>

      </form>

    </div>
  );
}
