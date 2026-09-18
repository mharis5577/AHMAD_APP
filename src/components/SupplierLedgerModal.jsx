import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Building, 
  Phone, 
  CreditCard, 
  Share2, 
  CheckCircle, 
  Clock, 
  Eye, 
  Check, 
  Copy, 
  Plus, 
  Trash2, 
  Receipt, 
  Sparkles,
  FileText,
  Edit3,
  DollarSign,
  ArrowUpCircle,
  RotateCcw
} from 'lucide-react';
import { BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';
import { shareBillText } from '../utils/shareUtils';
import { generateSupplierStatementPdf } from '../utils/pdfStatementGenerator';
import { showAppAlert, showAppConfirm } from '../utils/dialog';
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
  onPaymentCreated,
  onDeletePayment,
  onUpdatePurchaseStatus, 
  onViewPurchase, 
  onPurchaseCreated,
  onUpdateParty,
  onDeleteParty,
  onResetPartyBalance
}) {
  const [viewTab, setViewTab] = useState('ledger'); // 'ledger' (In-App Table) or 'cards' (Purchases list)
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Edit Supplier state
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [editName, setEditName] = useState(supplier?.name || '');
  const [editPhone, setEditPhone] = useState(supplier?.phone || '');
  const [editBankName, setEditBankName] = useState(supplier?.bank?.bankName || '');
  const [editAccountTitle, setEditAccountTitle] = useState(supplier?.bank?.accountTitle || '');
  const [editAccountNo, setEditAccountNo] = useState(supplier?.bank?.accountNo || '');
  const [editIban, setEditIban] = useState(supplier?.bank?.iban || '');
  const [editOpeningBal, setEditOpeningBal] = useState(supplier?.openingBalance || 0);
  const [editOpeningType, setEditOpeningType] = useState(supplier?.openingBalanceType || 'credit');

  // Add Purchase state
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [rows, setRows] = useState([
    { id: '1', name: '', qty: 1, price: '', total: 0 }
  ]);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const activeBanks = (banks && banks.length > 0) ? banks : BANK_ACCOUNTS;
  const [paymentMethod, setPaymentMethod] = useState(() => 
    activeBanks[0] ? `Bank Transfer (${activeBanks[0].bankName})` : 'Cash'
  );
  const [notes, setNotes] = useState('');

  // Pay Supplier state
  const [isPayingSupplier, setIsPayingSupplier] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState(() => 
    activeBanks[0] ? `Bank Transfer (${activeBanks[0].bankName})` : 'Cash'
  );
  const [payNotes, setPayNotes] = useState('');

  if (!supplier) return null;

  const openingBal = Number(supplier.openingBalance) || 0;
  const openingType = supplier.openingBalanceType || 'credit';
  const pendingPurchases = supplier.purchases ? supplier.purchases.filter(p => p.status === 'Pending') : [];

  // Chronological In-App Supplier Khata Ledger Table Rows with Running Balance
  const ledgerRows = useMemo(() => {
    const rows = [];
    let running = (openingType === 'debit' ? -openingBal : openingBal);

    if (openingBal > 0) {
      rows.push({
        id: 'opening',
        date: 'Opening',
        particulars: `Previous Balance (${openingType === 'credit' ? "Store Payable" : "Advance Paid"})`,
        ref: '-',
        debit: openingType === 'debit' ? openingBal : 0,
        credit: openingType === 'credit' ? openingBal : 0,
        balance: running,
        status: 'Carried',
        type: 'opening'
      });
    }

    // Merge Purchases and Payments made to Supplier
    const allEvents = [
      ...(supplier.purchases || []).map(p => ({ ...p, eventType: 'purchase' })),
      ...(supplier.payments || []).map(pmt => ({ ...pmt, eventType: 'payment' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    allEvents.forEach((item) => {
      if (item.eventType === 'purchase') {
        const p = item;
        const net = Number(p.netTotal) || 0;
        // Pure double-entry: Purchases are always Credit to Accounts Payable
        const credit = net;
        const debit = 0;

        running += (credit - debit);

        rows.push({
          id: p.id,
          date: new Date(p.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: '2-digit' }),
          particulars: p.items?.map(it => `${it.qty}x ${it.name}`).join(', ') || 'Stock Raw Materials',
          ref: `#${p.id}`,
          debit,
          credit,
          balance: running,
          status: p.status,
          purchase: p,
          type: 'purchase'
        });
      } else {
        const pmt = item;
        const amt = Number(pmt.amount) || 0;
        const isRefund = pmt.paymentType === 'receive';
        // When we pay a supplier, it is a Debit (reduces Accounts Payable).
        // When a supplier refunds / returns money to us, it is a Credit (increases Accounts Payable or reduces advance).
        const debit = isRefund ? 0 : amt;
        const credit = isRefund ? amt : 0;

        running += (credit - debit);

        rows.push({
          id: pmt.id,
          date: new Date(pmt.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: '2-digit' }),
          particulars: `${isRefund ? 'Refund Received' : 'Payment Paid'} (${pmt.paymentMethod || 'Cash'})${pmt.notes ? ` — ${pmt.notes}` : ''}`,
          ref: pmt.id,
          debit,
          credit,
          balance: running,
          status: 'Paid',
          payment: pmt,
          type: 'payment'
        });
      }
    });

    return rows;
  }, [supplier.purchases, supplier.payments, openingBal, openingType]);

  const totalDebits = useMemo(() => {
    return ledgerRows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
  }, [ledgerRows]);

  const totalCredits = useMemo(() => {
    return ledgerRows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  }, [ledgerRows]);

  const netCalculatedPayable = totalCredits - totalDebits;
  const hasPayable = netCalculatedPayable !== 0;
  const isPositivePayable = netCalculatedPayable > 0;

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
        id: `p_item_${Date.now()}_${i}`,
        name: r.name.trim(),
        qty: Number(r.qty) || 1,
        price: Number(r.price) || 0,
        total: (Number(r.qty) || 1) * (Number(r.price) || 0)
      }));

    if (validItems.length === 0) {
      showAppAlert({
        title: 'Missing Purchase Items',
        message: 'Please enter at least one item with a valid purchase cost.',
        type: 'warning'
      });
      return;
    }

    const purchaseId = `PUR-${Math.floor(2000 + Math.random() * 8000)}`;
    const newPurchase = {
      id: purchaseId,
      date: new Date().toISOString(),
      partyId: supplier.partyId || supplier.id || supplier.key,
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

    if (paymentStatus === 'Paid') {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }

    onPurchaseCreated?.(newPurchase);
    setRows([{ id: '1', name: '', qty: 1, price: '', total: 0 }]);
    setDiscount(0);
    setNotes('');
    setIsAddingPurchase(false);
  };

  // Save Edit Supplier
  const handleSaveEditSupplier = (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showAppAlert({
        title: 'Required Field',
        message: 'Supplier name cannot be empty.',
        type: 'warning'
      });
      return;
    }

    onUpdateParty?.(supplier, {
      id: supplier.partyId || supplier.key,
      name: editName.trim(),
      phone: editPhone.trim(),
      type: 'supplier',
      bank: {
        bankName: editBankName.trim(),
        accountTitle: editAccountTitle.trim(),
        accountNo: editAccountNo.trim(),
        iban: editIban.trim()
      },
      openingBalance: Number(editOpeningBal) || 0,
      openingBalanceType: editOpeningType
    });

    setIsEditingSupplier(false);
  };

  // Safe Delete Supplier Enforcement
  const handleDeleteSupplierAttempt = () => {
    if (supplier.totalPayable !== 0) {
      showAppAlert({
        title: 'Cannot Delete Supplier',
        type: 'warning',
        buttonText: 'Understood',
        message: `Supplier "${supplier.name}" has an active balance of Rs. ${Math.abs(supplier.totalPayable).toLocaleString()} (${supplier.totalPayable > 0 ? "You'll Give (Payable)" : "Advance Credit"}).\n\nAs requested, a party can ONLY be deleted when their account balance is completely cleared (Rs. 0).\n\nPlease settle all pending purchases and dues first.`
      });
      return;
    }

    showAppConfirm({
      title: 'Delete Cleared Supplier?',
      message: `Are you sure you want to delete supplier "${supplier.name}"?\nAccount balance is fully cleared (Rs. 0).`,
      confirmText: 'Delete Supplier',
      confirmStyle: 'danger',
      onConfirm: () => {
        onDeleteParty?.(supplier);
        onClose();
      }
    });
  };

  // Download Supplier Ledger PDF
  const handleDownloadLedgerPdf = async () => {
    setIsExportingPdf(true);
    await generateSupplierStatementPdf(supplier, banks);
    setIsExportingPdf(false);
  };

  // WhatsApp Payment Advice
  const sendWhatsAppAdvice = async () => {
    let msg = `🍫 *${BUSINESS_INFO.name.toUpperCase()} — SUPPLIER PAYMENT ADVICE*\n`;
    msg += `═══════════════════════════\n`;
    msg += `🏢 Supplier: *${supplier.name}*\n`;
    if (supplier.phone) msg += `📞 Phone: ${supplier.phone}\n`;
    msg += `📅 Date: ${new Date().toLocaleDateString('en-PK', { dateStyle: 'medium' })}\n`;
    msg += `═══════════════════════════\n\n`;

    if (openingBal > 0) {
      msg += `• Previous Balance: Rs. ${openingBal.toLocaleString()} (${openingType === 'credit' ? "Payable" : "Advance"})\n`;
    }

    msg += `• Total Stock Purchases: Rs. ${(supplier.totalPurchased || 0).toLocaleString()}\n`;
    msg += `• Total Amount Paid: Rs. ${(supplier.totalPaid || 0).toLocaleString()}\n`;
    
    if (supplier.totalPayable > 0) {
      msg += `• *BALANCE PAYABLE: Rs. ${supplier.totalPayable.toLocaleString()} (TO PAY)*\n\n`;
    } else if (supplier.totalPayable < 0) {
      msg += `• *ADVANCE BALANCE: Rs. ${Math.abs(supplier.totalPayable).toLocaleString()} (DEBIT)*\n\n`;
    } else {
      msg += `• *ACCOUNT STATUS: FULLY SETTLED (RS. 0)*\n\n`;
    }

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

  // Record Payment Paid to Supplier
  const handleSavePaySupplier = (e) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      showAppAlert({
        title: 'Invalid Amount',
        message: 'Please enter a valid payment amount greater than 0.',
        type: 'warning'
      });
      return;
    }

    const newPayment = {
      id: `PMT-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      partyId: supplier.partyId || supplier.key,
      partyName: supplier.name,
      partyPhone: supplier.phone || '',
      partyType: 'supplier',
      amount: amount,
      paymentMethod: payMethod,
      notes: payNotes.trim(),
      createdAt: new Date().toISOString()
    };

    onPaymentCreated?.(newPayment);

    confetti({ particleCount: 65, spread: 70, origin: { y: 0.7 } });
    setIsPayingSupplier(false);
    setPayAmount('');
    setPayNotes('');

    showAppAlert({
      title: 'Payment Recorded! 💳',
      message: `Successfully recorded payment of Rs. ${amount.toLocaleString()} via ${payMethod} to "${supplier.name}".\nIt is now displayed in the ledger table.`,
      type: 'success'
    });
  };

  // Settle all unpaid payables (both pending purchases and balance)
  const handleSettleAll = () => {
    const totalToSettle = Math.abs(netCalculatedPayable);

    if (totalToSettle === 0) {
      showAppAlert({
        title: 'Already Cleared',
        message: 'This supplier account is already 100% cleared (Rs. 0).',
        type: 'info'
      });
      return;
    }

    if (netCalculatedPayable > 0) {
      // We owe money to supplier
      showAppConfirm({
        title: 'Settle All Payables?',
        message: `Clear all outstanding payables of Rs. ${totalToSettle.toLocaleString()} for "${supplier.name}"?\n\nThis will mark pending purchases as Paid and record settlement payment vouchers.`,
        confirmText: 'Yes, Settle to Rs. 0',
        confirmStyle: 'primary',
        onConfirm: () => {
          const pendingPurchases = (supplier.purchases || []).filter(p => p.status === 'Pending');
          const pendingTotal = pendingPurchases.reduce((sum, p) => sum + (Number(p.netTotal) || 0), 0);

          // 1. Mark pending purchases as Paid (automatically creates linked PMT vouchers in App)
          pendingPurchases.forEach(p => onUpdatePurchaseStatus?.(p.id, 'Paid'));

          // 2. If there's opening balance or other payable beyond pending purchases, record voucher for difference
          const remainingPayable = totalToSettle - pendingTotal;
          if (remainingPayable > 0) {
            const newPayment = {
              id: `PMT-${Math.floor(1000 + Math.random() * 9000)}`,
              date: new Date().toISOString(),
              partyId: supplier.partyId || supplier.key,
              partyName: supplier.name,
              partyPhone: supplier.phone || '',
              partyType: 'supplier',
              amount: remainingPayable,
              paymentMethod: 'Bank Transfer',
              notes: 'Full Settlement (Opening / Remaining Payables)',
              createdAt: new Date().toISOString()
            };
            onPaymentCreated?.(newPayment);
          }

          confetti({ particleCount: 80, spread: 80, origin: { y: 0.7 } });
          showAppAlert({
            title: 'Account 100% Cleared! 🎉',
            message: `Supplier "${supplier.name}" payables settled. Account balance is now Rs. 0.`,
            type: 'success'
          });
        }
      });
    } else {
      // Supplier has advance debit balance (we paid in advance)
      showAppConfirm({
        title: 'Clear Advance Balance?',
        message: `Supplier "${supplier.name}" holds an advance payment of Rs. ${totalToSettle.toLocaleString()}.\n\nClick "Receive Refund" to record a cash return voucher (clearing balance to Rs. 0), or use "Reset to Rs. 0" in the header.`,
        confirmText: 'Receive Refund (Clear to Rs. 0)',
        confirmStyle: 'primary',
        onConfirm: () => {
          const newPayment = {
            id: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString(),
            partyId: supplier.partyId || supplier.key,
            partyName: supplier.name,
            partyPhone: supplier.phone || '',
            partyType: 'supplier',
            paymentType: 'receive',
            amount: totalToSettle,
            paymentMethod: 'Cash',
            notes: 'Advance Balance Refund Received',
            createdAt: new Date().toISOString()
          };
          onPaymentCreated?.(newPayment);

          confetti({ particleCount: 80, spread: 80, origin: { y: 0.7 } });
          showAppAlert({
            title: 'Advance Cleared! 🎉',
            message: `Refund of Rs. ${totalToSettle.toLocaleString()} recorded for "${supplier.name}". Account balance is now Rs. 0.`,
            type: 'success'
          });
        }
      });
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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px 12px',
        overflow: 'hidden'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          margin: '0 auto',
          padding: '20px 20px 16px 20px',
          border: '1px solid #10b981',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85)'
        }}
      >
        {/* Top Header */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px' }}>
                <Building size={18} color="#34d399" />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                {supplier.name}
              </h2>

              {/* Edit Supplier Button */}
              <button
                type="button"
                onClick={() => {
                  setEditName(supplier.name);
                  setEditPhone(supplier.phone || '');
                  setEditBankName(supplier.bank?.bankName || '');
                  setEditAccountTitle(supplier.bank?.accountTitle || '');
                  setEditAccountNo(supplier.bank?.accountNo || '');
                  setEditIban(supplier.bank?.iban || '');
                  setEditOpeningBal(supplier.openingBalance || 0);
                  setEditOpeningType(supplier.openingBalanceType || 'credit');
                  setIsEditingSupplier(true);
                }}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Edit Supplier Name & Details"
              >
                <Edit3 size={11} />
                <span>Edit Party / Balance</span>
              </button>

              {/* Delete Supplier Button (enforces balance clearance) */}
              <button
                type="button"
                onClick={handleDeleteSupplierAttempt}
                style={{
                  background: supplier.totalPayable === 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: supplier.totalPayable === 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                  color: supplier.totalPayable === 0 ? '#f87171' : 'var(--text-dim)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={supplier.totalPayable === 0 ? "Delete Supplier (Account is cleared)" : "Cannot delete: Account balance is not Rs. 0"}
              >
                <Trash2 size={11} />
                <span>Delete</span>
              </button>

              {/* Reset Party Balance to 0 Button */}
              {onResetPartyBalance && (
                <button
                  type="button"
                  onClick={() => {
                    showAppConfirm({
                      title: 'Reset Supplier Balance to Rs. 0?',
                      message: `Reset account balance for "${supplier.name}" to Rs. 0?\n\nThis will clear the opening balance and remove any unlinked settlement adjustment vouchers. Existing bills will remain intact.`,
                      confirmText: 'Yes, Reset to Rs. 0',
                      confirmStyle: 'danger',
                      onConfirm: () => {
                        onResetPartyBalance(supplier);
                        showAppAlert({
                          title: 'Balance Reset to Rs. 0',
                          message: `Account balance for "${supplier.name}" has been cleanly reset to Rs. 0.`,
                          type: 'success'
                        });
                      }
                    });
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Reset party balance to Rs. 0"
                >
                  <RotateCcw size={11} />
                  <span>Reset to Rs. 0</span>
                </button>
              )}
            </div>

            {supplier.phone && (
              <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

        {/* Scrollable Modal Content Window */}
        <div 
          className="custom-emerald-scrollbar"
          style={{ 
            overflowY: 'auto', 
            overflowX: 'hidden', 
            flex: 1, 
            paddingRight: '6px',
            WebkitOverflowScrolling: 'touch' 
          }}
        >

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

        {/* Financial Metric Strip (Including Previous Balance) */}
        <div style={{ display: 'grid', gridTemplateColumns: openingBal > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px' }}>
          
          {openingBal > 0 && (
            <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center', borderTop: '3px solid #60a5fa' }}>
              <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Previous Bal</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#60a5fa', marginTop: '2px' }}>
                Rs. {openingBal.toLocaleString()}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                {openingType === 'credit' ? "You'll Give" : "Advance"}
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Purchases</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
              Rs. {supplier.totalPurchased.toLocaleString()}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{supplier.purchases?.length || 0} bills</div>
          </div>

          <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Paid</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>
              Rs. {supplier.totalPaid.toLocaleString()}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>settled</div>
          </div>

          <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center', borderTop: hasPayable ? (isPositivePayable ? '3px solid #ef4444' : '3px solid #60a5fa') : '3px solid #10b981' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Payable</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: hasPayable ? (isPositivePayable ? '#f87171' : '#60a5fa') : '#34d399', marginTop: '2px' }}>
              {hasPayable ? (isPositivePayable ? `Rs. ${netCalculatedPayable.toLocaleString()}` : `Adv: Rs. ${Math.abs(netCalculatedPayable).toLocaleString()}`) : 'Cleared ✓'}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{isPositivePayable ? "You'll Give" : (netCalculatedPayable < 0 ? "Debit" : "Zero")}</div>
          </div>
        </div>

        {/* Action Buttons: Record Purchase, Pay Supplier, Download PDF, WhatsApp Advice */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
          
          <button
            onClick={() => setIsAddingPurchase(!isAddingPurchase)}
            className="btn-gold"
            style={{ padding: '10px', fontSize: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            {isAddingPurchase ? <X size={14} /> : <Plus size={14} />}
            <span>{isAddingPurchase ? 'Close Purchase' : '+ Record Purchase'}</span>
          </button>

          {/* Pay Supplier Button */}
          <button
            onClick={() => {
              setPayAmount(supplier.totalPayable > 0 ? String(supplier.totalPayable) : '');
              setIsPayingSupplier(true);
            }}
            className="btn-secondary"
            style={{ 
              padding: '10px', 
              fontSize: '12px', 
              borderColor: 'rgba(59, 130, 246, 0.6)', 
              color: '#60a5fa', 
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px' 
            }}
            title="Record payment made to supplier"
          >
            <ArrowUpCircle size={15} color="#60a5fa" />
            <span>Pay Supplier</span>
          </button>

          {/* Download Supplier Ledger PDF */}
          <button
            onClick={handleDownloadLedgerPdf}
            disabled={isExportingPdf}
            className="btn-secondary"
            style={{ padding: '10px', fontSize: '12px', borderColor: '#10b981', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <FileText size={14} />
            <span>{isExportingPdf ? 'Generating...' : 'Download PDF'}</span>
          </button>

          {/* WhatsApp Advice */}
          <button
            onClick={sendWhatsAppAdvice}
            className="btn-secondary"
            style={{ padding: '10px', fontSize: '12px', borderColor: '#25D366', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Share2 size={14} color="#25D366" />
            <span>WhatsApp Advice</span>
          </button>
        </div>

        {/* 1-Tap Settle All Payables Full-Width Bar */}
        <div style={{ marginBottom: '16px' }}>
          {hasPayable ? (
            <button
              onClick={handleSettleAll}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.35))',
                border: '1px solid rgba(16, 185, 129, 0.6)',
                color: '#34d399',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.12)'
              }}
              title="Clear all unpaid payables and previous balance to Rs. 0"
            >
              <Check size={16} />
              <span>✓ Settle All Payables (Clear to Rs. 0)</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '10px' }}>
              <CheckCircle size={16} />
              <span>Account 100% Cleared (Rs. 0 Payable)</span>
            </div>
          )}
        </div>

        {/* EDIT SUPPLIER FORM MODAL */}
        {isEditingSupplier && (
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
              border: '1px solid #10b981',
              borderRadius: '16px',
              padding: '20px',
              width: '100%',
              maxWidth: '460px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#34d399' }}>
                  Edit Supplier Details
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingSupplier(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Supplier / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: '100%', background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    style={{ width: '100%', background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Bank details */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', marginBottom: '8px' }}>Beneficiary Bank Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Bank Name (e.g. HBL)"
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      style={{ background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <input
                      type="text"
                      placeholder="Account Title"
                      value={editAccountTitle}
                      onChange={(e) => setEditAccountTitle(e.target.value)}
                      style={{ background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px' }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="IBAN (e.g. PK72HABB...)"
                    value={editIban}
                    onChange={(e) => setEditIban(e.target.value)}
                    style={{ width: '100%', background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Previous Balance */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#34d399', display: 'block', marginBottom: '6px' }}>
                    Previous / Opening Balance (Rs.)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <input
                      type="number"
                      min="0"
                      value={editOpeningBal}
                      onChange={(e) => setEditOpeningBal(e.target.value)}
                      placeholder="0"
                      style={{ background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '13px', fontWeight: '700' }}
                    />
                    <select
                      value={editOpeningType}
                      onChange={(e) => setEditOpeningType(e.target.value)}
                      style={{ background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px', fontWeight: '700' }}
                    >
                      <option value="credit">You Owe Supplier (Store Payable)</option>
                      <option value="debit">Advance Paid to Supplier</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingSupplier(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 2, padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PAY SUPPLIER FORM MODAL */}
        {isPayingSupplier && (
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
              background: '#0d1821',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '16px',
              padding: '22px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.85)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '6px', borderRadius: '8px' }}>
                    <ArrowUpCircle size={18} color="#60a5fa" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                      Pay Supplier
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Beneficiary: {supplier.name}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPayingSupplier(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Current Payable Highlight Banner */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Current Total Payable:</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa' }}>
                  Rs. {Math.abs(supplier.totalPayable).toLocaleString()}
                </span>
              </div>

              <form onSubmit={handleSavePaySupplier} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Payment Amount Paid (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Enter amount paid"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 15, 25, 0.9)',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#60a5fa',
                      fontSize: '16px',
                      fontWeight: '800',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {supplier.totalPayable > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayAmount(String(supplier.totalPayable))}
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          color: '#60a5fa',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '10px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Full Payable (Rs. {supplier.totalPayable.toLocaleString()})
                      </button>
                    )}
                    {openingBal > 0 && openingBal !== supplier.totalPayable && (
                      <button
                        type="button"
                        onClick={() => setPayAmount(String(openingBal))}
                        style={{
                          background: 'rgba(96, 165, 250, 0.15)',
                          border: '1px solid rgba(96, 165, 250, 0.35)',
                          color: '#93c5fd',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '10px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Opening Bal (Rs. {openingBal.toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 15, 25, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Cash">Cash</option>
                    {activeBanks.map((b, idx) => (
                      <option key={idx} value={`Bank Transfer (${b.bankName})`}>
                        Bank Transfer ({b.bankName} - {b.accountTitle})
                      </option>
                    ))}
                    <option value="Cheque">Cheque</option>
                    <option value="Online / Raast">Online / Raast</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Notes / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Transfer ID, cheque number, online receipt ref"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 15, 25, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsPayingSupplier(false)}
                    style={{
                      flex: 1,
                      padding: '11px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 2,
                      padding: '11px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check size={15} />
                    <span>Confirm & Record</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* IN-LEDGER ADD PURCHASE FORM */}
        {isAddingPurchase && (
          <form 
            onSubmit={handleSavePurchase}
            className="glass-card" 
            style={{ 
              padding: '16px', 
              marginBottom: '18px', 
              border: '2px solid #10b981', 
              borderRadius: '14px',
              background: 'linear-gradient(145deg, rgba(14, 30, 22, 0.95), rgba(10, 20, 14, 0.98))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: '800', fontSize: '14px' }}>
                <Receipt size={16} />
                <span>New Purchase Voucher from {supplier.name}</span>
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
              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginBottom: '5px' }}>Quick Presets:</div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {QUICK_STOCK_ITEMS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleAddQuickChip(c)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34d399',
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
                    placeholder={`Item ${idx + 1}`}
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

            {/* Financial Summary */}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: '800', color: '#34d399', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span>Net Payable:</span>
                <span>Rs. {netTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Status Switcher */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setPaymentStatus('Pending')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: paymentStatus === 'Pending' ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
                  background: paymentStatus === 'Pending' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: paymentStatus === 'Pending' ? '#f87171' : 'var(--text-dim)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Mark Pending (Payable)
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatus('Paid')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: paymentStatus === 'Paid' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                  background: paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: paymentStatus === 'Paid' ? '#34d399' : 'var(--text-dim)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Mark as Paid ✓
              </button>
            </div>

            <button
              type="submit"
              className="btn-gold"
              style={{ width: '100%', padding: '10px', fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
            >
              Save Purchase to {supplier.name}'s Khata
            </button>
          </form>
        )}

        {/* Switcher: In-App Ledger Table vs Purchases Cards */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setViewTab('ledger')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: viewTab === 'ledger' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                color: viewTab === 'ledger' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '11.5px',
                fontWeight: viewTab === 'ledger' ? '800' : '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FileText size={12} />
              <span>Khata Ledger Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('cards')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: viewTab === 'cards' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                color: viewTab === 'cards' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '11.5px',
                fontWeight: viewTab === 'cards' ? '800' : '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Receipt size={12} />
              <span>Purchases Cards ({supplier.purchases?.length || 0})</span>
            </button>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            {viewTab === 'ledger' ? '📊 Live Running Balance' : '📋 Card View'}
          </span>
        </div>

        {/* 1. IN-APP INTERACTIVE SUPPLIER KHATA LEDGER TABLE */}
        {viewTab === 'ledger' && (
          <div style={{
            background: 'rgba(10, 20, 15, 0.95)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '16px',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
          }}>
            <div 
              className="custom-emerald-scrollbar"
              style={{ 
                overflowX: 'auto', 
                maxHeight: '380px',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch' 
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '640px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 6 }}>
                  <tr style={{ background: '#092117', borderBottom: '2px solid rgba(16, 185, 129, 0.4)' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: '#a7f3d0', fontWeight: '700', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: '#a7f3d0', fontWeight: '700', minWidth: '150px' }}>Particulars / Stock</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', color: '#a7f3d0', fontWeight: '700', whiteSpace: 'nowrap' }}>Voucher #</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#fbbf24', fontWeight: '700', whiteSpace: 'nowrap' }}>Purchased (Rs.)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399', fontWeight: '700', whiteSpace: 'nowrap' }}>Paid (Rs.)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#a7f3d0', fontWeight: '700', whiteSpace: 'nowrap' }}>Running Balance</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-dim)', fontWeight: '700', whiteSpace: 'nowrap' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No purchase transactions recorded for this supplier yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerRows.map((row, idx) => (
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
                        <td style={{ padding: '8px', color: 'var(--text-main)', maxWidth: '170px' }}>
                          <div style={{ fontWeight: row.type === 'opening' ? '700' : '500', color: row.type === 'opening' ? '#93c5fd' : 'var(--text-main)' }}>
                            {row.particulars}
                          </div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {row.purchase ? (
                            <button
                              type="button"
                              onClick={() => onViewPurchase(row.purchase)}
                              style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', fontWeight: '700' }}
                            >
                              {row.ref}
                            </button>
                          ) : row.type === 'payment' ? (
                            <span style={{ color: '#60a5fa', fontWeight: '700', fontSize: '11px' }}>
                              #{row.ref}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>{row.ref}</span>
                          )}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: row.credit > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
                          {row.credit > 0 ? `Rs. ${row.credit.toLocaleString()}` : '-'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: row.debit > 0 ? '#34d399' : 'var(--text-dim)' }}>
                          {row.debit > 0 ? `Rs. ${row.debit.toLocaleString()}` : '-'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '800', whiteSpace: 'nowrap', color: row.balance > 0 ? '#fbbf24' : (row.balance < 0 ? '#60a5fa' : '#34d399') }}>
                          Rs. {Math.abs(row.balance).toLocaleString()} {row.balance > 0 ? '(Payable)' : (row.balance < 0 ? '(Adv)' : '✓')}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {row.type === 'opening' ? (
                            <span style={{ fontSize: '10px', color: '#60a5fa', background: 'rgba(96, 165, 250, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              Carried
                            </span>
                          ) : row.type === 'payment' ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '10px', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                                Paid ✓
                              </span>
                              {onDeletePayment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    showAppConfirm({
                                      title: 'Delete Payment?',
                                      message: `Remove payment of Rs. ${row.debit.toLocaleString()}?`,
                                      confirmText: 'Delete Payment',
                                      confirmStyle: 'danger',
                                      onConfirm: () => onDeletePayment(row.payment.id)
                                    });
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                                  title="Delete payment"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onUpdatePurchaseStatus(row.purchase.id, row.status === 'Paid' ? 'Pending' : 'Paid')}
                              style={{
                                background: row.status === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                border: row.status === 'Paid' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                color: row.status === 'Paid' ? '#34d399' : '#f87171',
                                borderRadius: '10px',
                                padding: '2px 8px',
                                fontSize: '10.5px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              {row.status === 'Paid' ? 'Paid ✓' : 'Unpaid ⏳'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 6 }}>
                  <tr style={{ background: '#092117', borderTop: '2px solid rgba(16, 185, 129, 0.4)', fontWeight: '800' }}>
                    <td colSpan="3" style={{ padding: '10px 8px', color: '#a7f3d0' }}>
                      Total Purchases vs Paid
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                      Rs. {totalCredits.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399', whiteSpace: 'nowrap' }}>
                      Rs. {totalDebits.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: netCalculatedPayable > 0 ? '#f87171' : (netCalculatedPayable < 0 ? '#60a5fa' : '#34d399'), fontSize: '12px', whiteSpace: 'nowrap' }}>
                      Rs. {Math.abs(netCalculatedPayable).toLocaleString()} {netCalculatedPayable > 0 ? '(Payable)' : (netCalculatedPayable < 0 ? '(Adv)' : '✓')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 2. TRANSACTION HISTORY & VOUCHERS LIST (CARDS VIEW) */}
        {viewTab === 'cards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Procurement History & Purchases</span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{supplier.purchases?.length || 0} bills</span>
            </div>

            {/* Previous Balance Row */}
            {openingBal > 0 && (
              <div
                style={{
                  background: 'rgba(96, 165, 250, 0.08)',
                  border: '1px solid rgba(96, 165, 250, 0.25)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={15} color="#60a5fa" />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#93c5fd' }}>
                      Previous / Opening Balance
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                      {openingType === 'credit' ? "Supplier balance payable (Credit)" : "Advance payment made (Debit)"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#93c5fd' }}>
                  Rs. {openingBal.toLocaleString()}
                </div>
              </div>
            )}

            {!supplier.purchases || supplier.purchases.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                No purchases recorded for this supplier yet.
              </div>
            ) : (
              supplier.purchases.map((pur) => {
                const isPaid = pur.status === 'Paid';
                const dateStr = new Date(pur.date).toLocaleDateString('en-PK', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                return (
                  <div
                    key={pur.id}
                    style={{
                      background: 'rgba(14, 7, 4, 0.75)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {pur.id}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>• {dateStr}</span>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {pur.items?.map(it => `${it.qty}x ${it.name}`).join(', ') || 'Stock items'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: isPaid ? '#34d399' : '#f87171' }}>
                          Rs. {pur.netTotal.toLocaleString()}
                        </div>
                        <button
                          type="button"
                          onClick={() => onUpdatePurchaseStatus(pur.id, isPaid ? 'Pending' : 'Paid')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '10px',
                            fontWeight: '700',
                            color: isPaid ? '#10b981' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            marginTop: '2px'
                          }}
                        >
                          {isPaid ? <CheckCircle size={10} /> : <Clock size={10} />}
                          <span>{isPaid ? 'Paid' : 'Unpaid'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onViewPurchase(pur)}
                        className="btn-icon"
                        style={{ width: '28px', height: '28px' }}
                        title="View Voucher"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Supplier Payment Cards */}
            {supplier.payments && supplier.payments.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#60a5fa', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={13} color="#60a5fa" />
                  <span>Recorded Payments to Supplier ({supplier.payments.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {supplier.payments.map((pmt) => (
                    <div
                      key={pmt.id}
                      style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#60a5fa' }}>
                            #{pmt.id}
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                            • {new Date(pmt.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Method: {pmt.paymentMethod || 'Cash'}{pmt.notes ? ` • ${pmt.notes}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#60a5fa' }}>
                            Paid Rs. {Number(pmt.amount || 0).toLocaleString()}
                          </div>
                          <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: '700' }}>Settled ✓</span>
                        </div>
                        {onDeletePayment && (
                          <button
                            type="button"
                            onClick={() => {
                              showAppConfirm({
                                title: 'Delete Payment?',
                                message: `Remove payment of Rs. ${Number(pmt.amount || 0).toLocaleString()}?`,
                                confirmText: 'Delete Payment',
                                confirmStyle: 'danger',
                                onConfirm: () => onDeletePayment(pmt.id)
                              });
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                            title="Delete payment"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
