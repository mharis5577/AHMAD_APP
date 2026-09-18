import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Share2, 
  CheckCircle, 
  Clock, 
  Eye, 
  Check, 
  Plus, 
  Trash2, 
  Receipt, 
  Sparkles, 
  FileText, 
  Edit3, 
  AlertTriangle,
  Building2,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  RotateCcw
} from 'lucide-react';
import { BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';
import { shareBillText } from '../utils/shareUtils';
import { generateCustomerStatementPdf } from '../utils/pdfStatementGenerator';
import { showAppAlert, showAppConfirm } from '../utils/dialog';
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
  onBillCreated,
  onPaymentCreated,
  onDeletePayment,
  onResetPartyBalance,
  onUpdateParty,
  onDeleteParty
}) {
  const [viewTab, setViewTab] = useState('ledger'); // 'ledger' (In-App Table) or 'cards' (Bills list)
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Edit party modal state
  const [isEditingParty, setIsEditingParty] = useState(false);
  const [editName, setEditName] = useState(client?.name || '');
  const [editPhone, setEditPhone] = useState(client?.phone || '');
  const [editAddress, setEditAddress] = useState(client?.address || '');
  const [editOpeningBal, setEditOpeningBal] = useState(client?.openingBalance || 0);
  const [editOpeningType, setEditOpeningType] = useState(client?.openingBalanceType || 'debit');

  // Add Bill state
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [rows, setRows] = useState([
    { id: '1', name: '', qty: 1, price: '', total: 0 }
  ]);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const activeBanks = (banks && banks.length > 0) ? banks : BANK_ACCOUNTS;
  const [paymentMethod, setPaymentMethod] = useState(() => 
    activeBanks[0] ? `Bank Transfer (${activeBanks[0].bankName})` : 'Cash on Delivery'
  );
  const [deliveryAddress, setDeliveryAddress] = useState(client?.address || '');
  const [notes, setNotes] = useState('');

  // Receive Payment state
  const [isReceivingPayment, setIsReceivingPayment] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState('');
  const [receiveMethod, setReceiveMethod] = useState(() => 
    activeBanks[0] ? `Bank Transfer (${activeBanks[0].bankName})` : 'Cash'
  );
  const [receiveNotes, setReceiveNotes] = useState('');

  // Send Amount (Refund / Return Advance to Customer) state
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sendMethod, setSendMethod] = useState(() => 
    activeBanks[0] ? `Bank Transfer (${activeBanks[0].bankName})` : 'Cash'
  );
  const [sendNotes, setSendNotes] = useState('');

  if (!client) return null;

  const openingBal = Number(client.openingBalance) || 0;
  const openingType = client.openingBalanceType || 'debit';

  // Pure double-entry calculation
  const totalBilledCalc = useMemo(() => {
    return (client.bills || []).reduce((acc, b) => acc + (Number(b.netTotal) || 0), 0);
  }, [client.bills]);

  const totalPaidCalc = useMemo(() => {
    return (client.payments || []).filter(p => p.paymentType !== 'send').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [client.payments]);

  const totalSentCalc = useMemo(() => {
    return (client.payments || []).filter(p => p.paymentType === 'send').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [client.payments]);

  const totalDebits = (openingType === 'debit' ? openingBal : 0) + totalBilledCalc + totalSentCalc;
  const totalCredits = (openingType === 'credit' ? openingBal : 0) + totalPaidCalc;
  const netCalculatedDue = totalDebits - totalCredits;
  const hasDue = netCalculatedDue !== 0;
  const isPositiveDue = netCalculatedDue > 0;

  // Chronological In-App Khata Ledger Table Rows with Running Balance
  const ledgerRows = useMemo(() => {
    const rows = [];
    let running = (openingType === 'credit' ? -openingBal : openingBal);

    if (openingBal > 0) {
      rows.push({
        id: 'opening',
        date: 'Opening',
        particulars: `Previous Balance (${openingType === 'debit' ? "Customer Owes" : "Customer Advance"})`,
        ref: '-',
        debit: openingType === 'debit' ? openingBal : 0,
        credit: openingType === 'credit' ? openingBal : 0,
        balance: running,
        status: 'Carried',
        type: 'opening'
      });
    }

    // Merge Bills and Payments, sorted chronologically
    const allEvents = [
      ...(client.bills || []).map(b => ({ ...b, eventType: 'bill' })),
      ...(client.payments || []).map(p => ({ ...p, eventType: 'payment' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    allEvents.forEach((item) => {
      if (item.eventType === 'bill') {
        const b = item;
        const net = Number(b.netTotal) || 0;
        running += net; // Bill is ALWAYS a Debit (sales invoice)

        rows.push({
          id: b.id,
          date: new Date(b.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: '2-digit' }),
          particulars: b.items?.map(it => `${it.qty}x ${it.name}`).join(', ') || 'Chocolate Order',
          ref: `#${b.id}`,
          debit: net,
          credit: 0,
          balance: running,
          status: b.status,
          bill: b,
          type: 'bill'
        });
      } else {
        const p = item;
        const amt = Number(p.amount) || 0;
        const isSend = p.paymentType === 'send';

        if (isSend) {
          running += amt; // Money sent/refunded to customer is Debit
          rows.push({
            id: p.id,
            date: new Date(p.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: '2-digit' }),
            particulars: `Amount Sent / Refund (${p.paymentMethod || 'Cash'})${p.notes ? ` — ${p.notes}` : ''}`,
            ref: p.id,
            debit: amt,
            credit: 0,
            balance: running,
            status: 'Sent',
            payment: p,
            type: 'payment_send'
          });
        } else {
          running -= amt; // Money received from customer is Credit
          rows.push({
            id: p.id,
            date: new Date(p.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: '2-digit' }),
            particulars: `Payment Received (${p.paymentMethod || 'Cash'})${p.notes ? ` — ${p.notes}` : ''}`,
            ref: p.id,
            debit: 0,
            credit: amt,
            balance: running,
            status: 'Received',
            payment: p,
            type: 'payment'
          });
        }
      }
    });

    return rows;
  }, [client.bills, client.payments, openingBal, openingType]);

  // Row changes for new bill
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
        id: `item_${Date.now()}_${i}`,
        name: r.name.trim(),
        qty: Number(r.qty) || 1,
        price: Number(r.price) || 0,
        total: (Number(r.qty) || 1) * (Number(r.price) || 0)
      }));

    if (validItems.length === 0) {
      showAppAlert({
        title: 'Missing Items',
        message: 'Please enter at least one item name and valid price.',
        type: 'warning'
      });
      return;
    }

    const newBill = {
      id: `TCH-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      partyId: client.partyId || client.id || client.key,
      customerName: client.name,
      customerPhone: client.phone || '',
      deliveryAddress: deliveryAddress.trim() || client.address || '',
      items: validItems,
      subtotal,
      discount: Number(discount) || 0,
      netTotal,
      paymentMethod,
      status: paymentStatus,
      notes: notes.trim()
    };

    if (paymentStatus === 'Paid') {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    }

    onBillCreated?.(newBill);
    setRows([{ id: '1', name: '', qty: 1, price: '', total: 0 }]);
    setDiscount(0);
    setNotes('');
    setIsAddingBill(false);
  };

  // Save Edit Party Details
  const handleSaveEditParty = (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showAppAlert({
        title: 'Required Field',
        message: 'Party name cannot be empty.',
        type: 'warning'
      });
      return;
    }

    onUpdateParty?.(client, {
      id: client.partyId || client.key,
      name: editName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      type: 'customer',
      openingBalance: Number(editOpeningBal) || 0,
      openingBalanceType: editOpeningType
    });

    setIsEditingParty(false);
  };

  // Safe Delete Party Enforcement
  const handleDeletePartyAttempt = () => {
    if (netCalculatedDue !== 0) {
      showAppAlert({
        title: 'Cannot Delete Party',
        type: 'warning',
        buttonText: 'Understood',
        message: `Customer "${client.name}" has an active balance of Rs. ${Math.abs(netCalculatedDue).toLocaleString()} (${netCalculatedDue > 0 ? "You'll Get / Unpaid" : "Advance Credit"}).\n\nAs requested, a party can ONLY be deleted when their account balance is completely cleared (Rs. 0).\n\nPlease settle all unpaid bills and balances first.`
      });
      return;
    }

    showAppConfirm({
      title: 'Delete Cleared Customer?',
      message: `Are you sure you want to delete customer "${client.name}"?\nAccount balance is fully cleared (Rs. 0).`,
      confirmText: 'Delete Customer',
      confirmStyle: 'danger',
      onConfirm: () => {
        onDeleteParty?.(client);
        onClose();
      }
    });
  };

  // Download Ledger Statement as PDF
  const handleDownloadLedgerPdf = async () => {
    setIsExportingPdf(true);
    await generateCustomerStatementPdf(client, activeBanks);
    setIsExportingPdf(false);
  };

  // Send WhatsApp Account Statement
  const sendWhatsAppStatement = async () => {
    const pendingBills = (client.bills || []).filter(b => b.status === 'Pending');

    let msg = `🍫 *${BUSINESS_INFO.name.toUpperCase()} — CUSTOMER KHATA STATEMENT*\n`;
    msg += `═══════════════════════════\n`;
    msg += `👤 Customer: *${client.name}*\n`;
    if (client.phone) msg += `📞 Phone: ${client.phone}\n`;
    if (client.address) msg += `📍 Address: ${client.address}\n`;
    msg += `📅 Date: ${new Date().toLocaleDateString('en-PK', { dateStyle: 'medium' })}\n`;
    msg += `═══════════════════════════\n\n`;

    if (openingBal > 0) {
      msg += `• *Previous / Opening Balance:* Rs. ${openingBal.toLocaleString()} (${openingType === 'debit' ? "You'll Get (Debit)" : "Advance Credit"})\n`;
    }

    msg += `• Total Bills Generated: Rs. ${totalBilledCalc.toLocaleString()}\n`;
    msg += `• Total Amount Paid: Rs. ${totalPaidCalc.toLocaleString()}\n`;
    
    if (netCalculatedDue > 0) {
      msg += `• *OUTSTANDING DUE: Rs. ${netCalculatedDue.toLocaleString()} (TO PAY)*\n\n`;
    } else if (netCalculatedDue < 0) {
      msg += `• *ADVANCE BALANCE: Rs. ${Math.abs(netCalculatedDue).toLocaleString()} (CREDIT)*\n\n`;
    } else {
      msg += `• *ACCOUNT STATUS: FULLY SETTLED (RS. 0)*\n\n`;
    }

    if (pendingBills.length > 0 && netCalculatedDue > 0) {
      msg += `📋 *PENDING UNPAID INVOICES:*\n`;
      pendingBills.forEach((b, idx) => {
        const d = new Date(b.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
        msg += `${idx + 1}. #${b.id} (${d}) = *Rs. ${Number(b.netTotal || 0).toLocaleString()}*\n`;
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

  // Record Payment Received from Customer
  const handleSaveReceivePayment = (e) => {
    e.preventDefault();
    const amount = Number(receiveAmount);
    if (!amount || amount <= 0) {
      showAppAlert({
        title: 'Invalid Amount',
        message: 'Please enter a valid payment amount greater than 0.',
        type: 'warning'
      });
      return;
    }

    const newPayment = {
      id: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      partyId: client.partyId || client.key,
      partyName: client.name,
      partyPhone: client.phone || '',
      partyType: 'customer',
      amount: amount,
      paymentMethod: receiveMethod,
      notes: receiveNotes.trim(),
      createdAt: new Date().toISOString()
    };

    onPaymentCreated?.(newPayment);

    confetti({ particleCount: 65, spread: 70, origin: { y: 0.7 } });
    setIsReceivingPayment(false);
    setReceiveAmount('');
    setReceiveNotes('');

    showAppAlert({
      title: 'Payment Logged! 💰',
      message: `Recorded payment of Rs. ${amount.toLocaleString()} via ${receiveMethod} from "${client.name}".\nIt is now displayed in the Khata Ledger table.`,
      type: 'success'
    });
  };

  // Record Payment Sent / Refunded to Customer
  const handleSaveSendPayment = (e) => {
    e.preventDefault();
    const amount = Number(sendAmount);
    if (!amount || amount <= 0) {
      showAppAlert({
        title: 'Invalid Amount',
        message: 'Please enter a valid amount greater than 0.',
        type: 'warning'
      });
      return;
    }

    const newPayment = {
      id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      partyId: client.partyId || client.key,
      partyName: client.name,
      partyPhone: client.phone || '',
      partyType: 'customer',
      paymentType: 'send',
      amount: amount,
      paymentMethod: sendMethod,
      notes: sendNotes.trim() || 'Amount Sent / Refund',
      createdAt: new Date().toISOString()
    };

    onPaymentCreated?.(newPayment);

    confetti({ particleCount: 65, spread: 70, origin: { y: 0.7 } });
    setIsSendingPayment(false);
    setSendAmount('');
    setSendNotes('');

    showAppAlert({
      title: 'Payment Sent Logged! 📤',
      message: `Recorded payment of Rs. ${amount.toLocaleString()} via ${sendMethod} sent to "${client.name}".\nIt is now recorded as a Debit in the Khata Ledger table.`,
      type: 'success'
    });
  };

  // Settle all unpaid dues (both pending bills and balance)
  const handleSettleAll = () => {
    const totalToSettle = Math.abs(netCalculatedDue);

    if (totalToSettle === 0) {
      showAppAlert({
        title: 'Already Cleared',
        message: 'This customer account is already 100% cleared (Rs. 0).',
        type: 'info'
      });
      return;
    }

    if (netCalculatedDue > 0) {
      // Customer owes money
      showAppConfirm({
        title: 'Settle All Outstanding Dues?',
        message: `Clear all outstanding dues of Rs. ${totalToSettle.toLocaleString()} for "${client.name}"?\n\nThis will record a settlement receipt voucher of Rs. ${totalToSettle.toLocaleString()} and mark pending bills as Paid.`,
        confirmText: 'Yes, Settle to Rs. 0',
        confirmStyle: 'primary',
        onConfirm: () => {
          const pendingBills = (client.bills || []).filter(b => b.status === 'Pending');
          const pendingTotal = pendingBills.reduce((sum, b) => sum + (Number(b.netTotal) || 0), 0);

          // 1. Mark pending bills as Paid (automatically creates linked RCP payment vouchers in App)
          pendingBills.forEach(b => onUpdateBillStatus?.(b.id, 'Paid'));

          // 2. If there's opening balance or other debit beyond pending bills, record ONE receipt for the difference
          const remainingDue = totalToSettle - pendingTotal;
          if (remainingDue > 0) {
            const newPayment = {
              id: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
              date: new Date().toISOString(),
              partyId: client.partyId || client.key,
              partyName: client.name,
              partyPhone: client.phone || '',
              partyType: 'customer',
              amount: remainingDue,
              paymentMethod: 'Cash',
              notes: 'Full Settlement (Opening / Remaining Dues)',
              createdAt: new Date().toISOString()
            };
            onPaymentCreated?.(newPayment);
          }

          confetti({ particleCount: 80, spread: 80, origin: { y: 0.7 } });
          showAppAlert({
            title: 'Account 100% Cleared! 🎉',
            message: `Customer "${client.name}" dues of Rs. ${totalToSettle.toLocaleString()} settled. Account balance is now Rs. 0.`,
            type: 'success'
          });
        }
      });
    } else {
      // Customer has advance credit balance
      showAppConfirm({
        title: 'Refund Advance Credit Balance?',
        message: `Customer "${client.name}" has an advance credit of Rs. ${totalToSettle.toLocaleString()}.\n\nClick "Refund Advance" to record a payout voucher and return the advance cash to customer (clearing the balance to Rs. 0).\n\n(Tip: If this balance was entered by mistake, use the "Reset to Rs. 0" button in the header.)`,
        confirmText: 'Refund Advance (Send Payout)',
        confirmStyle: 'primary',
        onConfirm: () => {
          const newPayment = {
            id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString(),
            partyId: client.partyId || client.key,
            partyName: client.name,
            partyPhone: client.phone || '',
            partyType: 'customer',
            paymentType: 'send',
            amount: totalToSettle,
            paymentMethod: 'Cash',
            notes: 'Full Advance Balance Refund',
            createdAt: new Date().toISOString()
          };
          onPaymentCreated?.(newPayment);

          confetti({ particleCount: 80, spread: 80, origin: { y: 0.7 } });
          showAppAlert({
            title: 'Advance Refunded & Cleared! 🎉',
            message: `Refund payout of Rs. ${totalToSettle.toLocaleString()} logged for "${client.name}". Account balance is now Rs. 0.`,
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
          border: '1px solid var(--gold-primary)',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.85)'
        }}
      >
        {/* Top Header with Edit & Delete actions */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <User size={18} color="var(--gold-primary)" />
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                {client.name}
              </h2>
              
              {/* Edit Party Name Button */}
              <button
                type="button"
                onClick={() => {
                  setEditName(client.name);
                  setEditPhone(client.phone || '');
                  setEditAddress(client.address || '');
                  setEditOpeningBal(client.openingBalance || 0);
                  setEditOpeningType(client.openingBalanceType || 'debit');
                  setIsEditingParty(true);
                }}
                style={{
                  background: 'rgba(226, 178, 101, 0.15)',
                  border: '1px solid var(--gold-border)',
                  color: 'var(--gold-light)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Edit Party Name & Details"
              >
                <Edit3 size={11} />
                <span>Edit Party / Balance</span>
              </button>

              {/* Reset Party Balance to 0 Button */}
              {onResetPartyBalance && (
                <button
                  type="button"
                  onClick={() => {
                    showAppConfirm({
                      title: 'Reset Account Balance to Rs. 0?',
                      message: `Reset entire balance for "${client.name}" to Rs. 0?\n\nThis will reset opening balance to 0 and clear any unlinked advance payment vouchers for this party.`,
                      confirmText: 'Yes, Reset to Rs. 0',
                      confirmStyle: 'danger',
                      onConfirm: () => {
                        onResetPartyBalance(client);
                        showAppAlert({
                          title: 'Account Reset to Rs. 0',
                          message: `Customer "${client.name}" balance has been cleared to Rs. 0.`,
                          type: 'success'
                        });
                      }
                    });
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
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
                  title="Reset balance to Rs. 0 (Clears opening balance and test vouchers)"
                >
                  <RotateCcw size={11} />
                  <span>Reset to Rs. 0</span>
                </button>
              )}

              {/* Delete Party Button (enforces balance clearance) */}
              <button
                type="button"
                onClick={handleDeletePartyAttempt}
                style={{
                  background: netCalculatedDue === 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: netCalculatedDue === 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                  color: netCalculatedDue === 0 ? '#f87171' : 'var(--text-dim)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={netCalculatedDue === 0 ? "Delete Party (Account is cleared)" : "Cannot delete: Account balance is not Rs. 0"}
              >
                <Trash2 size={11} />
                <span>Delete</span>
              </button>
            </div>

            {client.phone && (
              <div style={{ fontSize: '12px', color: 'var(--gold-light)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={12} />
                <span>{client.phone}</span>
              </div>
            )}

            {client.address && (
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

        {/* Scrollable Modal Content Window */}
        <div 
          className="custom-gold-scrollbar"
          style={{ 
            overflowY: 'auto', 
            overflowX: 'hidden', 
            flex: 1, 
            paddingRight: '6px',
            WebkitOverflowScrolling: 'touch' 
          }}
        >

        {/* Customer Balance Metric Strip (Including Previous Balance) */}
        <div style={{ display: 'grid', gridTemplateColumns: openingBal > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px' }}>
          
          {openingBal > 0 && (
            <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center', borderTop: '3px solid #60a5fa' }}>
              <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Previous Bal</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#60a5fa', marginTop: '2px' }}>
                Rs. {openingBal.toLocaleString()}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                {openingType === 'debit' ? "You'll Get" : "Advance"}
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Billed</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
              Rs. {totalBilledCalc.toLocaleString()}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{client.bills.length} bills</div>
          </div>

          <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Paid</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>
              Rs. {totalPaidCalc.toLocaleString()}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              {totalSentCalc > 0 ? `Net: Rs. ${(totalPaidCalc - totalSentCalc).toLocaleString()}` : 'settled'}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center', borderTop: hasDue ? (isPositiveDue ? '3px solid #f59e0b' : '3px solid #60a5fa') : '3px solid #10b981' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Net Due</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: hasDue ? (isPositiveDue ? '#fbbf24' : '#60a5fa') : '#34d399', marginTop: '2px' }}>
              {hasDue ? (isPositiveDue ? `Rs. ${netCalculatedDue.toLocaleString()}` : `Adv: Rs. ${Math.abs(netCalculatedDue).toLocaleString()}`) : 'Cleared ✓'}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{isPositiveDue ? "You'll Get" : (netCalculatedDue < 0 ? "Credit" : "Zero")}</div>
          </div>
        </div>

        {/* Action Buttons: Add Bill, Receive Payment, Send Amount */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
          
          <button
            onClick={() => setIsAddingBill(!isAddingBill)}
            className="btn-gold"
            style={{ padding: '10px 4px', fontSize: '11.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            {isAddingBill ? <X size={14} /> : <Plus size={14} />}
            <span>{isAddingBill ? 'Close Bill' : '+ Add Bill'}</span>
          </button>

          {/* Receive Payment Button */}
          <button
            onClick={() => {
              setReceiveAmount(client.totalDue > 0 ? String(client.totalDue) : '');
              setIsReceivingPayment(true);
            }}
            className="btn-secondary"
            style={{ 
              padding: '10px 4px', 
              fontSize: '11.5px', 
              borderColor: 'rgba(16, 185, 129, 0.6)', 
              color: '#34d399', 
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '4px' 
            }}
            title="Record payment received from customer (Credit)"
          >
            <ArrowDownCircle size={14} color="#34d399" />
            <span>Receive Pay</span>
          </button>

          {/* Send Amount Button */}
          <button
            onClick={() => {
              setSendAmount(client.totalDue < 0 ? String(Math.abs(client.totalDue)) : '');
              setIsSendingPayment(true);
            }}
            className="btn-secondary"
            style={{ 
              padding: '10px 4px', 
              fontSize: '11.5px', 
              borderColor: 'rgba(239, 68, 68, 0.6)', 
              color: '#f87171', 
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '4px' 
            }}
            title="Send money or refund advance to customer (Debit)"
          >
            <ArrowUpCircle size={14} color="#f87171" />
            <span>Send Amount</span>
          </button>
        </div>

        {/* Statements Row: Download PDF & WhatsApp Statement */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
          {/* Download Ledger PDF Button */}
          <button
            onClick={handleDownloadLedgerPdf}
            disabled={isExportingPdf}
            className="btn-secondary"
            style={{ padding: '10px', fontSize: '12px', borderColor: 'var(--gold-primary)', color: 'var(--gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <FileText size={14} />
            <span>{isExportingPdf ? 'Generating...' : 'Download PDF'}</span>
          </button>

          {/* WhatsApp Statement */}
          <button
            onClick={sendWhatsAppStatement}
            className="btn-secondary"
            style={{ padding: '10px', fontSize: '12px', borderColor: '#25D366', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Share2 size={14} color="#25D366" />
            <span>WhatsApp Statement</span>
          </button>
        </div>

        {/* 1-Tap Settle All Dues Full-Width Bar */}
        <div style={{ marginBottom: '16px' }}>
          {hasDue ? (
            <button
              onClick={handleSettleAll}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '12px',
                background: isPositiveDue 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.35))'
                  : 'linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(37, 99, 235, 0.35))',
                border: isPositiveDue 
                  ? '1px solid rgba(16, 185, 129, 0.6)'
                  : '1px solid rgba(96, 165, 250, 0.6)',
                color: isPositiveDue ? '#34d399' : '#93c5fd',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isPositiveDue 
                  ? '0 4px 15px rgba(16, 185, 129, 0.12)'
                  : '0 4px 15px rgba(96, 165, 250, 0.12)'
              }}
              title={isPositiveDue ? "Record payment to clear outstanding dues to Rs. 0" : "Refund or reset advance balance to Rs. 0"}
            >
              <Check size={16} />
              <span>
                {isPositiveDue 
                  ? `✓ Settle All Outstanding Dues (Receive Rs. ${Math.abs(netCalculatedDue).toLocaleString()})`
                  : `⚖️ Settle Advance Credit (Refund Rs. ${Math.abs(netCalculatedDue).toLocaleString()})`
                }
              </span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '10px' }}>
              <CheckCircle size={16} />
              <span>Account 100% Cleared (Rs. 0 Due)</span>
            </div>
          )}
        </div>

        {/* EDIT PARTY DETAILS FORM MODAL */}
        {isEditingParty && (
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
              maxWidth: '440px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--gold-light)' }}>
                  Edit Customer Details
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingParty(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditParty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Party / Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 11, 7, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 11, 7, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 11, 7, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Previous Balance Section */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-light)', display: 'block', marginBottom: '6px' }}>
                    Previous / Opening Balance (Rs.)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <input
                      type="number"
                      min="0"
                      value={editOpeningBal}
                      onChange={(e) => setEditOpeningBal(e.target.value)}
                      placeholder="0"
                      style={{
                        background: 'rgba(20, 11, 7, 0.9)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '700'
                      }}
                    />
                    <select
                      value={editOpeningType}
                      onChange={(e) => setEditOpeningType(e.target.value)}
                      style={{
                        background: 'rgba(20, 11, 7, 0.9)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}
                    >
                      <option value="debit">Customer Owes You (Pending Dues)</option>
                      <option value="credit">Customer Paid Advance (Deposit)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingParty(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
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
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #e2b265, #ba8339)',
                      border: 'none',
                      color: '#120904',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RECEIVE PAYMENT FORM MODAL */}
        {isReceivingPayment && (
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
              background: '#151c16',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '16px',
              padding: '22px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.85)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '6px', borderRadius: '8px' }}>
                    <ArrowDownCircle size={18} color="#34d399" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                      Receive Payment
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customer: {client.name}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReceivingPayment(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Current Due Highlight Banner */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Current Net Due:</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#34d399' }}>
                  Rs. {Math.abs(client.totalDue).toLocaleString()}
                </span>
              </div>

              <form onSubmit={handleSaveReceivePayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Payment Amount Received (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Enter amount"
                    value={receiveAmount}
                    onChange={(e) => setReceiveAmount(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 15, 12, 0.9)',
                      border: '1px solid rgba(16, 185, 129, 0.5)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#34d399',
                      fontSize: '16px',
                      fontWeight: '800',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {client.totalDue > 0 && (
                      <button
                        type="button"
                        onClick={() => setReceiveAmount(String(client.totalDue))}
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34d399',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '10px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Full Due (Rs. {client.totalDue.toLocaleString()})
                      </button>
                    )}
                    {openingBal > 0 && openingBal !== client.totalDue && (
                      <button
                        type="button"
                        onClick={() => setReceiveAmount(String(openingBal))}
                        style={{
                          background: 'rgba(96, 165, 250, 0.15)',
                          border: '1px solid rgba(96, 165, 250, 0.35)',
                          color: '#60a5fa',
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
                    Payment Method
                  </label>
                  <select
                    value={receiveMethod}
                    onChange={(e) => setReceiveMethod(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 15, 12, 0.9)',
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
                    <option value="Cheque">Cheque / Pay Order</option>
                    <option value="Other">Other / Adjust</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Notes / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Transfer ID, cheque number, received at shop"
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(10, 15, 12, 0.9)',
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
                    onClick={() => setIsReceivingPayment(false)}
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
                      background: 'linear-gradient(135deg, #10b981, #059669)',
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
                    <span>Confirm & Receive</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SEND AMOUNT / REFUND FORM MODAL */}
        {isSendingPayment && (
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
              background: '#1c1111',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              padding: '22px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.85)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '6px', borderRadius: '8px' }}>
                    <ArrowUpCircle size={18} color="#f87171" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                      Send Amount / Refund
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customer: {client.name}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSendingPayment(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Balance Highlight Banner */}
              <div style={{
                background: client.totalDue < 0 ? 'rgba(96, 165, 250, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: client.totalDue < 0 ? '1px solid rgba(96, 165, 250, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  {client.totalDue < 0 ? "Advance Available to Return:" : "Current Outstanding Due:"}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: client.totalDue < 0 ? '#93c5fd' : '#f87171' }}>
                  Rs. {Math.abs(client.totalDue).toLocaleString()} {client.totalDue < 0 ? '(Advance Credit)' : ''}
                </span>
              </div>

              <form onSubmit={handleSaveSendPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Amount to Send / Refund (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Enter amount to give"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 10, 10, 0.9)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#f87171',
                      fontSize: '16px',
                      fontWeight: '800',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {client.totalDue < 0 && (
                      <button
                        type="button"
                        onClick={() => setSendAmount(String(Math.abs(client.totalDue)))}
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
                        Return Full Advance (Rs. {Math.abs(client.totalDue).toLocaleString()})
                      </button>
                    )}
                    {openingBal > 0 && String(openingBal) !== String(Math.abs(client.totalDue)) && (
                      <button
                        type="button"
                        onClick={() => setSendAmount(String(openingBal))}
                        style={{
                          background: 'rgba(96, 165, 250, 0.15)',
                          border: '1px solid rgba(96, 165, 250, 0.35)',
                          color: '#60a5fa',
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
                    value={sendMethod}
                    onChange={(e) => setSendMethod(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 10, 10, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Cash">Cash Handover</option>
                    {activeBanks.map((b, idx) => (
                      <option key={idx} value={`Bank Transfer (${b.bankName})`}>
                        Bank Transfer ({b.bankName} - {b.accountTitle})
                      </option>
                    ))}
                    <option value="Cheque">Cheque Issued</option>
                    <option value="Other">Other Adjustment</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Remarks / Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Return of advance deposit, Cash refund"
                    value={sendNotes}
                    onChange={(e) => setSendNotes(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 10, 10, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '12.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsSendingPayment(false)}
                    style={{
                      flex: 1,
                      padding: '11px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: '600',
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
                      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Confirm & Send Amount
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: '800', color: 'var(--gold-light)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span>Net Total:</span>
                <span>Rs. {netTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Status Switcher */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setPaymentStatus('Pending')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: paymentStatus === 'Pending' ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
                  background: paymentStatus === 'Pending' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: paymentStatus === 'Pending' ? '#fbbf24' : 'var(--text-dim)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Mark Pending (Due)
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
              style={{ width: '100%', padding: '10px', fontSize: '13px' }}
            >
              Save Bill to {client.name}'s Khata
            </button>
          </form>
        )}

        {/* Switcher: In-App Ledger Table vs Bills Cards */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setViewTab('ledger')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: viewTab === 'ledger' ? 'linear-gradient(135deg, #e2b265, #ba8339)' : 'transparent',
                color: viewTab === 'ledger' ? '#120904' : 'var(--text-muted)',
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
                background: viewTab === 'cards' ? 'linear-gradient(135deg, #e2b265, #ba8339)' : 'transparent',
                color: viewTab === 'cards' ? '#120904' : 'var(--text-muted)',
                fontSize: '11.5px',
                fontWeight: viewTab === 'cards' ? '800' : '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Receipt size={12} />
              <span>Bills Cards ({client.bills.length})</span>
            </button>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            {viewTab === 'ledger' ? '📊 Live Running Balance' : '📋 Card View'}
          </span>
        </div>

        {/* 1. IN-APP INTERACTIVE KHATA LEDGER TABLE */}
        {viewTab === 'ledger' && (
          <div style={{
            background: 'rgba(18, 10, 6, 0.95)',
            border: '1px solid var(--gold-border)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '16px',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
          }}>
            <div 
              className="custom-gold-scrollbar"
              style={{ 
                overflowX: 'auto', 
                maxHeight: '380px',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch' 
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', minWidth: '640px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 6 }}>
                  <tr style={{ background: '#25140b', borderBottom: '2px solid var(--gold-border)' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--gold-light)', fontWeight: '700', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--gold-light)', fontWeight: '700', minWidth: '150px' }}>Particulars / Items</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--gold-light)', fontWeight: '700', whiteSpace: 'nowrap' }}>Ref #</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#fbbf24', fontWeight: '700', whiteSpace: 'nowrap' }}>Billed (Rs.)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399', fontWeight: '700', whiteSpace: 'nowrap' }}>Paid (Rs.)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--gold-light)', fontWeight: '700', whiteSpace: 'nowrap' }}>Running Balance</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-dim)', fontWeight: '700', whiteSpace: 'nowrap' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No transactions recorded for this customer yet.
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
                          {row.bill ? (
                            <button
                              type="button"
                              onClick={() => onViewBill(row.bill)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', fontWeight: '700' }}
                            >
                              {row.ref}
                            </button>
                          ) : (row.type === 'payment' || row.type === 'payment_send') ? (
                            <span style={{ color: row.type === 'payment_send' ? '#f87171' : '#34d399', fontWeight: '700', fontSize: '11px' }}>
                              #{row.ref}
                            </span>
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
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '800', whiteSpace: 'nowrap', color: row.balance > 0 ? '#fbbf24' : (row.balance < 0 ? '#60a5fa' : '#34d399') }}>
                          Rs. {Math.abs(row.balance).toLocaleString()} {row.balance > 0 ? '(Due)' : (row.balance < 0 ? '(Adv)' : '✓')}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {row.type === 'opening' ? (
                            <span style={{ fontSize: '10px', color: '#60a5fa', background: 'rgba(96, 165, 250, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              Carried
                            </span>
                          ) : (row.type === 'payment' || row.type === 'payment_send') ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                              <span style={{ 
                                fontSize: '10px', 
                                color: row.type === 'payment_send' ? '#f87171' : '#34d399', 
                                background: row.type === 'payment_send' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                                border: row.type === 'payment_send' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', 
                                padding: '2px 6px', 
                                borderRadius: '6px', 
                                fontWeight: '700' 
                              }}>
                                {row.type === 'payment_send' ? 'Sent 📤' : 'Received ✓'}
                              </span>
                              {onDeletePayment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    showAppConfirm({
                                      title: 'Delete Payment?',
                                      message: `Remove payment of Rs. ${(row.debit || row.credit).toLocaleString()}?`,
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
                              onClick={() => onUpdateBillStatus(row.bill.id, row.status === 'Paid' ? 'Pending' : 'Paid')}
                              style={{
                                background: row.status === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                border: row.status === 'Paid' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                                color: row.status === 'Paid' ? '#34d399' : '#fbbf24',
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
                  <tr style={{ background: '#221108', borderTop: '2px solid var(--gold-border)', fontWeight: '800' }}>
                    <td colSpan="3" style={{ padding: '10px 8px', color: 'var(--gold-light)' }}>
                      Total Billed vs Paid
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                      Rs. {totalDebits.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399', whiteSpace: 'nowrap' }}>
                      Rs. {totalCredits.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: isPositiveDue ? '#fbbf24' : (netCalculatedDue < 0 ? '#60a5fa' : '#34d399'), fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {isPositiveDue ? `Rs. ${netCalculatedDue.toLocaleString()} (Due)` : (netCalculatedDue < 0 ? `Rs. ${Math.abs(netCalculatedDue).toLocaleString()} (Adv)` : 'All Cleared ✓')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 2. TRANSACTION HISTORY & BILLS LIST (CARDS VIEW) */}
        {viewTab === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Account History & Transactions</span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{client.bills.length} bills</span>
          </div>

          {/* Previous Balance Entry Row if set */}
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
                    {openingType === 'debit' ? "Customer balance owed (Debit)" : "Advance credit payment"}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#93c5fd' }}>
                Rs. {openingBal.toLocaleString()}
              </div>
            </div>
          )}

          {client.bills.length === 0 ? (
            <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
              No bills recorded for this customer yet.
            </div>
          ) : (
            client.bills.map((bill) => {
              const isPaid = bill.status === 'Paid';
              const dateStr = new Date(bill.date).toLocaleDateString('en-PK', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={bill.id}
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
                        {bill.id}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>• {dateStr}</span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {bill.items?.map(it => `${it.qty}x ${it.name}`).join(', ') || 'Chocolate order'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '800', color: isPaid ? '#34d399' : '#fbbf24' }}>
                        Rs. {bill.netTotal.toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdateBillStatus(bill.id, isPaid ? 'Pending' : 'Paid')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '10px',
                          fontWeight: '700',
                          color: isPaid ? '#10b981' : '#f59e0b',
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
                      onClick={() => onViewBill(bill)}
                      className="btn-icon"
                      style={{ width: '28px', height: '28px' }}
                      title="View Bill"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Recorded Payment Vouchers (Received & Sent) */}
          {client.payments && client.payments.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold-light)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={13} color="var(--gold-primary)" />
                <span>Payment Vouchers ({client.payments.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {client.payments.map((pmt) => {
                  const isSend = pmt.paymentType === 'send';
                  return (
                    <div
                      key={pmt.id}
                      style={{
                        background: isSend ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: isSend ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: isSend ? '#f87171' : '#34d399' }}>
                            #{pmt.id}
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                            • {new Date(pmt.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {isSend ? 'Sent / Refund' : 'Received'} via {pmt.paymentMethod || 'Cash'}{pmt.notes ? ` • ${pmt.notes}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: isSend ? '#f87171' : '#34d399' }}>
                          {isSend ? '-' : '+'} Rs. {Number(pmt.amount || 0).toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '3px' }}>
                          <span style={{ fontSize: '10px', color: isSend ? '#f87171' : '#34d399', fontWeight: '700' }}>
                            {isSend ? 'Sent 📤' : 'Received ✓'}
                          </span>
                          {onDeletePayment && (
                            <button
                              type="button"
                              onClick={() => {
                                showAppConfirm({
                                  title: 'Delete Payment Voucher?',
                                  message: `Remove payment voucher #${pmt.id} of Rs. ${Number(pmt.amount || 0).toLocaleString()}?`,
                                  confirmText: 'Delete Voucher',
                                  confirmStyle: 'danger',
                                  onConfirm: () => onDeletePayment(pmt.id)
                                });
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                              title="Delete Voucher"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
