import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  User, 
  Phone, 
  Share2, 
  Building2, 
  ChevronRight, 
  Eye, 
  Building, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  X,
  DollarSign,
  AlertTriangle,
  BookOpen,
  FileText,
  Receipt,
  Download,
  Upload
} from 'lucide-react';
import { BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';
import CustomerLedgerModal from './CustomerLedgerModal';
import SupplierLedgerModal from './SupplierLedgerModal';
import { showAppAlert, showAppConfirm } from '../utils/dialog';
import { normalizePhone, matchesParty, computeCustomerTotals, computeSupplierTotals } from '../utils/partyMatcher';
import { exportAllDataJSON, importAllDataJSON } from '../utils/storage';

export default function CustomerLedger({ 
  bills, 
  purchases = [], 
  banks,
  parties = [],
  payments = [],
  onPaymentCreated,
  onDeletePayment,
  onResetPartyBalance,
  onUpdateBillStatus, 
  onUpdatePurchaseStatus, 
  onViewBill, 
  onViewPurchase,
  onBillCreated,
  onPurchaseCreated,
  onSaveParty,
  onUpdateParty,
  onDeleteParty,
  onDataReloaded
}) {
  const [ledgerType, setLedgerType] = useState('customers'); // 'customers' or 'suppliers'
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // 'All', 'Unpaid', 'Settled'
  const [selectedClientModal, setSelectedClientModal] = useState(null);
  const [selectedSupplierModal, setSelectedSupplierModal] = useState(null);

  const backupInputRef = useRef(null);

  const handleBackupFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      showAppConfirm({
        title: 'Restore Data Backup?',
        message: 'Restoring a backup will merge and update your bills, purchases, khata parties, and payments from the backup file.\n\nDo you want to proceed?',
        confirmText: 'Yes, Restore',
        confirmStyle: 'primary',
        onConfirm: () => {
          importAllDataJSON(
            file,
            () => {
              showAppAlert({
                title: 'Data Restored Successfully! 📦',
                message: 'All your bills, items, and khata records have been restored cleanly.',
                type: 'success'
              });
              onDataReloaded?.();
            },
            (err) => {
              showAppAlert({
                title: 'Restore Failed',
                message: String(err),
                type: 'error'
              });
            }
          );
        }
      });
      e.target.value = '';
    }
  };

  // Add Party Modal State
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [newPartyType, setNewPartyType] = useState('customer'); // 'customer' or 'supplier'
  const [newPartyOpeningBal, setNewPartyOpeningBal] = useState('');
  const [newPartyOpeningType, setNewPartyOpeningType] = useState('debit'); // 'debit' or 'credit'
  const [newPartyBankName, setNewPartyBankName] = useState('');
  const [newPartyAccountTitle, setNewPartyAccountTitle] = useState('');
  const [newPartyAccountNo, setNewPartyAccountNo] = useState('');
  const [newPartyIban, setNewPartyIban] = useState('');

  // Group bills by customer (Merging persistent parties + dynamic bills with robust deduplication)
  const customerLedgers = useMemo(() => {
    const list = [];

    // 1. Seed with registered customer parties
    parties.filter(p => p.type !== 'supplier').forEach(party => {
      const opening = Number(party.openingBalance) || 0;
      const openingType = party.openingBalanceType || 'debit';

      list.push({
        partyId: party.id,
        id: party.id,
        name: party.name,
        phone: party.phone || '',
        address: party.address || '',
        openingBalance: opening,
        openingBalanceType: openingType,
        bills: [],
        payments: []
      });
    });

    // 2. Aggregate bills into matching party or create new if not found
    bills.forEach(bill => {
      let client = list.find(c => matchesParty(bill, c));

      if (!client) {
        client = {
          partyId: bill.partyId || `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          id: bill.partyId || '',
          name: (bill.customerName || 'Walk-in Customer').trim(),
          phone: (bill.customerPhone || '').trim(),
          address: (bill.deliveryAddress || '').trim(),
          openingBalance: 0,
          openingBalanceType: 'debit',
          bills: [],
          payments: []
        };
        list.push(client);
      }

      client.bills.push(bill);
      if (!client.phone && bill.customerPhone) {
        client.phone = bill.customerPhone.trim();
      }
      if (!client.address && bill.deliveryAddress) {
        client.address = bill.deliveryAddress.trim();
      }
    });

    // 3. Aggregate payments received from customers
    payments.filter(p => p.partyType !== 'supplier').forEach(pmt => {
      let client = list.find(c => matchesParty(pmt, c));

      if (!client) {
        client = {
          partyId: pmt.partyId || `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          id: pmt.partyId || '',
          name: (pmt.partyName || 'Customer').trim(),
          phone: (pmt.partyPhone || '').trim(),
          address: '',
          openingBalance: 0,
          openingBalanceType: 'debit',
          bills: [],
          payments: []
        };
        list.push(client);
      }

      client.payments.push(pmt);
      if (!client.phone && pmt.partyPhone) {
        client.phone = pmt.partyPhone.trim();
      }
    });

    // 4. Compute pure double-entry totals for every customer
    return list.map(c => {
      const totals = computeCustomerTotals(c);
      return {
        ...c,
        ...totals,
        key: c.partyId || c.id || (c.phone || c.name).toLowerCase().trim()
      };
    });
  }, [parties, bills, payments]);

  // Group purchases by supplier (Merging persistent parties + purchases + payments with robust deduplication)
  const supplierLedgers = useMemo(() => {
    const list = [];

    // 1. Seed with registered supplier parties
    parties.filter(p => p.type !== 'customer').forEach(party => {
      const opening = Number(party.openingBalance) || 0;
      const openingType = party.openingBalanceType || 'credit';

      list.push({
        partyId: party.id,
        id: party.id,
        name: party.name,
        phone: party.phone || '',
        bank: party.bank || {},
        openingBalance: opening,
        openingBalanceType: openingType,
        purchases: [],
        payments: []
      });
    });

    // 2. Aggregate purchases
    purchases.forEach(pur => {
      let sup = list.find(s => matchesParty(pur, s));

      if (!sup) {
        sup = {
          partyId: pur.supplierId || pur.partyId || `sup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          id: pur.supplierId || pur.partyId || '',
          name: (pur.supplierName || 'Unknown Supplier').trim(),
          phone: (pur.supplierPhone || '').trim(),
          bank: pur.supplierBank || {},
          openingBalance: 0,
          openingBalanceType: 'credit',
          purchases: [],
          payments: []
        };
        list.push(sup);
      }

      sup.purchases.push(pur);
      if (!sup.phone && pur.supplierPhone) {
        sup.phone = pur.supplierPhone.trim();
      }
      if (!sup.bank?.bankName && pur.supplierBank?.bankName) {
        sup.bank = pur.supplierBank;
      }
    });

    // 3. Aggregate payments paid to suppliers
    payments.filter(p => p.partyType === 'supplier').forEach(pmt => {
      let sup = list.find(s => matchesParty(pmt, s));

      if (!sup) {
        sup = {
          partyId: pmt.partyId || `sup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          id: pmt.partyId || '',
          name: (pmt.partyName || 'Supplier').trim(),
          phone: (pmt.partyPhone || '').trim(),
          bank: {},
          openingBalance: 0,
          openingBalanceType: 'credit',
          purchases: [],
          payments: []
        };
        list.push(sup);
      }

      sup.payments.push(pmt);
      if (!sup.phone && pmt.partyPhone) {
        sup.phone = pmt.partyPhone.trim();
      }
    });

    // 4. Compute pure double-entry totals for every supplier
    return list.map(s => {
      const totals = computeSupplierTotals(s);
      return {
        ...s,
        ...totals,
        key: s.partyId || s.id || (s.phone || s.name).toLowerCase().trim()
      };
    });
  }, [parties, purchases, payments]);

  // Financial Grand Totals factoring previous balances
  const grandTotals = useMemo(() => {
    let salesDue = 0;
    let customerAdvances = 0;
    let totalSales = 0;
    let salesReceived = 0;

    customerLedgers.forEach(c => {
      totalSales += c.totalBilled;
      salesReceived += c.totalPaid;
      if (c.totalDue > 0) {
        salesDue += c.totalDue;
      } else if (c.totalDue < 0) {
        customerAdvances += Math.abs(c.totalDue);
      }
    });

    let purchasesPayable = 0;
    let supplierAdvances = 0;
    let totalPurchases = 0;
    let purchasesPaid = 0;

    supplierLedgers.forEach(s => {
      totalPurchases += s.totalPurchased;
      purchasesPaid += s.totalPaid;
      if (s.totalPayable > 0) {
        purchasesPayable += s.totalPayable;
      } else if (s.totalPayable < 0) {
        supplierAdvances += Math.abs(s.totalPayable);
      }
    });

    return { 
      totalSales, 
      salesReceived, 
      salesDue, 
      customerAdvances, 
      totalPurchases, 
      purchasesPaid, 
      purchasesPayable,
      supplierAdvances 
    };
  }, [customerLedgers, supplierLedgers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customerLedgers.filter(c => {
      const q = search.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(q) || c.phone.includes(q);
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Unpaid' && c.totalDue !== 0) ||
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
        (filter === 'Unpaid' && s.totalPayable !== 0) ||
        (filter === 'Settled' && s.totalPayable === 0);

      return matchesSearch && matchesFilter;
    });
  }, [supplierLedgers, search, filter]);

  // Chronological unified Daybook Ledger (All Transactions: Bills, Purchases & Payments)
  const masterLedgerRows = useMemo(() => {
    const list = [];

    // Add customer opening balances & sales
    customerLedgers.forEach(c => {
      if (c.openingBalance > 0) {
        list.push({
          id: `op_cust_${c.key}`,
          date: 'Opening',
          rawDate: new Date(0),
          party: c.name,
          partyType: 'Customer',
          clientRef: c,
          particulars: `Previous Balance (${c.openingBalanceType})`,
          ref: 'OPENING',
          debit: c.openingBalanceType === 'debit' ? c.openingBalance : 0,
          credit: c.openingBalanceType === 'credit' ? c.openingBalance : 0,
          status: 'Carried',
          category: 'Opening'
        });
      }

      (c.bills || []).forEach(b => {
        const net = Number(b.netTotal) || 0;
        list.push({
          id: `bill_${b.id}`,
          date: new Date(b.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: '2-digit' }),
          rawDate: new Date(b.date),
          party: c.name,
          partyType: 'Customer',
          clientRef: c,
          billRef: b,
          particulars: b.items?.map(i => `${i.qty}x ${i.name}`).join(', ') || 'Chocolate Order',
          ref: `#${b.id}`,
          debit: net,
          credit: 0, // A sale bill is always a Debit
          status: b.status,
          category: 'Sale'
        });
      });
    });

    // Add supplier opening balances & purchases
    supplierLedgers.forEach(s => {
      if (s.openingBalance > 0) {
        list.push({
          id: `op_sup_${s.key}`,
          date: 'Opening',
          rawDate: new Date(0),
          party: s.name,
          partyType: 'Supplier',
          supplierRef: s,
          particulars: `Previous Balance (${s.openingBalanceType})`,
          ref: 'OPENING',
          debit: s.openingBalanceType === 'debit' ? s.openingBalance : 0,
          credit: s.openingBalanceType === 'credit' ? s.openingBalance : 0,
          status: 'Carried',
          category: 'Opening'
        });
      }

      (s.purchases || []).forEach(p => {
        const net = Number(p.netTotal) || 0;
        list.push({
          id: `pur_${p.id}`,
          date: new Date(p.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: '2-digit' }),
          rawDate: new Date(p.date),
          party: s.name,
          partyType: 'Supplier',
          supplierRef: s,
          purchaseRef: p,
          particulars: p.items?.map(i => `${i.qty}x ${i.name}`).join(', ') || 'Stock Raw Materials',
          ref: `#${p.id}`,
          debit: 0, // A purchase is always a Credit
          credit: net,
          status: p.status,
          category: 'Purchase'
        });
      });
    });

    // Add customer & supplier payment vouchers
    payments.forEach(pmt => {
      const isCustomer = pmt.partyType !== 'supplier';
      const amt = Number(pmt.amount) || 0;
      const matchedClient = isCustomer ? customerLedgers.find(c => c.name.toLowerCase().trim() === (pmt.partyName || '').toLowerCase().trim()) : null;
      const matchedSupplier = !isCustomer ? supplierLedgers.find(s => s.name.toLowerCase().trim() === (pmt.partyName || '').toLowerCase().trim()) : null;

      const isSend = pmt.paymentType === 'send';

      list.push({
        id: `pmt_${pmt.id}`,
        date: new Date(pmt.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: '2-digit' }),
        rawDate: new Date(pmt.date),
        party: pmt.partyName || (isCustomer ? 'Customer' : 'Supplier'),
        partyType: isCustomer ? 'Customer' : 'Supplier',
        clientRef: matchedClient,
        supplierRef: matchedSupplier,
        paymentRef: pmt,
        particulars: isCustomer
          ? (isSend
              ? `Amount Sent / Refund (${pmt.paymentMethod || 'Cash'})${pmt.notes ? ` — ${pmt.notes}` : ''}`
              : `Payment Received (${pmt.paymentMethod || 'Cash'})${pmt.notes ? ` — ${pmt.notes}` : ''}`)
          : (pmt.paymentType === 'receive'
              ? `Refund Received from Supplier (${pmt.paymentMethod || 'Cash'})${pmt.notes ? ` — ${pmt.notes}` : ''}`
              : `Payment Made (${pmt.paymentMethod || 'Bank'})${pmt.notes ? ` — ${pmt.notes}` : ''}`),
        ref: `#${pmt.id}`,
        debit: isCustomer ? (isSend ? amt : 0) : (pmt.paymentType === 'receive' ? 0 : amt),
        credit: isCustomer ? (isSend ? 0 : amt) : (pmt.paymentType === 'receive' ? amt : 0),
        status: 'Paid',
        category: isCustomer ? (isSend ? 'Payment' : 'Receipt') : (pmt.paymentType === 'receive' ? 'Receipt' : 'Payment')
      });
    });

    return list.sort((a, b) => b.rawDate - a.rawDate);
  }, [customerLedgers, supplierLedgers, payments]);

  // Filtered master ledger
  const filteredMasterLedger = useMemo(() => {
    return masterLedgerRows.filter(r => {
      const q = search.toLowerCase();
      const matchesSearch = r.party.toLowerCase().includes(q) || 
                            r.particulars.toLowerCase().includes(q) || 
                            r.ref.toLowerCase().includes(q);
      const matchesFilter = 
        filter === 'All' ||
        (filter === 'Unpaid' && (r.status === 'Pending' || r.status === 'Unpaid')) ||
        (filter === 'Settled' && (r.status === 'Paid' || r.status === 'Received')) ||
        (filter === 'Sales' && r.category === 'Sale') ||
        (filter === 'Purchases' && r.category === 'Purchase') ||
        (filter === 'Payments' && (r.category === 'Receipt' || r.category === 'Payment'));

      return matchesSearch && matchesFilter;
    });
  }, [masterLedgerRows, search, filter]);

  const activeModalClient = useMemo(() => {
    if (!selectedClientModal) return null;
    return customerLedgers.find(c => 
      (selectedClientModal.partyId && c.partyId === selectedClientModal.partyId) ||
      (selectedClientModal.id && c.id === selectedClientModal.id) ||
      c.key === selectedClientModal.key ||
      c.name.toLowerCase().trim() === selectedClientModal.name.toLowerCase().trim()
    ) || selectedClientModal;
  }, [customerLedgers, selectedClientModal]);

  const activeModalSupplier = useMemo(() => {
    if (!selectedSupplierModal) return null;
    return supplierLedgers.find(s => 
      (selectedSupplierModal.partyId && s.partyId === selectedSupplierModal.partyId) ||
      (selectedSupplierModal.id && s.id === selectedSupplierModal.id) ||
      s.key === selectedSupplierModal.key ||
      s.name.toLowerCase().trim() === selectedSupplierModal.name.toLowerCase().trim()
    ) || selectedSupplierModal;
  }, [supplierLedgers, selectedSupplierModal]);

  // Save new party
  const handleSaveNewParty = (e) => {
    e.preventDefault();
    if (!newPartyName.trim()) {
      showAppAlert({
        title: 'Party Name Required',
        message: 'Please enter a party name to save.',
        type: 'warning'
      });
      return;
    }

    const openingBalNum = Number(newPartyOpeningBal) || 0;
    const newParty = {
      id: `pty_${Date.now()}`,
      name: newPartyName.trim(),
      phone: newPartyPhone.trim(),
      address: newPartyAddress.trim(),
      type: newPartyType,
      openingBalance: openingBalNum,
      openingBalanceType: newPartyOpeningType,
      bank: newPartyType === 'supplier' ? {
        bankName: newPartyBankName.trim(),
        accountTitle: newPartyAccountTitle.trim(),
        accountNo: newPartyAccountNo.trim(),
        iban: newPartyIban.trim()
      } : undefined,
      createdAt: new Date().toISOString()
    };

    onSaveParty?.(newParty);

    // Reset
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyAddress('');
    setNewPartyOpeningBal('');
    setNewPartyBankName('');
    setNewPartyAccountTitle('');
    setNewPartyAccountNo('');
    setNewPartyIban('');
    setIsAddPartyOpen(false);
  };

  // Safe delete check: Only allow when balance is Rs. 0
  const handleDeletePartyCheck = (party, e) => {
    e?.stopPropagation();
    const balance = ledgerType === 'customers' ? party.totalDue : party.totalPayable;

    if (balance !== 0) {
      showAppAlert({
        title: 'Cannot Delete Party',
        type: 'warning',
        buttonText: 'Understood',
        message: `Party "${party.name}" has an active balance of Rs. ${Math.abs(balance).toLocaleString()} (${balance > 0 ? (ledgerType === 'customers' ? "You'll Get / Unpaid" : "You'll Give / Payable") : "Advance Credit"}).\n\nAs requested, a party can ONLY be deleted when their account balance is completely cleared (Rs. 0). Please settle their balance first.`
      });
      return;
    }

    showAppConfirm({
      title: 'Delete Cleared Party?',
      message: `Are you sure you want to delete "${party.name}"?\nAccount balance is fully cleared (Rs. 0).`,
      confirmText: 'Delete Party',
      confirmStyle: 'danger',
      onConfirm: () => {
        onDeleteParty?.(party);
        if (selectedClientModal?.key === party.key) setSelectedClientModal(null);
        if (selectedSupplierModal?.key === party.key) setSelectedSupplierModal(null);
      }
    });
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '14px 14px 80px 14px' }}>
      
      {/* Top Banner: Title & Add Party Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--gold-light)' }}>
            Parties & Udhar Khata
          </h1>
          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Manage customer receivables, supplier payables, and opening balances
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={exportAllDataJSON}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--gold-light)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Download JSON backup of all Khata records, bills, and items"
          >
            <Download size={13} color="var(--gold-primary)" />
            <span>Backup</span>
          </button>

          <button
            type="button"
            onClick={() => backupInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Restore Khata records and bills from JSON backup"
          >
            <Upload size={13} />
            <span>Restore</span>
          </button>

          <input
            type="file"
            ref={backupInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleBackupFileChange}
          />

          <button
            type="button"
            onClick={() => {
              setNewPartyType(ledgerType === 'customers' ? 'customer' : 'supplier');
              setNewPartyOpeningType(ledgerType === 'customers' ? 'debit' : 'credit');
              setIsAddPartyOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #e2b265, #ba8339)',
              color: '#120904',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>+ Add Party</span>
          </button>
        </div>
      </div>

      {/* LEDGER TYPE SWITCHER (Customers vs Suppliers vs Master Daybook) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => { setLedgerType('customers'); setFilter('All'); }}
          style={{
            padding: '10px 4px',
            borderRadius: '12px',
            border: ledgerType === 'customers' ? '2px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
            background: ledgerType === 'customers' ? 'rgba(212, 163, 89, 0.22)' : 'rgba(24, 13, 8, 0.7)',
            color: ledgerType === 'customers' ? 'var(--gold-light)' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <User size={14} />
          <span>Customers</span>
        </button>

        <button
          type="button"
          onClick={() => { setLedgerType('suppliers'); setFilter('All'); }}
          style={{
            padding: '10px 4px',
            borderRadius: '12px',
            border: ledgerType === 'suppliers' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
            background: ledgerType === 'suppliers' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(24, 13, 8, 0.7)',
            color: ledgerType === 'suppliers' ? '#34d399' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <Building size={14} />
          <span>Suppliers</span>
        </button>

        <button
          type="button"
          onClick={() => { setLedgerType('master'); setFilter('All'); }}
          style={{
            padding: '10px 4px',
            borderRadius: '12px',
            border: ledgerType === 'master' ? '2px solid #60a5fa' : '1px solid var(--border-subtle)',
            background: ledgerType === 'master' ? 'rgba(96, 165, 250, 0.22)' : 'rgba(24, 13, 8, 0.7)',
            color: ledgerType === 'master' ? '#93c5fd' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
        >
          <BookOpen size={14} />
          <span>Daybook Ledger</span>
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
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Settled</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#34d399', marginTop: '3px' }}>
                Rs. {grandTotals.salesReceived.toLocaleString()}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid var(--status-pending)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>You'll Get (Due)</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#fbbf24', marginTop: '3px' }}>
                Rs. {grandTotals.salesDue.toLocaleString()}
              </div>
              {grandTotals.customerAdvances > 0 && (
                <div style={{ fontSize: '9.5px', color: '#60a5fa', marginTop: '2px' }}>
                  Adv: Rs. {grandTotals.customerAdvances.toLocaleString()}
                </div>
              )}
            </div>
          </>
        ) : ledgerType === 'suppliers' ? (
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

            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid #ef4444' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>You'll Give (Payable)</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#f87171', marginTop: '3px' }}>
                Rs. {grandTotals.purchasesPayable.toLocaleString()}
              </div>
              {grandTotals.supplierAdvances > 0 && (
                <div style={{ fontSize: '9.5px', color: '#34d399', marginTop: '2px' }}>
                  Adv: Rs. {grandTotals.supplierAdvances.toLocaleString()}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid var(--gold-primary)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Receivables</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#fbbf24', marginTop: '3px' }}>
                Rs. {grandTotals.salesDue.toLocaleString()}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid #ef4444' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Payables</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#f87171', marginTop: '3px' }}>
                Rs. {grandTotals.purchasesPayable.toLocaleString()}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderTop: '3px solid #60a5fa' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Net Khata</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#93c5fd', marginTop: '3px' }}>
                Rs. {(grandTotals.salesDue - grandTotals.purchasesPayable).toLocaleString()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search & Status Filter Bar */}
      <div className="glass-panel" style={{ padding: '10px 12px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder={
              ledgerType === 'customers' ? 'Search customer name or phone...' :
              (ledgerType === 'suppliers' ? 'Search supplier or bank...' : 'Search daybook by party, items, or ref #...')
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '12.5px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(ledgerType === 'master' ? ['All', 'Sales', 'Purchases', 'Unpaid', 'Settled'] : ['All', 'Unpaid', 'Settled']).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? (ledgerType === 'customers' ? 'var(--gold-primary)' : (ledgerType === 'suppliers' ? '#10b981' : '#3b82f6')) : 'rgba(255,255,255,0.05)',
                color: filter === f ? (ledgerType === 'master' ? '#ffffff' : '#120904') : 'var(--text-muted)',
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
            <div className="glass-card" style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <User size={32} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>No Customer Accounts Found</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "+ Add Party" above to create a customer khata with previous balance.</div>
            </div>
          ) : (
            filteredCustomers.map((client) => {
              const hasDue = client.totalDue !== 0;
              const isPositive = client.totalDue > 0;

              return (
                <div
                  key={client.key}
                  onClick={() => setSelectedClientModal(client)}
                  className="glass-card"
                  style={{
                    padding: '14px 16px',
                    borderLeft: `4px solid ${hasDue ? (isPositive ? '#f59e0b' : '#60a5fa') : '#10b981'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <User size={15} color="var(--gold-primary)" />
                      <span style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {client.name}
                      </span>
                      {client.openingBalance > 0 && (
                        <span style={{ fontSize: '10px', background: 'rgba(96, 165, 250, 0.15)', color: '#93c5fd', padding: '1px 6px', borderRadius: '6px', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
                          Prev: Rs. {client.openingBalance.toLocaleString()} ({client.openingBalanceType === 'debit' ? "Customer Owes" : "Customer Advance"})
                        </span>
                      )}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {hasDue ? (isPositive ? "You'll Get" : "Customer Advance") : 'Status'}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: hasDue ? (isPositive ? '#fbbf24' : '#60a5fa') : '#34d399', marginTop: '1px' }}>
                        {hasDue ? (isPositive ? `Rs. ${client.totalDue.toLocaleString()}` : `Rs. ${Math.abs(client.totalDue).toLocaleString()} (Adv)`) : 'Settled ✓'}
                      </div>
                    </div>

                    {/* Quick View Khata Ledger button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClientModal(client);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(212, 163, 89, 0.15)',
                        border: '1px solid rgba(212, 163, 89, 0.35)',
                        color: 'var(--gold-light)',
                        padding: '6px 9px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <BookOpen size={11} />
                      <span>Ledger</span>
                    </button>

                    {/* Safe Delete button right on card */}
                    <button
                      type="button"
                      onClick={(e) => handleDeletePartyCheck(client, e)}
                      title={client.totalDue === 0 ? "Delete customer (Account cleared)" : "Cannot delete: Outstanding balance active"}
                      style={{
                        background: client.totalDue === 0 ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                        border: client.totalDue === 0 ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                        color: client.totalDue === 0 ? '#f87171' : 'var(--text-dim)',
                        borderRadius: '8px',
                        padding: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>

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
            <div className="glass-card" style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <Building size={32} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>No Supplier Accounts Found</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "+ Add Party" above to add a supplier with bank details and previous balance.</div>
            </div>
          ) : (
            filteredSuppliers.map((sup) => {
              const hasPayable = sup.totalPayable !== 0;
              const isPositive = sup.totalPayable > 0;

              return (
                <div
                  key={sup.key}
                  onClick={() => setSelectedSupplierModal(sup)}
                  className="glass-card"
                  style={{
                    padding: '14px 16px',
                    borderLeft: `4px solid ${hasPayable ? (isPositive ? '#ef4444' : '#60a5fa') : '#10b981'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <Building size={15} color="#34d399" />
                      <span style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {sup.name}
                      </span>
                      {sup.openingBalance > 0 && (
                        <span style={{ fontSize: '10px', background: 'rgba(96, 165, 250, 0.15)', color: '#93c5fd', padding: '1px 6px', borderRadius: '6px', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
                          Prev: Rs. {sup.openingBalance.toLocaleString()} ({sup.openingBalanceType === 'credit' ? "Store Payable" : "Advance Paid"})
                        </span>
                      )}
                    </div>

                    {sup.phone && (
                      <div style={{ fontSize: '11px', color: 'var(--gold-light)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} />
                        <span>{sup.phone}</span>
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {sup.purchases?.length || 0} purchases • Total: Rs. {sup.totalPurchased.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {hasPayable ? (isPositive ? "You'll Give" : "Advance Paid") : 'Status'}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: hasPayable ? (isPositive ? '#f87171' : '#60a5fa') : '#34d399', marginTop: '1px' }}>
                        {hasPayable ? (isPositive ? `Rs. ${sup.totalPayable.toLocaleString()}` : `Rs. ${Math.abs(sup.totalPayable).toLocaleString()} (Adv)`) : 'Settled ✓'}
                      </div>
                    </div>

                    {/* Quick View Khata Ledger button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSupplierModal(sup);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        color: '#34d399',
                        padding: '6px 9px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <BookOpen size={11} />
                      <span>Ledger</span>
                    </button>

                    {/* Safe Delete button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeletePartyCheck(sup, e)}
                      title={sup.totalPayable === 0 ? "Delete supplier (Account cleared)" : "Cannot delete: Outstanding balance active"}
                      style={{
                        background: sup.totalPayable === 0 ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                        border: sup.totalPayable === 0 ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                        color: sup.totalPayable === 0 ? '#f87171' : 'var(--text-dim)',
                        borderRadius: '8px',
                        padding: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>

                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronRight size={16} color="#34d399" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. MASTER KHATA LEDGER / DAYBOOK VIEW */}
      {ledgerType === 'master' && (
        <div style={{
          background: 'rgba(18, 10, 6, 0.92)',
          border: '1px solid var(--gold-border)',
          borderRadius: '14px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <div style={{
            padding: '12px 14px',
            background: 'linear-gradient(135deg, rgba(38, 20, 12, 0.95), rgba(24, 13, 8, 0.98))',
            borderBottom: '1px solid var(--gold-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={17} color="var(--gold-primary)" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--gold-light)' }}>
                  All-Transactions Master Khata Ledger
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Chronological unified register of customer sales, supplier procurement, and payments
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--gold-light)', background: 'rgba(212, 163, 89, 0.15)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(212, 163, 89, 0.3)' }}>
              {filteredMasterLedger.length} entries
            </div>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '680px' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 16, 10, 0.95)', borderBottom: '1px solid var(--gold-border)' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--gold-light)', fontWeight: '700' }}>Date</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--gold-light)', fontWeight: '700' }}>Party</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--gold-light)', fontWeight: '700' }}>Particulars / Items</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gold-light)', fontWeight: '700' }}>Voucher / Ref</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', color: '#fbbf24', fontWeight: '700' }}>Billed / Out (Rs.)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399', fontWeight: '700' }}>Paid / In (Rs.)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-dim)', fontWeight: '700' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMasterLedger.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      No transactions recorded in the Daybook Ledger yet.
                    </td>
                  </tr>
                ) : (
                  filteredMasterLedger.map((row, idx) => (
                    <tr
                      key={row.id + idx}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <td style={{ padding: '8px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {row.date}
                      </td>

                      <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: row.partyType === 'Customer' ? 'rgba(212, 163, 89, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: row.partyType === 'Customer' ? 'var(--gold-light)' : '#34d399',
                            border: row.partyType === 'Customer' ? '1px solid rgba(212, 163, 89, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            {row.partyType}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (row.clientRef) setSelectedClientModal(row.clientRef);
                              if (row.supplierRef) setSelectedSupplierModal(row.supplierRef);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-main)',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                            title={`Open ${row.party}'s Khata Ledger`}
                          >
                            {row.party}
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: '8px', color: 'var(--text-main)', maxWidth: '200px' }}>
                        <div style={{ fontWeight: row.category === 'Opening' ? '700' : '400', color: row.category === 'Opening' ? '#93c5fd' : 'var(--text-main)' }}>
                          {row.particulars}
                        </div>
                      </td>

                      <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {row.billRef ? (
                          <button
                            type="button"
                            onClick={() => onViewBill(row.billRef)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', fontWeight: '700' }}
                          >
                            {row.ref}
                          </button>
                        ) : row.purchaseRef ? (
                          <button
                            type="button"
                            onClick={() => onViewPurchase(row.purchaseRef)}
                            style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', fontWeight: '700' }}
                          >
                            {row.ref}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>{row.ref}</span>
                        )}
                      </td>

                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: row.debit > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
                        {row.debit > 0 ? `Rs. ${row.debit.toLocaleString()}` : '-'}
                      </td>

                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: row.credit > 0 ? '#34d399' : 'var(--text-dim)' }}>
                        {row.credit > 0 ? `Rs. ${row.credit.toLocaleString()}` : '-'}
                      </td>

                      <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {row.status === 'Paid' ? (
                          <span style={{ fontSize: '10px', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            Paid ✓
                          </span>
                        ) : row.status === 'Carried' ? (
                          <span style={{ fontSize: '10px', color: '#60a5fa', background: 'rgba(96, 165, 250, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            Carried
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            Unpaid ⏳
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD PARTY MODAL */}
      {isAddPartyOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#190e09',
            border: '1px solid var(--gold-border)',
            borderRadius: '16px',
            padding: '20px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--gold-light)' }}>
                Add New Party (Customer / Supplier)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPartyOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewParty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Type Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setNewPartyType('customer');
                    setNewPartyOpeningType('debit');
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: newPartyType === 'customer' ? '2px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                    background: newPartyType === 'customer' ? 'rgba(226, 178, 101, 0.2)' : 'transparent',
                    color: newPartyType === 'customer' ? 'var(--gold-light)' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Customer (Khata)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewPartyType('supplier');
                    setNewPartyOpeningType('credit');
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: newPartyType === 'supplier' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                    background: newPartyType === 'supplier' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: newPartyType === 'supplier' ? '#34d399' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Supplier (Vendor)
                </button>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Party / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={newPartyType === 'customer' ? 'e.g. Kamran Shah' : 'e.g. Al-Madina Importers'}
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Phone / WhatsApp Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 03001234567"
                  value={newPartyPhone}
                  onChange={(e) => setNewPartyPhone(e.target.value)}
                  style={{ width: '100%', background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Address / City (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DHA Phase 5, Lahore"
                  value={newPartyAddress}
                  onChange={(e) => setNewPartyAddress(e.target.value)}
                  style={{ width: '100%', background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* PREVIOUS / OPENING BALANCE: Friendly & Clear */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <DollarSign size={14} color="var(--gold-primary)" />
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-light)' }}>
                    Previous Balance (Past Udhaar / Advance)
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount (Rs.)"
                    value={newPartyOpeningBal}
                    onChange={(e) => setNewPartyOpeningBal(e.target.value)}
                    style={{ background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', fontWeight: '700' }}
                  />

                  <select
                    value={newPartyOpeningType}
                    onChange={(e) => setNewPartyOpeningType(e.target.value)}
                    style={{ background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px', fontWeight: '700' }}
                  >
                    {newPartyType === 'customer' ? (
                      <>
                        <option value="debit">Customer Owes You (Pending Dues)</option>
                        <option value="credit">Customer Paid Advance (Deposit)</option>
                      </>
                    ) : (
                      <>
                        <option value="credit">You Owe Supplier (Store Payable)</option>
                        <option value="debit">Advance Paid to Supplier</option>
                      </>
                    )}
                  </select>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '5px', lineHeight: '1.4' }}>
                  {newPartyType === 'customer' ? (
                    newPartyOpeningType === 'debit' 
                      ? "👉 Customer owes past unpaid bills (Will be added to their due amount)."
                      : "👉 Customer paid advance cash into store (Will be deducted from future orders)."
                  ) : (
                    newPartyOpeningType === 'credit'
                      ? "👉 Store owes past unpaid purchases to supplier (Will be added to payable)."
                      : "👉 Store deposited advance payment to supplier."
                  )}
                </div>
              </div>

              {/* Supplier Bank Details if Supplier */}
              {newPartyType === 'supplier' && (
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', marginBottom: '6px' }}>Supplier Bank Account (Optional)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      placeholder="Bank (e.g. HBL)"
                      value={newPartyBankName}
                      onChange={(e) => setNewPartyBankName(e.target.value)}
                      style={{ background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <input
                      type="text"
                      placeholder="Account Title"
                      value={newPartyAccountTitle}
                      onChange={(e) => setNewPartyAccountTitle(e.target.value)}
                      style={{ background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px' }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="IBAN Number (e.g. PK...)"
                    value={newPartyIban}
                    onChange={(e) => setNewPartyIban(e.target.value)}
                    style={{ width: '100%', background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddPartyOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg, #e2b265, #ba8339)', border: 'none', color: '#120904', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Create Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Customer Ledger Details */}
      {activeModalClient && (
        <CustomerLedgerModal
          client={activeModalClient}
          banks={banks}
          onClose={() => setSelectedClientModal(null)}
          onPaymentCreated={onPaymentCreated}
          onDeletePayment={onDeletePayment}
          onResetPartyBalance={onResetPartyBalance}
          onUpdateBillStatus={onUpdateBillStatus}
          onViewBill={onViewBill}
          onBillCreated={onBillCreated}
          onUpdateParty={onUpdateParty}
          onDeleteParty={onDeleteParty}
        />
      )}

      {/* MODAL: Supplier Ledger Details */}
      {activeModalSupplier && (
        <SupplierLedgerModal
          supplier={activeModalSupplier}
          banks={banks}
          onClose={() => setSelectedSupplierModal(null)}
          onPaymentCreated={onPaymentCreated}
          onDeletePayment={onDeletePayment}
          onResetPartyBalance={onResetPartyBalance}
          onUpdatePurchaseStatus={onUpdatePurchaseStatus}
          onViewPurchase={onViewPurchase}
          onPurchaseCreated={onPurchaseCreated}
          onUpdateParty={onUpdateParty}
          onDeleteParty={onDeleteParty}
        />
      )}

    </div>
  );
}
