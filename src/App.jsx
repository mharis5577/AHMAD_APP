import React, { useState } from 'react';
import MobileHeader from './components/MobileHeader';
import BottomNav from './components/BottomNav';
import PosBilling from './components/PosBilling';
import CreatePurchase from './components/CreatePurchase';
import BillsHistory from './components/BillsHistory';
import CustomerLedger from './components/CustomerLedger';
import BankAccountsCard from './components/BankAccountsCard';
import InvoiceModal from './components/InvoiceModal';
import PurchaseModal from './components/PurchaseModal';
import { 
  getStoredBills, 
  saveStoredBills,
  getStoredPurchases,
  saveStoredPurchases,
  getStoredSuppliers,
  saveStoredSuppliers,
  getStoredBanks,
  saveStoredBanks,
  resetToDemoBills
} from './utils/storage';
import { ShoppingBag, PackagePlus } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [createMode, setCreateMode] = useState('sale'); // 'sale' or 'purchase'

  const [bills, setBills] = useState(getStoredBills);
  const [purchases, setPurchases] = useState(getStoredPurchases);
  const [suppliers, setSuppliers] = useState(getStoredSuppliers);
  const [banks, setBanks] = useState(getStoredBanks);

  const [selectedBillForModal, setSelectedBillForModal] = useState(null);
  const [selectedPurchaseForModal, setSelectedPurchaseForModal] = useState(null);

  // Sales Bills
  const handleBillCreated = (newBill) => {
    const updated = [newBill, ...bills];
    setBills(updated);
    saveStoredBills(updated);
    setSelectedBillForModal(newBill);
  };

  const handleUpdateBillStatus = (billId, newStatus) => {
    const updated = bills.map(b => b.id === billId ? { ...b, status: newStatus } : b);
    setBills(updated);
    saveStoredBills(updated);
  };

  const handleDeleteBill = (billId) => {
    const updated = bills.filter(b => b.id !== billId);
    setBills(updated);
    saveStoredBills(updated);
  };

  // Stock Purchases
  const handlePurchaseCreated = (newPurchase) => {
    const updated = [newPurchase, ...purchases];
    setPurchases(updated);
    saveStoredPurchases(updated);
    setSelectedPurchaseForModal(newPurchase);
  };

  const handleUpdatePurchaseStatus = (purchaseId, newStatus) => {
    const updated = purchases.map(p => p.id === purchaseId ? { ...p, status: newStatus } : p);
    setPurchases(updated);
    saveStoredPurchases(updated);
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

  // Demo Reload
  const handleLoadDemoBills = () => {
    const data = resetToDemoBills();
    setBills(data.bills);
    setPurchases(data.purchases);
    setBanks(data.banks);
    alert('Demo sales bills, supplier purchases, and official bank accounts loaded!');
  };

  const handleDataReloaded = () => {
    setBills(getStoredBills());
    setPurchases(getStoredPurchases());
    setSuppliers(getStoredSuppliers());
    setBanks(getStoredBanks());
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Native Mobile App Header */}
      <MobileHeader onDataReloaded={handleDataReloaded} />

      {/* Main Screen View */}
      <main style={{ flex: 1, paddingBottom: '20px' }}>
        
        {/* CREATE TAB: Switch between Customer Sale Bill and Supplier Purchase */}
        {activeTab === 'pos' && (
          <div>
            {/* Mode Switcher Pill */}
            <div style={{ maxWidth: '650px', margin: '14px auto 0 auto', padding: '0 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(20, 11, 7, 0.9)', padding: '5px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setCreateMode('sale')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: 'none',
                    background: createMode === 'sale' ? 'linear-gradient(135deg, #e2b265, #ba8339)' : 'transparent',
                    color: createMode === 'sale' ? '#120904' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: createMode === 'sale' ? '800' : '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ShoppingBag size={15} />
                  <span>Customer Sale Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateMode('purchase')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: 'none',
                    background: createMode === 'purchase' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                    color: createMode === 'purchase' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: createMode === 'purchase' ? '800' : '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <PackagePlus size={15} />
                  <span>Supplier Purchase</span>
                </button>
              </div>
            </div>

            {createMode === 'sale' ? (
              <PosBilling 
                onBillCreated={handleBillCreated} 
                banks={banks}
                onNavigateToBanks={() => setActiveTab('banks')}
              />
            ) : (
              <CreatePurchase 
                suppliers={suppliers} 
                banks={banks}
                onPurchaseCreated={handlePurchaseCreated}
                onSaveSupplier={handleSaveSupplier}
              />
            )}
          </div>
        )}

        {/* BILLS HISTORY */}
        {activeTab === 'bills' && (
          <BillsHistory 
            bills={bills} 
            onUpdateBillStatus={handleUpdateBillStatus}
            onDeleteBill={handleDeleteBill}
            onViewBill={(bill) => setSelectedBillForModal(bill)}
            onLoadDemoBills={handleLoadDemoBills}
          />
        )}

        {/* LEDGER: Customer Receivables & Supplier Payables */}
        {activeTab === 'ledger' && (
          <CustomerLedger 
            bills={bills} 
            purchases={purchases}
            banks={banks}
            onUpdateBillStatus={handleUpdateBillStatus}
            onUpdatePurchaseStatus={handleUpdatePurchaseStatus}
            onViewBill={(bill) => setSelectedBillForModal(bill)}
            onViewPurchase={(pur) => setSelectedPurchaseForModal(pur)}
            onBillCreated={handleBillCreated}
            onPurchaseCreated={handlePurchaseCreated}
          />
        )}

        {/* BANK ACCOUNTS CARD */}
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
          bill={selectedBillForModal} 
          banks={banks}
          onClose={() => setSelectedBillForModal(null)} 
        />
      )}

      {/* Printable / WhatsApp HD Mobile Purchase Voucher Modal */}
      {selectedPurchaseForModal && (
        <PurchaseModal 
          purchase={selectedPurchaseForModal} 
          onClose={() => setSelectedPurchaseForModal(null)} 
        />
      )}

      {/* Native Mobile Bottom Navigation Bar */}
      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        billsCount={bills.length} 
      />

    </div>
  );
}
