import React, { useState, useMemo } from 'react';
import { Plus, Trash2, User, Sparkles, RefreshCw, Clock, CheckCircle, Building2, BookOpen, Phone, MapPin, AlertCircle, Edit2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { showAppAlert } from '../utils/dialog';

export default function PosBilling({ 
  onBillCreated, 
  banks = [], 
  onNavigateToBanks, 
  items = [], 
  parties = [],
  bills = [],
  payments = [],
  onSaveParty
}) {
  // Customer details for online orders
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [discount, setDiscount] = useState(0);

  // Combined customer parties list with current Khata balances
  const customerPartiesList = useMemo(() => {
    const map = new Map();

    // 1. Registered Customer Parties
    parties.filter(p => p.type !== 'supplier').forEach(party => {
      const key = (party.phone || party.name).toLowerCase().trim();
      const opening = Number(party.openingBalance) || 0;
      const openingType = party.openingBalanceType || 'debit';
      map.set(key, {
        key,
        id: party.id,
        name: party.name,
        phone: party.phone || '',
        address: party.address || '',
        openingBalance: opening,
        openingBalanceType: openingType,
        totalDue: openingType === 'debit' ? opening : -opening
      });
    });

    // 2. Customers from past bills (ALL bills are debits - no status check)
    bills.forEach(bill => {
      const name = (bill.customerName || 'Walk-in Customer').trim();
      const phone = (bill.customerPhone || '').trim();
      const key = (phone || name).toLowerCase().trim();

      if (!map.has(key)) {
        map.set(key, {
          key,
          id: `cust_${key}`,
          name,
          phone,
          address: bill.deliveryAddress || '',
          totalDue: 0
        });
      }

      const client = map.get(key);
      const amount = Number(bill.netTotal) || 0;
      // All bills are debits (sales invoices) - payments handle the credit side
      client.totalDue += amount;
    });

    // 3. Deduct payments received from customers
    payments.filter(p => p.partyType !== 'supplier').forEach(pmt => {
      const name = (pmt.partyName || '').trim();
      const phone = (pmt.partyPhone || '').trim();
      const partyId = pmt.partyId || '';

      let client = null;
      for (const c of map.values()) {
        if ((partyId && c.id && c.id === partyId) ||
            (phone && c.phone && c.phone === phone) ||
            (name && c.name.toLowerCase().trim() === name.toLowerCase().trim())) {
          client = c;
          break;
        }
      }

      if (client) {
        const isSend = pmt.paymentType === 'send';
        const pAmt = Number(pmt.amount) || 0;
        if (isSend) {
          client.totalDue += pAmt;
        } else {
          client.totalDue -= pAmt;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [parties, bills, payments]);

  const [selectedPartyKey, setSelectedPartyKey] = useState('');
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  const handlePartySelect = (key) => {
    setSelectedPartyKey(key);
    if (!key) {
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setIsEditingDetails(false);
      return;
    }
    if (key === '__new__') {
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setIsEditingDetails(true);
      return;
    }
    const found = customerPartiesList.find(p => p.key === key);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
      setDeliveryAddress(found.address || '');
      setIsEditingDetails(false);
    }
  };

  const activeSelectedParty = useMemo(() => {
    if (!selectedPartyKey || selectedPartyKey === '__new__') return null;
    return customerPartiesList.find(p => p.key === selectedPartyKey) || null;
  }, [selectedPartyKey, customerPartiesList]);

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

  // Handle row field change with inventory auto-fill
  const handleRowChange = (id, field, value) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };

        // If selecting/typing chocolate name, check if matches catalog item
        if (field === 'name') {
          const matchedItem = items.find(it => it.name.toLowerCase() === value.trim().toLowerCase());
          if (matchedItem && (!updated.price || Number(updated.price) === 0)) {
            updated.price = matchedItem.salePrice;
          }
        }

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
    setSelectedPartyKey('');
    setIsEditingDetails(false);
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
      showAppAlert({
        title: 'Missing Order Items',
        message: 'Please enter at least one chocolate or perfume item and price.',
        type: 'warning'
      });
      return;
    }

    if (!customerName.trim()) {
      showAppAlert({
        title: 'Customer Name Required',
        message: 'Please select a Customer Party from the dropdown or enter a customer name.',
        type: 'warning'
      });
      return;
    }

    const billId = `CH-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBill = {
      id: billId,
      date: new Date().toISOString(),
      customerName: customerName.trim(),
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

    // Confetti effect on save
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#d4af37', '#e2b265', '#ba8339']
      });
    } catch (err) {
      // Ignored if confetti fails
    }

    onBillCreated(newBill);
    handleReset();
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '14px 14px 40px 14px' }}>
      
      <form onSubmit={handleGenerateBill}>
        
        {/* Customer & Online Delivery Info */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} color="var(--gold-primary)" />
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--gold-light)', margin: 0 }}>
                Customer & Parties Information
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(212, 163, 89, 0.12)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(212, 163, 89, 0.25)' }}>
              {customerPartiesList.length} Parties in Khata
            </span>
          </div>

          {/* Customer Party Select Dropdown */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--gold-light)', display: 'block', marginBottom: '5px' }}>
              Select Customer Party (Dropdown) *
            </label>
            <select
              value={selectedPartyKey}
              onChange={(e) => handlePartySelect(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                background: 'rgba(28, 15, 9, 0.95)',
                color: 'var(--text-main)',
                borderColor: selectedPartyKey ? 'var(--gold-primary)' : 'var(--border-subtle)',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
            >
              <option value="">-- Choose Customer Party from Directory --</option>
              <option value="__new__">➕ Enter New Customer / Walk-in Customer</option>
              {customerPartiesList.length > 0 && (
                <optgroup label="Registered Customer Parties & Khata Accounts">
                  {customerPartiesList.map(p => (
                    <option key={p.key} value={p.key}>
                      {p.name} {p.phone ? `(${p.phone})` : ''} • {p.totalDue > 0 ? `Due: Rs. ${p.totalDue.toLocaleString()}` : (p.totalDue < 0 ? `Advance: Rs. ${Math.abs(p.totalDue).toLocaleString()}` : 'Settled ✓')}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Active Selected Party Card */}
          {activeSelectedParty && (
            <div style={{
              background: 'rgba(20, 11, 7, 0.9)',
              border: '1px solid var(--gold-border)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--gold-light)' }}>
                    {activeSelectedParty.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                    Linked Party ✓
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingDetails(!isEditingDetails)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold-primary)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'underline'
                  }}
                >
                  <Edit2 size={11} />
                  <span>{isEditingDetails ? 'Hide Edit' : 'Edit Details'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {customerPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={11} color="var(--gold-primary)" />
                    <span>{customerPhone}</span>
                  </div>
                )}
                {deliveryAddress && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={11} color="var(--gold-primary)" />
                    <span>{deliveryAddress}</span>
                  </div>
                )}
              </div>

              {/* Khata Balance Notification */}
              <div style={{
                marginTop: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                background: activeSelectedParty.totalDue > 0 ? 'rgba(245, 158, 11, 0.12)' : (activeSelectedParty.totalDue < 0 ? 'rgba(96, 165, 250, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                color: activeSelectedParty.totalDue > 0 ? '#fbbf24' : (activeSelectedParty.totalDue < 0 ? '#93c5fd' : '#34d399'),
                border: `1px solid ${activeSelectedParty.totalDue > 0 ? 'rgba(245, 158, 11, 0.3)' : (activeSelectedParty.totalDue < 0 ? 'rgba(96, 165, 250, 0.3)' : 'rgba(16, 185, 129, 0.3)')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>
                  {activeSelectedParty.totalDue > 0 
                    ? `⚠️ Current Udhar / Receivable: Rs. ${activeSelectedParty.totalDue.toLocaleString()} (Pending)` 
                    : (activeSelectedParty.totalDue < 0 
                        ? `💳 Customer Advance Credit: Rs. ${Math.abs(activeSelectedParty.totalDue).toLocaleString()}` 
                        : `✓ Khata Settled (All previous bills cleared)`)}
                </span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>Khata Ledger Active</span>
              </div>
            </div>
          )}

          {/* New Customer / Editable Details Fields */}
          {(selectedPartyKey === '__new__' || isEditingDetails || !selectedPartyKey) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ayesha Khan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="form-input"
                    style={{ padding: '9px 12px', fontSize: '13px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    WhatsApp / Mobile No.
                  </label>
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
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Delivery Address / City (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DHA Phase 6, Karachi / House #, Street..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '13px' }}
                />
              </div>

              {selectedPartyKey === '__new__' && (
                <div style={{ fontSize: '11px', color: 'var(--gold-light)', background: 'rgba(212, 163, 89, 0.1)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(212, 163, 89, 0.2)' }}>
                  💡 This new customer will be automatically saved to your <strong>Parties & Khata Ledger</strong> directory when generating this bill.
                </div>
              )}
            </div>
          )}
        </div>

        {/* MOBILE-PERFECT ITEMS ENTRY SECTION */}
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '14px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                Items Entry (Chocolates & Perfumes)
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Chocolates, perfumes & gifts for this customer share a unified ledger
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
                      Item (Perfume / Chocolate)
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

                {/* Full-width Item Name Input */}
                <div>
                  <input
                    type="text"
                    list="pos-items-datalist"
                    placeholder="Type item name (e.g. Ferrero Rocher, Sauvage Perfume...)"
                    value={row.name}
                    onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                    autoComplete="off"
                  />
                  {(() => {
                    const matchedItem = items.find(it => it.name.toLowerCase() === (row.name || '').trim().toLowerCase());
                    if (!matchedItem) return null;
                    const isOut = (Number(matchedItem.stock) || 0) === 0;
                    return (
                      <div style={{ fontSize: '10.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          color: isOut ? '#f87171' : '#34d399', 
                          fontWeight: '700',
                          background: isOut ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          {isOut ? '⚠️ Out of Stock (0)' : `📦 In Stock: ${matchedItem.stock} ${matchedItem.unit || 'Units'}`}
                        </span>
                        <span style={{ color: 'var(--text-dim)' }}>
                          • Standard Price: Rs. {matchedItem.salePrice.toLocaleString()}
                        </span>
                      </div>
                    );
                  })()}
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

          {/* Datalist for Inventory Catalog Auto-Complete */}
          <datalist id="pos-items-datalist">
            {items.map(it => (
              <option 
                key={it.id} 
                value={it.name}
              >
                {`Rs. ${it.salePrice} (Stock: ${it.stock} ${it.unit || 'units'})`}
              </option>
            ))}
          </datalist>

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
