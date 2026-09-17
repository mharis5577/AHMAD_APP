import { INITIAL_BILLS, INITIAL_PURCHASES, INITIAL_SUPPLIERS, INITIAL_ITEMS, BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';

const KEYS = {
  BILLS: 'tch_bills_v2',
  PURCHASES: 'tch_purchases_v2',
  SUPPLIERS: 'tch_suppliers_v2',
  BANKS: 'tch_banks_v1',
  ITEMS: 'tch_items_v2',
  PARTIES: 'tch_parties_v2',
  PAYMENTS: 'tch_payments_v2'
};

// Auto-purge any legacy mock storage keys so the app is completely clean
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    ['tch_bills_v1', 'tch_purchases_v1', 'tch_suppliers_v1', 'tch_items_v1'].forEach(k => {
      localStorage.removeItem(k);
    });
  }
} catch (e) {}

export const getStoredBills = () => {
  try {
    const raw = localStorage.getItem(KEYS.BILLS);
    return raw ? JSON.parse(raw) : INITIAL_BILLS;
  } catch (e) {
    console.error('Failed to load bills from storage', e);
    return INITIAL_BILLS;
  }
};

export const saveStoredBills = (bills) => {
  try {
    localStorage.setItem(KEYS.BILLS, JSON.stringify(bills));
  } catch (e) {
    console.error('Failed to save bills', e);
  }
};

export const getStoredPurchases = () => {
  try {
    const raw = localStorage.getItem(KEYS.PURCHASES);
    return raw ? JSON.parse(raw) : INITIAL_PURCHASES;
  } catch (e) {
    console.error('Failed to load purchases from storage', e);
    return INITIAL_PURCHASES;
  }
};

export const saveStoredPurchases = (purchases) => {
  try {
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(purchases));
  } catch (e) {
    console.error('Failed to save purchases', e);
  }
};

export const getStoredSuppliers = () => {
  try {
    const raw = localStorage.getItem(KEYS.SUPPLIERS);
    return raw ? JSON.parse(raw) : INITIAL_SUPPLIERS;
  } catch (e) {
    console.error('Failed to load suppliers', e);
    return INITIAL_SUPPLIERS;
  }
};

export const saveStoredSuppliers = (suppliers) => {
  try {
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
  } catch (e) {
    console.error('Failed to save suppliers', e);
  }
};

export const getStoredBanks = () => {
  try {
    const raw = localStorage.getItem(KEYS.BANKS);
    return raw ? JSON.parse(raw) : BANK_ACCOUNTS;
  } catch (e) {
    console.error('Failed to load banks', e);
    return BANK_ACCOUNTS;
  }
};

export const saveStoredBanks = (banks) => {
  try {
    localStorage.setItem(KEYS.BANKS, JSON.stringify(banks));
  } catch (e) {
    console.error('Failed to save banks', e);
  }
};

export const getStoredItems = () => {
  try {
    const raw = localStorage.getItem(KEYS.ITEMS);
    return raw ? JSON.parse(raw) : INITIAL_ITEMS;
  } catch (e) {
    console.error('Failed to load items from storage', e);
    return INITIAL_ITEMS;
  }
};

export const saveStoredItems = (items) => {
  try {
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save items', e);
  }
};

export const getStoredParties = () => {
  try {
    const raw = localStorage.getItem(KEYS.PARTIES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load parties from storage', e);
    return [];
  }
};

export const saveStoredParties = (parties) => {
  try {
    localStorage.setItem(KEYS.PARTIES, JSON.stringify(parties));
  } catch (e) {
    console.error('Failed to save parties', e);
  }
};

export const getStoredPayments = () => {
  try {
    const raw = localStorage.getItem(KEYS.PAYMENTS);
    let payments = raw ? JSON.parse(raw) : [];

    // Auto-migration: if customer Haris had opening balance adjusted to 949,900 from 1,000,000
    if (typeof window !== 'undefined' && window.localStorage && payments.length === 0) {
      const partiesRaw = localStorage.getItem(KEYS.PARTIES);
      if (partiesRaw) {
        const parties = JSON.parse(partiesRaw);
        const haris = parties.find(p => p.name && p.name.toLowerCase().trim() === 'haris');
        if (haris && Number(haris.openingBalance) === 949900) {
          haris.openingBalance = 1000000;
          localStorage.setItem(KEYS.PARTIES, JSON.stringify(parties));

          const seededPayment = {
            id: 'RCP-1001',
            date: new Date().toISOString(),
            partyId: haris.id,
            partyName: haris.name,
            partyPhone: haris.phone || '03337669709',
            partyType: 'customer',
            amount: 50100,
            paymentMethod: 'Cash',
            notes: 'Payment Received',
            createdAt: new Date().toISOString()
          };
          payments = [seededPayment];
          localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
        }
      }
    }

    return payments;
  } catch (e) {
    console.error('Failed to load payments from storage', e);
    return [];
  }
};

export const saveStoredPayments = (payments) => {
  try {
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
  } catch (e) {
    console.error('Failed to save payments', e);
  }
};

export const clearAllData = () => {
  try {
    localStorage.setItem(KEYS.BILLS, JSON.stringify([]));
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify([]));
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify([]));
    localStorage.setItem(KEYS.ITEMS, JSON.stringify([]));
    localStorage.setItem(KEYS.PARTIES, JSON.stringify([]));
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify([]));
    return { 
      bills: [], 
      purchases: [], 
      suppliers: [], 
      items: [], 
      parties: [],
      payments: [],
      banks: getStoredBanks() 
    };
  } catch (e) {
    console.error('Failed to clear data', e);
    return { bills: [], purchases: [], suppliers: [], items: [], parties: [], payments: [], banks: getStoredBanks() };
  }
};

export const resetToDemoBills = () => {
  return clearAllData();
};

export const exportAllDataJSON = () => {
  const data = {
    appName: "The Chocolate House",
    storeType: "Online Store",
    exportedAt: new Date().toISOString(),
    bills: getStoredBills(),
    purchases: getStoredPurchases(),
    suppliers: getStoredSuppliers(),
    banks: getStoredBanks(),
    items: getStoredItems(),
    parties: getStoredParties(),
    payments: getStoredPayments(),
    business: BUSINESS_INFO
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `TheChocolateHouse_CompleteBackup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importAllDataJSON = (file, onSuccess, onError) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.bills && Array.isArray(data.bills)) {
        saveStoredBills(data.bills);
      }
      if (data.purchases && Array.isArray(data.purchases)) {
        saveStoredPurchases(data.purchases);
      }
      if (data.suppliers && Array.isArray(data.suppliers)) {
        saveStoredSuppliers(data.suppliers);
      }
      if (data.banks && Array.isArray(data.banks)) {
        saveStoredBanks(data.banks);
      }
      if (data.items && Array.isArray(data.items)) {
        saveStoredItems(data.items);
      }
      if (data.parties && Array.isArray(data.parties)) {
        saveStoredParties(data.parties);
      }
      if (data.payments && Array.isArray(data.payments)) {
        saveStoredPayments(data.payments);
      }
      onSuccess?.(data);
    } catch (err) {
      onError?.("Invalid backup JSON file");
    }
  };
  reader.onerror = () => onError?.("Error reading file");
  reader.readAsText(file);
};
