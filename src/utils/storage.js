import { INITIAL_BILLS, INITIAL_PURCHASES, INITIAL_SUPPLIERS, BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';

const KEYS = {
  BILLS: 'tch_bills_v1',
  PURCHASES: 'tch_purchases_v1',
  SUPPLIERS: 'tch_suppliers_v1',
  BANKS: 'tch_banks_v1'
};

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

export const resetToDemoBills = () => {
  try {
    localStorage.setItem(KEYS.BILLS, JSON.stringify(INITIAL_BILLS));
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify(INITIAL_PURCHASES));
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(INITIAL_SUPPLIERS));
    localStorage.setItem(KEYS.BANKS, JSON.stringify(BANK_ACCOUNTS));
    return { bills: INITIAL_BILLS, purchases: INITIAL_PURCHASES, banks: BANK_ACCOUNTS };
  } catch (e) {
    console.error('Failed to reset demo data', e);
    return { bills: INITIAL_BILLS, purchases: INITIAL_PURCHASES, banks: BANK_ACCOUNTS };
  }
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
      onSuccess?.(data);
    } catch (err) {
      onError?.("Invalid backup JSON file");
    }
  };
  reader.onerror = () => onError?.("Error reading file");
  reader.readAsText(file);
};
