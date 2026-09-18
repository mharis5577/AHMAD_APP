import React, { useState, useMemo, useEffect } from 'react';
import MobileHeader from './components/MobileHeader';
import BottomNav from './components/BottomNav';
import DashboardView from './components/DashboardView';
import ItemsInventory from './components/ItemsInventory';
import PosBilling from './components/PosBilling';
import CreatePurchase from './components/CreatePurchase';
import BillsHistory from './components/BillsHistory';
import CustomerLedger from './components/CustomerLedger';
import BankAccountsCard from './components/BankAccountsCard';
import InvoiceModal from './components/InvoiceModal';
import PurchaseModal from './components/PurchaseModal';
import AppDialog from './components/AppDialog';
import { showAppAlert, showAppConfirm } from './utils/dialog';
import { 
  getStoredBills, 
  saveStoredBills,
  getStoredPurchases,
  saveStoredPurchases,
  getStoredSuppliers,
  saveStoredSuppliers,
  getStoredBanks,
  saveStoredBanks,
  getStoredItems,
  saveStoredItems,
  getStoredParties,
  saveStoredParties,
  getStoredPayments,
  saveStoredPayments,
  clearAllData
} from './utils/storage';
import { ShoppingBag, PackagePlus, History } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // Vyapar default is Dashboard
  const [createMode, setCreateMode] = useState('sale'); // 'sale', 'purchase', or 'history'

  const [bills, setBills] = useState(getStoredBills);
  const [purchases, setPurchases] = useState(getStoredPurchases);
  const [suppliers, setSuppliers] = useState(getStoredSuppliers);
  const [banks, setBanks] = useState(getStoredBanks);
  const [items, setItems] = useState(getStoredItems);
  const [parties, setParties] = useState(getStoredParties);
  const [payments, setPayments] = useState(getStoredPayments);

  const [selectedBillForModal, setSelectedBillForModal] = useState(null);
  const [selectedPurchaseForModal, setSelectedPurchaseForModal] = useState(null);

  // Self-healing migration: ensure all existing 'Paid' bills and purchases have a payment voucher in payments
  useEffect(() => {
    let hasChanges = false;
    const missingPayments = [];

    bills.forEach(b => {
      if (b.status === 'Paid') {
        const hasPayment = payments.some(p => p.billId === b.id || (p.notes && p.notes.includes(b.id)));
        if (!hasPayment) {
          hasChanges = true;
          missingPayments.push({
            id: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
            date: b.date || new Date().toISOString(),
            partyId: b.customerPhone || b.customerName,
            partyName: b.customerName,
            partyPhone: b.customerPhone || '',
            partyType: 'customer',
            amount: Number(b.netTotal) || 0,
            paymentMethod: b.paymentMethod || 'Cash',
            notes: `Sale Bill #${b.id}`,
            billId: b.id,
            createdAt: b.date || new Date().toISOString()
          });
        }
      }
    });

    purchases.forEach(pur => {
      if (pur.status === 'Paid') {
        const hasPayment = payments.some(p => p.purchaseId === pur.id || (p.notes && p.notes.includes(pur.id)));
        if (!hasPayment) {
          hasChanges = true;
          missingPayments.push({
            id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
            date: pur.date || new Date().toISOString(),
            partyId: pur.supplierPhone || pur.supplierName,
            partyName: pur.supplierName,
            partyPhone: pur.supplierPhone || '',
            partyType: 'supplier',
            amount: Number(pur.netTotal) || 0,
            paymentMethod: pur.paidFromBank || 'Cash',
            notes: `Purchase #${pur.id}`,
            purchaseId: pur.id,
            createdAt: pur.date || new Date().toISOString()
          });
        }
      }
    });

    if (hasChanges && missingPayments.length > 0) {
      const merged = [...missingPayments, ...payments];
      setPayments(merged);
      saveStoredPayments(merged);
    }
  }, []);

  // Low stock counter for bottom nav badge
  const lowStockCount = useMemo(() => {
    return items.filter(it => (Number(it.stock) || 0) <= (Number(it.minStock) || 5)).length;
  }, [items]);

  // Inventory Items updater
  const handleUpdateItems = (updatedItems) => {
    setItems(updatedItems);
    saveStoredItems(updatedItems);
  };

  // Party Management (Vyapar Khata)
  const handleSaveParty = (newParty) => {
    const existingIndex = parties.findIndex(p => 
      (newParty.id && p.id === newParty.id) || 
      (newParty.phone && p.phone && p.phone === newParty.phone) ||
      (p.name.toLowerCase().trim() === newParty.name.toLowerCase().trim())
    );

    let updated;
    if (existingIndex >= 0) {
      updated = [...parties];
      updated[existingIndex] = { ...updated[existingIndex], ...newParty };
    } else {
      updated = [newParty, ...parties];
    }
    setParties(updated);
    saveStoredParties(updated);
  };

  const handleUpdateParty = (oldParty, updatedParty) => {
    // 1. Update party in persistent parties list
    const updatedParties = parties.map(p => {
      const match = (p.id && (p.id === oldParty.partyId || p.id === oldParty.id || p.id === updatedParty.id)) ||
                    p.name.toLowerCase().trim() === oldParty.name.toLowerCase().trim() ||
                    (oldParty.phone && p.phone === oldParty.phone);
      return match ? { ...p, ...updatedParty } : p;
    });

    // If it wasn't in parties, add it
    const exists = updatedParties.some(p => p.name.toLowerCase().trim() === updatedParty.name.toLowerCase().trim());
    const finalParties = exists ? updatedParties : [updatedParty, ...updatedParties];
    setParties(finalParties);
    saveStoredParties(finalParties);

    // 2. Cascade rename into bills if customer
    if (oldParty.name !== updatedParty.name || oldParty.phone !== updatedParty.phone) {
      const updatedBills = bills.map(b => {
        const isMatch = (b.customerName && b.customerName.toLowerCase().trim() === oldParty.name.toLowerCase().trim()) ||
                        (oldParty.phone && b.customerPhone === oldParty.phone);
        if (isMatch) {
          return {
            ...b,
            customerName: updatedParty.name,
            customerPhone: updatedParty.phone || b.customerPhone
          };
        }
        return b;
      });
      setBills(updatedBills);
      saveStoredBills(updatedBills);

      // 3. Cascade rename into purchases if supplier
      const updatedPurchases = purchases.map(p => {
        const isMatch = (p.supplierName && p.supplierName.toLowerCase().trim() === oldParty.name.toLowerCase().trim()) ||
                        (oldParty.phone && p.supplierPhone === oldParty.phone);
        if (isMatch) {
          return {
            ...p,
            supplierName: updatedParty.name,
            supplierPhone: updatedParty.phone || p.supplierPhone
          };
        }
        return p;
      });
      setPurchases(updatedPurchases);
      saveStoredPurchases(updatedPurchases);

      // Also cascade to suppliers list if supplier
      const updatedSuppliers = suppliers.map(s => {
        const isMatch = s.name.toLowerCase().trim() === oldParty.name.toLowerCase().trim() ||
                        (oldParty.phone && s.phone === oldParty.phone);
        if (isMatch) {
          return {
            ...s,
            name: updatedParty.name,
            phone: updatedParty.phone || s.phone,
            bank: updatedParty.bank || s.bank
          };
        }
        return s;
      });
      setSuppliers(updatedSuppliers);
      saveStoredSuppliers(updatedSuppliers);
    }
  };

  const handleDeleteParty = (partyToDelete) => {
    const updated = parties.filter(p => {
      const match = (p.id && (p.id === partyToDelete.partyId || p.id === partyToDelete.id)) ||
                    p.name.toLowerCase().trim() === partyToDelete.name.toLowerCase().trim();
      return !match;
    });
    setParties(updated);
    saveStoredParties(updated);
  };

  // Sales Bills
  const handleBillCreated = (newBill) => {
    const updated = [newBill, ...bills];
    setBills(updated);
    saveStoredBills(updated);

    // Auto-register customer into parties if not already existing
    let partyKey = '';
    if (newBill.customerName && newBill.customerName.trim()) {
      const custName = newBill.customerName.trim();
      const existing = parties.find(p => 
        p.name.toLowerCase().trim() === custName.toLowerCase() ||
        (newBill.customerPhone && p.phone && p.phone === newBill.customerPhone.trim())
      );
      if (existing) {
        partyKey = existing.id || existing.phone || existing.name;
      } else {
        const newPartyId = `pty_${Date.now()}`;
        partyKey = newPartyId;
        const newParty = {
          id: newPartyId,
          name: custName,
          phone: (newBill.customerPhone || '').trim(),
          address: (newBill.deliveryAddress || '').trim(),
          type: 'customer',
          openingBalance: 0,
          openingBalanceType: 'debit',
          createdAt: new Date().toISOString()
        };
        const updatedParties = [newParty, ...parties];
        setParties(updatedParties);
        saveStoredParties(updatedParties);
      }
    }

    // Automatically record payment receipt voucher if bill was marked 'Paid' at checkout
    if (newBill.status === 'Paid') {
      const newPayment = {
        id: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
        date: newBill.date || new Date().toISOString(),
        partyId: partyKey || newBill.customerPhone || newBill.customerName,
        partyName: newBill.customerName,
        partyPhone: newBill.customerPhone || '',
        partyType: 'customer',
        amount: Number(newBill.netTotal) || 0,
        paymentMethod: newBill.paymentMethod || 'Cash',
        notes: `Full Payment for Bill #${newBill.id}`,
        billId: newBill.id,
        createdAt: new Date().toISOString()
      };
      const updatedPayments = [newPayment, ...payments];
      setPayments(updatedPayments);
      saveStoredPayments(updatedPayments);
    }

    // Automatically deduct sold item quantities from inventory stock
    if (newBill.items && Array.isArray(newBill.items)) {
      const updatedItems = items.map(it => {
        const sold = newBill.items.find(bi => bi.name.toLowerCase().trim() === it.name.toLowerCase().trim());
        if (sold) {
          const qty = Number(sold.qty) || 1;
          return { ...it, stock: Math.max(0, (Number(it.stock) || 0) - qty) };
        }
        return it;
      });
      setItems(updatedItems);
      saveStoredItems(updatedItems);
    }

    setSelectedBillForModal(newBill);
  };

  const handleUpdateBillStatus = (billId, newStatus) => {
    const bill = bills.find(b => b.id === billId);
    const updated = bills.map(b => b.id === billId ? { ...b, status: newStatus } : b);
    setBills(updated);
    saveStoredBills(updated);

    if (bill) {
      if (newStatus === 'Paid') {
        const hasPayment = payments.some(p => p.billId === billId);
        if (!hasPayment) {
          const newPayment = {
            id: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString(),
            partyId: bill.customerPhone || bill.customerName,
            partyName: bill.customerName,
            partyPhone: bill.customerPhone || '',
            partyType: 'customer',
            amount: Number(bill.netTotal) || 0,
            paymentMethod: bill.paymentMethod || 'Cash',
            notes: `Full Payment for Bill #${bill.id}`,
            billId: bill.id,
            createdAt: new Date().toISOString()
          };
          const updatedPayments = [newPayment, ...payments];
          setPayments(updatedPayments);
          saveStoredPayments(updatedPayments);
        }
      } else if (newStatus === 'Pending') {
        const updatedPayments = payments.filter(p => p.billId !== billId);
        setPayments(updatedPayments);
        saveStoredPayments(updatedPayments);
      }
    }
  };

  const handleDeleteBill = (billId) => {
    const billToDelete = bills.find(b => b.id === billId);
    if (billToDelete && billToDelete.items && Array.isArray(billToDelete.items)) {
      const updatedItems = items.map(it => {
        const sold = billToDelete.items.find(bi => bi.name.toLowerCase().trim() === it.name.toLowerCase().trim());
        if (sold) {
          const qty = Number(sold.qty) || 1;
          return { ...it, stock: (Number(it.stock) || 0) + qty };
        }
        return it;
      });
      setItems(updatedItems);
      saveStoredItems(updatedItems);
    }
    const updated = bills.filter(b => b.id !== billId);
    setBills(updated);
    saveStoredBills(updated);

    // Also remove any payment voucher linked to this bill
    const updatedPayments = payments.filter(p => p.billId !== billId);
    setPayments(updatedPayments);
    saveStoredPayments(updatedPayments);
  };

  // Stock Purchases
  const handlePurchaseCreated = (newPurchase) => {
    const updated = [newPurchase, ...purchases];
    setPurchases(updated);
    saveStoredPurchases(updated);

    // Auto-register supplier into parties if not already existing
    let supKey = '';
    if (newPurchase.supplierName && newPurchase.supplierName.trim()) {
      const supName = newPurchase.supplierName.trim();
      const existing = parties.find(p => 
        p.name.toLowerCase().trim() === supName.toLowerCase()
      );
      if (existing) {
        supKey = existing.id || existing.phone || existing.name;
      } else {
        const newSupId = `pty_${Date.now()}`;
        supKey = newSupId;
        const newParty = {
          id: newSupId,
          name: supName,
          phone: (newPurchase.supplierPhone || '').trim(),
          type: 'supplier',
          bank: newPurchase.supplierBank || {},
          openingBalance: 0,
          openingBalanceType: 'credit',
          createdAt: new Date().toISOString()
        };
        const updatedParties = [newParty, ...parties];
        setParties(updatedParties);
        saveStoredParties(updatedParties);
      }
    }

    // Automatically record payment voucher if purchase was marked 'Paid'
    if (newPurchase.status === 'Paid') {
      const newPayment = {
        id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
        date: newPurchase.date || new Date().toISOString(),
        partyId: supKey || newPurchase.supplierPhone || newPurchase.supplierName,
        partyName: newPurchase.supplierName,
        partyPhone: newPurchase.supplierPhone || '',
        partyType: 'supplier',
        amount: Number(newPurchase.netTotal) || 0,
        paymentMethod: newPurchase.paidFromBank || 'Cash',
        notes: `Payment for Purchase #${newPurchase.id}`,
        purchaseId: newPurchase.id,
        createdAt: new Date().toISOString()
      };
      const updatedPayments = [newPayment, ...payments];
      setPayments(updatedPayments);
      saveStoredPayments(updatedPayments);
    }

    // Automatically increase inventory stock from supplier purchase
    if (newPurchase.items && Array.isArray(newPurchase.items)) {
      const updatedItems = items.map(it => {
        const purItem = newPurchase.items.find(pi => pi.name.toLowerCase().trim() === it.name.toLowerCase().trim());
        if (purItem) {
          const qty = Number(purItem.qty) || 1;
          return { ...it, stock: (Number(it.stock) || 0) + qty };
        }
        return it;
      });
      setItems(updatedItems);
      saveStoredItems(updatedItems);
    }

    setSelectedPurchaseForModal(newPurchase);
  };

  const handleUpdatePurchaseStatus = (purchaseId, newStatus) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    const updated = purchases.map(p => p.id === purchaseId ? { ...p, status: newStatus } : p);
    setPurchases(updated);
    saveStoredPurchases(updated);

    if (purchase) {
      if (newStatus === 'Paid') {
        const hasPayment = payments.some(p => p.purchaseId === purchaseId);
        if (!hasPayment) {
          const newPayment = {
            id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString(),
            partyId: purchase.supplierPhone || purchase.supplierName,
            partyName: purchase.supplierName,
            partyPhone: purchase.supplierPhone || '',
            partyType: 'supplier',
            amount: Number(purchase.netTotal) || 0,
            paymentMethod: purchase.paidFromBank || 'Cash',
            notes: `Payment for Purchase #${purchase.id}`,
            purchaseId: purchase.id,
            createdAt: new Date().toISOString()
          };
          const updatedPayments = [newPayment, ...payments];
          setPayments(updatedPayments);
          saveStoredPayments(updatedPayments);
        }
      } else if (newStatus === 'Pending') {
        const updatedPayments = payments.filter(p => p.purchaseId !== purchaseId);
        setPayments(updatedPayments);
        saveStoredPayments(updatedPayments);
      }
    }
  };

  const handleDeletePurchase = (purchaseId) => {
    // Subtract the purchased stock from inventory (reverse what was added during purchase creation)
    const purchaseToDelete = purchases.find(p => p.id === purchaseId);
    if (purchaseToDelete && purchaseToDelete.items && Array.isArray(purchaseToDelete.items)) {
      const updatedItems = items.map(it => {
        const purItem = purchaseToDelete.items.find(pi => pi.name.toLowerCase().trim() === it.name.toLowerCase().trim());
        if (purItem) {
          const qty = Number(purItem.qty) || 1;
          return { ...it, stock: Math.max(0, (Number(it.stock) || 0) - qty) };
        }
        return it;
      });
      setItems(updatedItems);
      saveStoredItems(updatedItems);
    }

    const updated = purchases.filter(p => p.id !== purchaseId);
    setPurchases(updated);
    saveStoredPurchases(updated);

    const updatedPayments = payments.filter(p => p.purchaseId !== purchaseId);
    setPayments(updatedPayments);
    saveStoredPayments(updatedPayments);
  };

  // Reset Party Balance to Rs. 0 (Clean reset of advance credit or dues)
  const handleResetPartyBalance = (party) => {
    // 1. Reset opening balance of party to 0
    const updatedParties = parties.map(p => {
      const match = (p.id && (p.id === party.partyId || p.id === party.id)) ||
                    p.name.toLowerCase().trim() === party.name.toLowerCase().trim();
      return match ? { ...p, openingBalance: 0, openingBalanceType: 'debit' } : p;
    });
    setParties(updatedParties);
    saveStoredParties(updatedParties);

    // 2. Remove all non-bill payment vouchers for this party
    const updatedPayments = payments.filter(pmt => {
      const matchParty = (pmt.partyId && (pmt.partyId === party.partyId || pmt.partyId === party.id || pmt.partyId === party.key)) ||
                         (pmt.partyName && pmt.partyName.toLowerCase().trim() === party.name.toLowerCase().trim());
      // Keep only payments tied to an existing bill if any; clear unlinked advance payments
      return !matchParty;
    });
    setPayments(updatedPayments);
    saveStoredPayments(updatedPayments);
  };

  const handleSaveSupplier = (newSup) => {
    const existing = suppliers.find(s => s.name.toLowerCase() === newSup.name.toLowerCase());
    if (existing) {
      const updated = suppliers.map(s => s.id === existing.id ? { ...s, ...newSup } : s);
      setSuppliers(updated);
      saveStoredSuppliers(updated);
    } else {
      const updated = [newSup, ...suppliers];
      setSuppliers(updated);
      saveStoredSuppliers(updated);
    }
  };

  // Bank Accounts Management
  const handleUpdateBanks = (updatedBanks) => {
    setBanks(updatedBanks);
    saveStoredBanks(updatedBanks);
  };

  // Payment Vouchers Management (Khata Cash & Bank Receipts / Payments)
  const handlePaymentCreated = (newPayment) => {
    const updated = [newPayment, ...payments];
    setPayments(updated);
    saveStoredPayments(updated);
  };

  const handleDeletePayment = (paymentId) => {
    const updated = payments.filter(p => p.id !== paymentId);
    setPayments(updated);
    saveStoredPayments(updated);
  };

  // Clear All Mock Data & Transactions
  const handleClearAllData = async () => {
    showAppConfirm({
      title: 'Reset All Data?',
      message: 'Are you sure you want to delete all bills, purchases, suppliers, items, and parties? This cannot be undone.',
      confirmText: 'Delete All',
      confirmStyle: 'danger',
      onConfirm: () => {
        const data = clearAllData();
        setBills(data.bills);
        setPurchases(data.purchases);
        setSuppliers(data.suppliers);
        setItems(data.items);
        setParties(data.parties);
        setPayments(data.payments);
        showAppAlert({
          title: 'Data Cleared',
          message: 'All records and parties have been deleted successfully.',
          type: 'success'
        });
      }
    });
  };

  const handleDataReloaded = () => {
    setBills(getStoredBills());
    setPurchases(getStoredPurchases());
    setSuppliers(getStoredSuppliers());
    setBanks(getStoredBanks());
    setItems(getStoredItems());
    setParties(getStoredParties());
    setPayments(getStoredPayments());
  };

  // Dashboard shortcut navigation
  const handleNavigateFromDashboard = (tabId, mode = null) => {
    setActiveTab(tabId);
    if (mode) {
      setCreateMode(mode);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Native Mobile App Header */}
      <MobileHeader onDataReloaded={handleDataReloaded} />

      {/* Main Screen View */}
      <main style={{ flex: 1, paddingBottom: '20px' }}>
        
        {/* 1. VYAPAR DASHBOARD & DAYBOOK */}
        {activeTab === 'dashboard' && (
          <DashboardView
            bills={bills}
            purchases={purchases}
            items={items}
            parties={parties}
            payments={payments}
            onNavigateTab={handleNavigateFromDashboard}
            onViewBill={(bill) => setSelectedBillForModal(bill)}
            onViewPurchase={(pur) => setSelectedPurchaseForModal(pur)}
          />
        )}

        {/* 2. PARTIES KHATA: Customer Receivables & Supplier Payables */}
        {activeTab === 'ledger' && (
          <CustomerLedger 
            bills={bills} 
            purchases={purchases}
            banks={banks}
            parties={parties}
            payments={payments}
            onPaymentCreated={handlePaymentCreated}
            onDeletePayment={handleDeletePayment}
            onResetPartyBalance={handleResetPartyBalance}
            onUpdateBillStatus={handleUpdateBillStatus}
            onUpdatePurchaseStatus={handleUpdatePurchaseStatus}
            onViewBill={(bill) => setSelectedBillForModal(bill)}
            onViewPurchase={(pur) => setSelectedPurchaseForModal(pur)}
            onBillCreated={handleBillCreated}
            onPurchaseCreated={handlePurchaseCreated}
            onSaveParty={handleSaveParty}
            onUpdateParty={handleUpdateParty}
            onDeleteParty={handleDeleteParty}
            onDataReloaded={handleDataReloaded}
          />
        )}

        {/* 3. ITEMS & STOCK INVENTORY */}
        {activeTab === 'items' && (
          <ItemsInventory
            items={items}
            onUpdateItems={handleUpdateItems}
          />
        )}

        {/* 4. BILLING & POS: Switch between Customer Sale Bill, Supplier Purchase, and History */}
        {activeTab === 'pos' && (
          <div>
            {/* Mode Switcher Pill */}
            <div style={{ maxWidth: '650px', margin: '14px auto 0 auto', padding: '0 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', background: 'rgba(20, 11, 7, 0.9)', padding: '5px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                
                {/* Sale Bill Button */}
                <button
                  type="button"
                  onClick={() => setCreateMode('sale')}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: 'none',
                    background: createMode === 'sale' ? 'linear-gradient(135deg, #e2b265, #ba8339)' : 'transparent',
                    color: createMode === 'sale' ? '#120904' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: createMode === 'sale' ? '800' : '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ShoppingBag size={14} />
                  <span>+ Sale</span>
                </button>

                {/* Purchase Button */}
                <button
                  type="button"
                  onClick={() => setCreateMode('purchase')}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: 'none',
                    background: createMode === 'purchase' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                    color: createMode === 'purchase' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: createMode === 'purchase' ? '800' : '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <PackagePlus size={14} />
                  <span>+ Purchase</span>
                </button>

                {/* History Button */}
                <button
                  type="button"
                  onClick={() => setCreateMode('history')}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: 'none',
                    background: createMode === 'history' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    color: createMode === 'history' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: createMode === 'history' ? '800' : '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <History size={14} />
                  <span>Bills History</span>
                </button>

              </div>
            </div>

            {createMode === 'sale' && (
              <PosBilling 
                onBillCreated={handleBillCreated} 
                banks={banks}
                items={items}
                parties={parties}
                bills={bills}
                payments={payments}
                onSaveParty={handleSaveParty}
                onNavigateToBanks={() => setActiveTab('banks')}
              />
            )}

            {createMode === 'purchase' && (
              <CreatePurchase 
                suppliers={suppliers} 
                banks={banks}
                items={items}
                parties={parties}
                purchases={purchases}
                payments={payments}
                onPurchaseCreated={handlePurchaseCreated}
                onSaveSupplier={handleSaveSupplier}
              />
            )}

            {createMode === 'history' && (
              <BillsHistory 
                bills={bills} 
                onUpdateBillStatus={handleUpdateBillStatus}
                onDeleteBill={handleDeleteBill}
                onViewBill={(bill) => setSelectedBillForModal(bill)}
              />
            )}
          </div>
        )}

        {/* 5. BANK ACCOUNTS & SETTINGS */}
        {activeTab === 'banks' && (
          <BankAccountsCard 
            banks={banks}
            onUpdateBanks={handleUpdateBanks}
          />
        )}
      </main>

      {/* Printable / WhatsApp HD Mobile Invoice Modal */}
      {selectedBillForModal && (
        <InvoiceModal 
          bill={bills.find(b => b.id === selectedBillForModal.id) || selectedBillForModal} 
          banks={banks}
          onClose={() => setSelectedBillForModal(null)} 
          onUpdateBillStatus={handleUpdateBillStatus}
        />
      )}

      {/* Printable / WhatsApp HD Mobile Purchase Voucher Modal */}
      {selectedPurchaseForModal && (
        <PurchaseModal 
          purchase={purchases.find(p => p.id === selectedPurchaseForModal.id) || selectedPurchaseForModal} 
          onClose={() => setSelectedPurchaseForModal(null)} 
          onUpdatePurchaseStatus={handleUpdatePurchaseStatus}
        />
      )}

      {/* Native Mobile Bottom Navigation Bar (5 Vyapar Tabs) */}
      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        billsCount={bills.length} 
        lowStockCount={lowStockCount}
      />

      {/* Global In-App Alert & Confirmation Dialog */}
      <AppDialog />

    </div>
  );
}
