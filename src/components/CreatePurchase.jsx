import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Building, Phone, Sparkles, RefreshCw, Clock, CheckCircle, CreditCard, Bookmark, BookOpen, Edit2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { showAppAlert } from '../utils/dialog';

export default function CreatePurchase({ 
  suppliers = [], 
  onPurchaseCreated, 
  onSaveSupplier, 
  banks = [], 
  items = [],
  parties = [],
  purchases = [],
  payments = []
}) {
  // Supplier Information
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [iban, setIban] = useState('');

  // Combined supplier parties list with current Khata balances
  const supplierPartiesList = useMemo(() => {
    const map = new Map();

    // 1. Registered Suppliers in parties
    parties.filter(p => p.type === 'supplier').forEach(party => {
      const key = (party.phone || party.name).toLowerCase().trim();
      const opening = Number(party.openingBalance) || 0;
      const openingType = party.openingBalanceType || 'credit';
      map.set(key, {
        key,
        id: party.id,
        name: party.name,
        phone: party.phone || '',
        bank: party.bank || {},
        openingBalance: opening,
        openingBalanceType: openingType,
        totalPayable: openingType === 'credit' ? opening : -opening
      });
    });

    // 2. Suppliers from suppliers list
    suppliers.forEach(sup => {
      const key = (sup.phone || sup.name).toLowerCase().trim();
      if (!map.has(key)) {
        const opening = Number(sup.openingBalance) || 0;
        const openingType = sup.openingBalanceType || 'credit';
        map.set(key, {
          key,
          id: sup.id,
          name: sup.name,
          phone: sup.phone || '',
          bank: sup.bank || { bankName: sup.bankName, accountTitle: sup.accountTitle, accountNo: sup.accountNo, iban: sup.iban },
          openingBalance: opening,
          openingBalanceType: openingType,
          totalPayable: openingType === 'credit' ? opening : -opening
        });
      }
    });

    // 3. Aggregate past purchases (ALL purchases are credits - no status check)
    purchases.forEach(pur => {
      const name = (pur.supplierName || 'General Supplier').trim();
      const phone = (pur.supplierPhone || '').trim();
      const key = (phone || name).toLowerCase().trim();

      if (!map.has(key)) {
        map.set(key, {
          key,
          id: `sup_${key}`,
          name,
          phone,
          bank: pur.supplierBank || {},
          totalPayable: 0
        });
      }

      const s = map.get(key);
      const amount = Number(pur.netTotal) || 0;
      // All purchases are credits (accounts payable) - payments handle the debit side
      s.totalPayable += amount;
    });

    // 4. Deduct payments made to suppliers
    payments.filter(p => p.partyType === 'supplier').forEach(pmt => {
      const name = (pmt.partyName || '').trim();
      const phone = (pmt.partyPhone || '').trim();
      const partyId = pmt.partyId || '';

      let sup = null;
      for (const s of map.values()) {
        if ((partyId && s.id && s.id === partyId) ||
            (phone && s.phone && s.phone === phone) ||
            (name && s.name.toLowerCase().trim() === name.toLowerCase().trim())) {
          sup = s;
          break;
        }
      }

      if (sup) {
        sup.totalPayable -= (Number(pmt.amount) || 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [parties, suppliers, purchases, payments]);

  const [selectedSupplierKey, setSelectedSupplierKey] = useState('');
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);

  const handleSupplierSelect = (key) => {
    setSelectedSupplierKey(key);
    if (!key) {
      setSupplierName('');
      setSupplierPhone('');
      setBankName('');
      setAccountTitle('');
      setAccountNo('');
      setIban('');
      setIsEditingSupplier(false);
      return;
    }
    if (key === '__new__') {
      setSupplierName('');
      setSupplierPhone('');
      setBankName('');
      setAccountTitle('');
      setAccountNo('');
      setIban('');
      setIsEditingSupplier(true);
      setShowBankForm(true);
      return;
    }
    const found = supplierPartiesList.find(s => s.key === key);
    if (found) {
      setSupplierName(found.name);
      setSupplierPhone(found.phone || '');
      const b = found.bank || {};
      setBankName(b.bankName || '');
      setAccountTitle(b.accountTitle || found.name || '');
      setAccountNo(b.accountNo || '');
      setIban(b.iban || '');
      setIsEditingSupplier(false);
      setShowBankForm(Boolean(b.bankName));
    }
  };

  const activeSelectedSupplier = useMemo(() => {
    if (!selectedSupplierKey || selectedSupplierKey === '__new__') return null;
    return supplierPartiesList.find(s => s.key === selectedSupplierKey) || null;
  }, [selectedSupplierKey, supplierPartiesList]);

  const ourBankOptions = useMemo(() => {
    if (banks && banks.length > 0) {
      return banks.map(b => b.bankName);
    }
    return ['Meezan Bank', 'Dubai Islamic Bank', 'United Bank Limited'];
  }, [banks]);

  // Payment record
  const [paidFromBank, setPaidFromBank] = useState(() => ourBankOptions[0] || 'Meezan Bank');
  const [paymentStatus, setPaymentStatus] = useState('Pending'); // Default Pending (Payable)
  const [txRef, setTxRef] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Purchase items
  const [rows, setRows] = useState([
    { id: '1', name: '', qty: 1, price: '', total: 0 },
    { id: '2', name: '', qty: 1, price: '', total: 0 }
  ]);

  const handleRowChange = (id, field, value) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };

        // If selecting chocolate name, check if matches catalog item
        if (field === 'name') {
          const matchedItem = items.find(it => it.name.toLowerCase() === value.trim().toLowerCase());
          if (matchedItem && (!updated.price || Number(updated.price) === 0)) {
            updated.price = matchedItem.purchasePrice;
          }
        }

        const qtyNum = Number(updated.qty) || 0;
        const priceNum = Number(updated.price) || 0;
        updated.total = qtyNum * priceNum;
        return updated;
      })
    );
  };

  const addRow = () => {
    const newId = String(Date.now());
    setRows(prev => [...prev, { id: newId, name: '', qty: 1, price: '', total: 0 }]);
  };

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

  const removeRow = (id) => {
    if (rows.length === 1) {
      setRows([{ id: String(Date.now()), name: '', qty: 1, price: '', total: 0 }]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Pick existing supplier to auto-fill bank
  const handleSelectSupplier = (sup) => {
    setSupplierName(sup.name);
    setSupplierPhone(sup.phone || '');
    if (sup.bankName) {
      setBankName(sup.bankName);
      setAccountTitle(sup.accountTitle || '');
      setAccountNo(sup.accountNo || '');
      setIban(sup.iban || '');
      setShowBankForm(true);
    }
  };

  const handleReset = () => {
    setRows([
      { id: '1', name: '', qty: 1, price: '', total: 0 },
      { id: '2', name: '', qty: 1, price: '', total: 0 }
    ]);
    setSelectedSupplierKey('');
    setIsEditingSupplier(false);
    setSupplierName('');
    setSupplierPhone('');
    setBankName('');
    setAccountTitle('');
    setAccountNo('');
    setIban('');
    setShowBankForm(false);
    setDiscount(0);
    setPaymentStatus('Pending');
    setTxRef('');
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

  // Submit and save purchase
  const handleGeneratePurchase = (e) => {
    e.preventDefault();

    const validItems = rows
      .filter(r => r.name.trim() !== '' && (Number(r.price) > 0))
      .map((r, i) => ({
        id: `p_item_${i + 1}`,
        name: r.name.trim(),
        qty: Number(r.qty) || 1,
        price: Number(r.price) || 0,
        total: (Number(r.qty) || 1) * (Number(r.price) || 0)
      }));

    if (!supplierName.trim()) {
      showAppAlert({
        title: 'Supplier Name Required',
        message: 'Please select a Supplier from the dropdown or enter a supplier name.',
        type: 'warning'
      });
      return;
    }

    if (validItems.length === 0) {
      showAppAlert({
        title: 'Missing Stock Items',
        message: 'Please enter at least one item and purchase cost.',
        type: 'warning'
      });
      return;
    }

    const purchaseId = `PUR-${Math.floor(2000 + Math.random() * 8000)}`;

    const newPurchase = {
      id: purchaseId,
      date: new Date().toISOString(),
      partyId: activeSelectedSupplier?.partyId || activeSelectedSupplier?.id || undefined,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim(),
      supplierBank: {
        bankName: bankName.trim(),
        accountTitle: accountTitle.trim() || supplierName.trim(),
        accountNo: accountNo.trim(),
        iban: iban.trim()
      },
      paidFromBank,
      items: validItems,
      subtotal,
      discount: Number(discount) || 0,
      netTotal,
      status: paymentStatus,
      txRef: txRef.trim(),
      notes: notes.trim()
    };

    // Save supplier if new bank details provided
    if (bankName.trim() && onSaveSupplier) {
      onSaveSupplier({
        id: `sup_${Date.now()}`,
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        bankName: bankName.trim(),
        accountTitle: accountTitle.trim() || supplierName.trim(),
        accountNo: accountNo.trim(),
        iban: iban.trim()
      });
    }

    // Confetti effect
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#34d399', '#059669', '#d4a359']
      });
    } catch (err) {}

    onPurchaseCreated(newPurchase);
    handleReset();
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '14px 14px 40px 14px' }}>
      
      <form onSubmit={handleGeneratePurchase}>
        
        {/* Supplier Details Card */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '14px', borderTop: '3px solid #10b981' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} color="#34d399" />
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#34d399', margin: 0 }}>
                Supplier & Vendor Information
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              {supplierPartiesList.length} Suppliers in Khata
            </span>
          </div>

          {/* Supplier Party Select Dropdown */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#34d399', display: 'block', marginBottom: '5px' }}>
              Select Supplier Party (Dropdown) *
            </label>
            <select
              value={selectedSupplierKey}
              onChange={(e) => handleSupplierSelect(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                background: 'rgba(14, 25, 18, 0.95)',
                color: 'var(--text-main)',
                borderColor: selectedSupplierKey ? '#10b981' : 'var(--border-subtle)',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
            >
              <option value="">-- Choose Supplier Party from Directory --</option>
              <option value="__new__">➕ Enter New Supplier / Importer</option>
              {supplierPartiesList.length > 0 && (
                <optgroup label="Registered Supplier Parties & Vendors">
                  {supplierPartiesList.map(s => (
                    <option key={s.key} value={s.key}>
                      {s.name} {s.phone ? `(${s.phone})` : ''} • {s.totalPayable > 0 ? `Payable: Rs. ${s.totalPayable.toLocaleString()}` : (s.totalPayable < 0 ? `Advance: Rs. ${Math.abs(s.totalPayable).toLocaleString()}` : 'Settled ✓')}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Active Selected Supplier Card */}
          {activeSelectedSupplier && (
            <div style={{
              background: 'rgba(10, 20, 14, 0.9)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#34d399' }}>
                    {activeSelectedSupplier.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                    Linked Supplier ✓
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingSupplier(!isEditingSupplier)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#34d399',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'underline'
                  }}
                >
                  <Edit2 size={11} />
                  <span>{isEditingSupplier ? 'Hide Edit' : 'Edit Details'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {supplierPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={11} color="#34d399" />
                    <span>{supplierPhone}</span>
                  </div>
                )}
                {bankName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CreditCard size={11} color="#34d399" />
                    <span>{bankName} {accountNo ? `(${accountNo})` : ''}</span>
                  </div>
                )}
              </div>

              {/* Khata Payable Indicator */}
              <div style={{
                marginTop: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                background: activeSelectedSupplier.totalPayable > 0 ? 'rgba(239, 68, 68, 0.12)' : (activeSelectedSupplier.totalPayable < 0 ? 'rgba(96, 165, 250, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                color: activeSelectedSupplier.totalPayable > 0 ? '#f87171' : (activeSelectedSupplier.totalPayable < 0 ? '#93c5fd' : '#34d399'),
                border: `1px solid ${activeSelectedSupplier.totalPayable > 0 ? 'rgba(239, 68, 68, 0.3)' : (activeSelectedSupplier.totalPayable < 0 ? 'rgba(96, 165, 250, 0.3)' : 'rgba(16, 185, 129, 0.3)')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>
                  {activeSelectedSupplier.totalPayable > 0 
                    ? `⚠️ You Owe Supplier: Rs. ${activeSelectedSupplier.totalPayable.toLocaleString()} (Payable)` 
                    : (activeSelectedSupplier.totalPayable < 0 
                        ? `💳 Advance Paid to Supplier: Rs. ${Math.abs(activeSelectedSupplier.totalPayable).toLocaleString()}` 
                        : `✓ Supplier Khata Cleared (Rs. 0)`)}
                </span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>Supplier Ledger Active</span>
              </div>
            </div>
          )}

          {/* New Supplier / Editable Details Fields */}
          {(selectedSupplierKey === '__new__' || isEditingSupplier || !selectedSupplierKey) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Supplier / Importer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dubai Confectionery Wholesale"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '13px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>WhatsApp / Phone</label>
                <input
                  type="text"
                  placeholder="03xxxxxxxxx"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* Supplier Bank Account Accordion / Box */}
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border-subtle)' }}>
            <div 
              onClick={() => setShowBankForm(!showBankForm)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={14} />
                {showBankForm ? 'Supplier Bank Account (Saved)' : '+ Add Supplier Bank Account'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {showBankForm ? 'Hide' : 'Add Bank Info'}
              </span>
            </div>

            {showBankForm && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HBL / Meezan / Alfalah"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="form-input"
                      style={{ padding: '7px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Account Title</label>
                    <input
                      type="text"
                      placeholder="Beneficiary Title"
                      value={accountTitle}
                      onChange={(e) => setAccountTitle(e.target.value)}
                      className="form-input"
                      style={{ padding: '7px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>Account No.</label>
                    <input
                      type="text"
                      placeholder="Account number"
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      className="form-input"
                      style={{ padding: '7px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>IBAN (24 digits)</label>
                    <input
                      type="text"
                      placeholder="PK..."
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      className="form-input"
                      style={{ padding: '7px 10px', fontSize: '12.5px', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* PURCHASE STOCK ITEMS LIST */}
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '14px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                Purchased Stock Chocolates
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Enter cartons, boxes, or chocolate items with purchase cost
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px' }}
              title="Clear purchase form"
            >
              <RefreshCw size={12} />
              <span>Clear</span>
            </button>
          </div>

          {/* Item Cards */}
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
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      background: '#10b981', 
                      color: '#06261c', 
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
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#34d399' }}>
                      Stock Item
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
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>

                {/* Chocolate Name Input */}
                <div>
                  <input
                    type="text"
                    list="purchase-items-datalist"
                    placeholder="e.g. Ferrero Rocher T24 (Carton of 12 boxes)..."
                    value={row.name}
                    onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                    autoComplete="off"
                  />
                  {(() => {
                    const matchedItem = items.find(it => it.name.toLowerCase() === (row.name || '').trim().toLowerCase());
                    if (!matchedItem) return null;
                    return (
                      <div style={{ fontSize: '10.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          color: '#34d399', 
                          fontWeight: '700',
                          background: 'rgba(16, 185, 129, 0.15)',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          Current Stock: {matchedItem.stock} {matchedItem.unit || 'Units'}
                        </span>
                        <span style={{ color: 'var(--text-dim)' }}>
                          • Base Purchase Cost: Rs. {matchedItem.purchasePrice.toLocaleString()}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Sub-row: Qty, Unit Cost, Row Total */}
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
                      Cost Price (Rs.)
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
                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#34d399' }}>
                      {row.total ? `Rs. ${row.total.toLocaleString()}` : 'Rs. 0'}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Datalist for Inventory Catalog Auto-Complete */}
          <datalist id="purchase-items-datalist">
            {items.map(it => (
              <option 
                key={it.id} 
                value={it.name}
              >
                {`Purchase Cost: Rs. ${it.purchasePrice} (Current: ${it.stock} ${it.unit || 'units'})`}
              </option>
            ))}
          </datalist>

          {/* Add Item Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={addRow}
              className="btn-gold"
              style={{ flex: 1, padding: '10px 14px', fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #047857)', color: '#ffffff' }}
            >
              <Plus size={15} />
              <span>Add Stock Item</span>
            </button>

            <button
              type="button"
              onClick={() => addMultipleRows(3)}
              className="btn-secondary"
              style={{ padding: '10px 16px', fontSize: '12.5px' }}
            >
              <span>+ 3 Items</span>
            </button>
          </div>

        </div>

        {/* PAYMENT RECORD & SETTLEMENT */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '18px' }}>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
              Paid From Our Bank Account
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(ourBankOptions.length, 3)}, 1fr)`, gap: '6px' }}>
              {ourBankOptions.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setPaidFromBank(b)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: paidFromBank === b ? '1.5px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                    background: paidFromBank === b ? 'rgba(212,163,89,0.2)' : 'rgba(255,255,255,0.04)',
                    color: paidFromBank === b ? 'var(--gold-light)' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: paidFromBank === b ? '700' : '500',
                    cursor: 'pointer'
                  }}
                >
                  {b.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Status (Default: Payable / Pending) */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
              Supplier Payment Status
            </label>
            <div style={{ display: 'flex', gap: '8px', height: '38px' }}>
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
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={14} />
                <span>Payable (Unpaid)</span>
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
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle size={14} />
                <span>Paid (Settled)</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Discount / Freight (Rs.)</label>
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
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Bank Tx Ref / Cheque #</label>
              <input
                type="text"
                placeholder="e.g. MEZN-TX-4921 / Cheque 00481"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                className="form-input"
                style={{ padding: '9px 12px', fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* Subtotal & Net Payable */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              <span>Subtotal ({validItemsCount} items):</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {Number(discount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#f87171' }}>
                <span>Discount / Adjustment:</span>
                <span>- Rs. {Number(discount).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Total Purchase Cost:</span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#34d399' }}>
                Rs. {netTotal.toLocaleString()}
              </span>
            </div>
          </div>

        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={validItemsCount === 0}
          className="btn-gold"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '15px',
            opacity: validItemsCount === 0 ? 0.5 : 1,
            cursor: validItemsCount === 0 ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff'
          }}
        >
          <Sparkles size={18} />
          <span>Generate HD Purchase Voucher</span>
        </button>

      </form>

    </div>
  );
}
