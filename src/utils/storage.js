import { INITIAL_BILLS, INITIAL_PURCHASES, INITIAL_SUPPLIERS, INITIAL_ITEMS, BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';
import {
  SAMPLE_MEMO_ITEMS,
  SAMPLE_MEMO_PARTIES,
  SAMPLE_MEMO_BILLS,
  SAMPLE_MEMO_PURCHASES,
  SAMPLE_MEMO_PAYMENTS,
  SAMPLE_MEMO_MANUAL_ENTRIES
} from '../data/sampleMemoData';

export const ACCOUNT_MAIN = 'main';
export const ACCOUNT_PREVIOUS = 'previous';

export const DEFAULT_ACCOUNTS = [
  {
    id: ACCOUNT_MAIN,
    name: 'Main Store Account',
    description: 'Active store billing, sales, inventory & past app records',
    badge: 'Store Account',
    icon: 'store'
  }
];

const ACTIVE_ACCOUNT_KEY = 'tch_active_account_v1';

export const getActiveAccountId = () => {
  return ACCOUNT_MAIN;
};

export const setActiveAccountId = (accId) => {
  try {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, ACCOUNT_MAIN);
  } catch (e) {
    console.error('Failed to set active account', e);
  }
};

// Merges any data previously imported into the 'previous' profile into the Main Account
export const migratePreviousDataToMainAccount = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { migratedBillsCount: 0, migratedPartiesCount: 0 };
    
    // Check if previous data exists
    const rawPrevBills = localStorage.getItem('tch_previous_bills_v2');
    const rawPrevParties = localStorage.getItem('tch_previous_parties_v2');
    const rawPrevPurchases = localStorage.getItem('tch_previous_purchases_v2');
    const rawPrevPayments = localStorage.getItem('tch_previous_payments_v2');
    const rawPrevManual = localStorage.getItem('tch_previous_manual_entries_v2');

    let migratedBillsCount = 0;
    let migratedPartiesCount = 0;

    if (rawPrevBills) {
      const prevBills = JSON.parse(rawPrevBills);
      if (Array.isArray(prevBills) && prevBills.length > 0) {
        const mainBills = getStoredBills(ACCOUNT_MAIN);
        const existingIds = new Set(mainBills.map(b => String(b.id)));
        const toAdd = prevBills
          .filter(b => !existingIds.has(String(b.id)))
          .map(b => ({ ...b, isImported: true, isImportedFromPrevApp: true }));
        if (toAdd.length > 0) {
          saveStoredBills([...toAdd, ...mainBills], ACCOUNT_MAIN);
          migratedBillsCount = toAdd.length;
        }
      }
    }

    if (rawPrevParties) {
      const prevParties = JSON.parse(rawPrevParties);
      if (Array.isArray(prevParties) && prevParties.length > 0) {
        const mainParties = getStoredParties(ACCOUNT_MAIN);
        const partyMap = new Map();
        mainParties.forEach(p => partyMap.set((p.name || '').toLowerCase().trim(), p));
        prevParties.forEach(p => {
          const key = (p.name || '').toLowerCase().trim();
          if (key && !partyMap.has(key)) {
            partyMap.set(key, { ...p, isImported: true });
            migratedPartiesCount++;
          }
        });
        saveStoredParties(Array.from(partyMap.values()), ACCOUNT_MAIN);
      }
    }

    if (rawPrevPurchases) {
      const prevPurchases = JSON.parse(rawPrevPurchases);
      if (Array.isArray(prevPurchases) && prevPurchases.length > 0) {
        const mainPurchases = getStoredPurchases(ACCOUNT_MAIN);
        const existingIds = new Set(mainPurchases.map(p => String(p.id)));
        const toAdd = prevPurchases.filter(p => !existingIds.has(String(p.id)));
        if (toAdd.length > 0) {
          saveStoredPurchases([...toAdd, ...mainPurchases], ACCOUNT_MAIN);
        }
      }
    }

    if (rawPrevPayments) {
      const prevPayments = JSON.parse(rawPrevPayments);
      if (Array.isArray(prevPayments) && prevPayments.length > 0) {
        const mainPayments = getStoredPayments(ACCOUNT_MAIN);
        const existingIds = new Set(mainPayments.map(p => String(p.id)));
        const toAdd = prevPayments.filter(p => !existingIds.has(String(p.id)));
        if (toAdd.length > 0) {
          saveStoredPayments([...toAdd, ...mainPayments], ACCOUNT_MAIN);
        }
      }
    }

    if (rawPrevManual) {
      const prevManual = JSON.parse(rawPrevManual);
      if (Array.isArray(prevManual) && prevManual.length > 0) {
        const mainManual = getStoredManualEntries(ACCOUNT_MAIN);
        const existingIds = new Set(mainManual.map(m => String(m.id)));
        const toAdd = prevManual.filter(m => !existingIds.has(String(m.id)));
        if (toAdd.length > 0) {
          saveStoredManualEntries([...toAdd, ...mainManual], ACCOUNT_MAIN);
        }
      }
    }

    // Clean up previous storage keys so they don't duplicate
    ['tch_previous_bills_v2', 'tch_previous_parties_v2', 'tch_previous_purchases_v2', 'tch_previous_payments_v2', 'tch_previous_manual_entries_v2'].forEach(k => {
      localStorage.removeItem(k);
    });

    return { migratedBillsCount, migratedPartiesCount };
  } catch (err) {
    console.error('Auto migration failed:', err);
    return { migratedBillsCount: 0, migratedPartiesCount: 0 };
  }
};

// Returns storage key scoped by account.
// For 'main', we use the original keys to ensure 100% backward compatibility with existing data.
const getScopedKey = (entity, accId = getActiveAccountId()) => {
  if (accId === ACCOUNT_MAIN) {
    switch (entity) {
      case 'BILLS': return 'tch_bills_v2';
      case 'PURCHASES': return 'tch_purchases_v2';
      case 'SUPPLIERS': return 'tch_suppliers_v2';
      case 'BANKS': return 'tch_banks_v1';
      case 'ITEMS': return 'tch_items_v2';
      case 'PARTIES': return 'tch_parties_v2';
      case 'PAYMENTS': return 'tch_payments_v2';
      case 'MANUAL_ENTRIES': return 'tch_manual_entries_v2';
      default: return `tch_${entity}_v2`;
    }
  }
  return `tch_${accId}_${entity.toLowerCase()}_v2`;
};

// Auto-purge any legacy mock storage keys
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    ['tch_bills_v1', 'tch_purchases_v1', 'tch_suppliers_v1', 'tch_items_v1'].forEach(k => {
      localStorage.removeItem(k);
    });
  }
} catch (e) {}

// Bills
export const getStoredBills = (accId = getActiveAccountId()) => {
  try {
    const raw = localStorage.getItem(getScopedKey('BILLS', accId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load bills from storage', e);
    return [];
  }
};

export const saveStoredBills = (bills, accId = getActiveAccountId()) => {
  try {
    localStorage.setItem(getScopedKey('BILLS', accId), JSON.stringify(bills));
  } catch (e) {
    console.error('Failed to save bills', e);
  }
};

// Purchases
export const getStoredPurchases = (accId = getActiveAccountId()) => {
  try {
    const raw = localStorage.getItem(getScopedKey('PURCHASES', accId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load purchases from storage', e);
    return [];
  }
};

export const saveStoredPurchases = (purchases, accId = getActiveAccountId()) => {
  try {
    localStorage.setItem(getScopedKey('PURCHASES', accId), JSON.stringify(purchases));
  } catch (e) {
    console.error('Failed to save purchases', e);
  }
};

// Suppliers
export const getStoredSuppliers = (accId = getActiveAccountId()) => {
  try {
    const raw = localStorage.getItem(getScopedKey('SUPPLIERS', accId));
    return raw ? JSON.parse(raw) : (accId === ACCOUNT_MAIN ? INITIAL_SUPPLIERS : []);
  } catch (e) {
    console.error('Failed to load suppliers', e);
    return [];
  }
};

export const saveStoredSuppliers = (suppliers, accId = getActiveAccountId()) => {
  try {
    localStorage.setItem(getScopedKey('SUPPLIERS', accId), JSON.stringify(suppliers));
  } catch (e) {
    console.error('Failed to save suppliers', e);
  }
};

// Banks
export const getStoredBanks = (accId = getActiveAccountId()) => {
  try {
    const raw = localStorage.getItem(getScopedKey('BANKS', accId));
    return raw ? JSON.parse(raw) : BANK_ACCOUNTS;
  } catch (e) {
    console.error('Failed to load banks', e);
    return BANK_ACCOUNTS;
  }
};

export const saveStoredBanks = (banks, accId = getActiveAccountId()) => {
  try {
    localStorage.setItem(getScopedKey('BANKS', accId), JSON.stringify(banks));
  } catch (e) {
    console.error('Failed to save banks', e);
  }
};

// Items
export const getStoredItems = (accId = getActiveAccountId()) => {
  try {
    const raw = localStorage.getItem(getScopedKey('ITEMS', accId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load items from storage', e);
    return [];
  }
};

export const saveStoredItems = (items, accId = getActiveAccountId()) => {
  try {
    localStorage.setItem(getScopedKey('ITEMS', accId), JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save items', e);
  }
};

// Parties
export const getStoredParties = (accId = getActiveAccountId()) => {
  try {
    const raw = localStorage.getItem(getScopedKey('PARTIES', accId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load parties from storage', e);
    return [];
  }
};

export const saveStoredParties = (parties, accId = getActiveAccountId()) => {
  try {
    localStorage.setItem(getScopedKey('PARTIES', accId), JSON.stringify(parties));
  } catch (e) {
    console.error('Failed to save parties', e);
  }
};

// Payments
export const getStoredPayments = (accId = getActiveAccountId()) => {
  try {
    const raw = localStorage.getItem(getScopedKey('PAYMENTS', accId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load payments from storage', e);
    return [];
  }
};

export const saveStoredPayments = (payments, accId = getActiveAccountId()) => {
  try {
    localStorage.setItem(getScopedKey('PAYMENTS', accId), JSON.stringify(payments));
  } catch (e) {
    console.error('Failed to save payments', e);
  }
};

// Manual Ledger Entries (Capital Inflows, Expenses, Other Credits/Debits)
export const getStoredManualEntries = (accId = getActiveAccountId()) => {
  try {
    const raw = localStorage.getItem(getScopedKey('MANUAL_ENTRIES', accId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load manual entries from storage', e);
    return [];
  }
};

export const saveStoredManualEntries = (entries, accId = getActiveAccountId()) => {
  try {
    localStorage.setItem(getScopedKey('MANUAL_ENTRIES', accId), JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save manual entries', e);
  }
};

// Delete / Purge all sample memo & demo data
export const deleteMemoData = (accId = ACCOUNT_MAIN) => {
  try {
    const rawBills = localStorage.getItem(getScopedKey('BILLS', accId));
    const rawItems = localStorage.getItem(getScopedKey('ITEMS', accId));
    const rawParties = localStorage.getItem(getScopedKey('PARTIES', accId));
    const rawPurchases = localStorage.getItem(getScopedKey('PURCHASES', accId));
    const rawPayments = localStorage.getItem(getScopedKey('PAYMENTS', accId));
    const rawManual = localStorage.getItem(getScopedKey('MANUAL_ENTRIES', accId));

    const bills = rawBills ? JSON.parse(rawBills).filter(b => 
      !String(b.id).startsWith('MEMO-') && 
      !String(b.notes || '').toLowerCase().includes('cash memo:')
    ) : [];

    const items = rawItems ? JSON.parse(rawItems).filter(i => 
      !String(i.id).startsWith('item_memo_')
    ) : [];

    const parties = rawParties ? JSON.parse(rawParties).filter(p => 
      !String(p.id).startsWith('pty_memo_')
    ) : [];

    const purchases = rawPurchases ? JSON.parse(rawPurchases).filter(p => 
      !String(p.id).startsWith('PUR-MEMO-')
    ) : [];

    const payments = rawPayments ? JSON.parse(rawPayments).filter(p => 
      !String(p.id).startsWith('RCP-MEMO-') &&
      !String(p.billId || '').startsWith('MEMO-') &&
      !String(p.purchaseId || '').startsWith('PUR-MEMO-') &&
      !String(p.notes || '').toLowerCase().includes('cash memo')
    ) : [];

    const manualEntries = rawManual ? JSON.parse(rawManual).filter(m => 
      !String(m.id).startsWith('entry_memo_')
    ) : [];

    saveStoredBills(bills, accId);
    saveStoredItems(items, accId);
    saveStoredParties(parties, accId);
    saveStoredPurchases(purchases, accId);
    saveStoredPayments(payments, accId);
    saveStoredManualEntries(manualEntries, accId);

    return { bills, items, parties, purchases, payments, manualEntries };
  } catch (e) {
    console.error('Failed to delete memo data', e);
    return clearAllData(accId);
  }
};

// Load Sample Demo & Cash Memo Dataset
export const loadDemoMemoData = (accId = ACCOUNT_MAIN) => {
  try {
    saveStoredItems(SAMPLE_MEMO_ITEMS, accId);
    saveStoredParties(SAMPLE_MEMO_PARTIES, accId);
    saveStoredBills(SAMPLE_MEMO_BILLS, accId);
    saveStoredPurchases(SAMPLE_MEMO_PURCHASES, accId);
    saveStoredPayments(SAMPLE_MEMO_PAYMENTS, accId);
    saveStoredManualEntries(SAMPLE_MEMO_MANUAL_ENTRIES, accId);
    return {
      bills: SAMPLE_MEMO_BILLS,
      purchases: SAMPLE_MEMO_PURCHASES,
      items: SAMPLE_MEMO_ITEMS,
      parties: SAMPLE_MEMO_PARTIES,
      payments: SAMPLE_MEMO_PAYMENTS,
      manualEntries: SAMPLE_MEMO_MANUAL_ENTRIES,
      banks: getStoredBanks(accId)
    };
  } catch (e) {
    console.error('Failed to load demo memo data', e);
    return null;
  }
};

// Clear All Data for a specific account or active account
export const clearAllData = (accId = getActiveAccountId()) => {
  try {
    localStorage.setItem(getScopedKey('BILLS', accId), JSON.stringify([]));
    localStorage.setItem(getScopedKey('PURCHASES', accId), JSON.stringify([]));
    localStorage.setItem(getScopedKey('SUPPLIERS', accId), JSON.stringify([]));
    localStorage.setItem(getScopedKey('ITEMS', accId), JSON.stringify([]));
    localStorage.setItem(getScopedKey('PARTIES', accId), JSON.stringify([]));
    localStorage.setItem(getScopedKey('PAYMENTS', accId), JSON.stringify([]));
    localStorage.setItem(getScopedKey('MANUAL_ENTRIES', accId), JSON.stringify([]));
    return { 
      bills: [], 
      purchases: [], 
      suppliers: [], 
      items: [], 
      parties: [], 
      payments: [], 
      manualEntries: [], 
      banks: getStoredBanks(accId) 
    };
  } catch (e) {
    console.error('Failed to clear data', e);
    return { bills: [], purchases: [], suppliers: [], items: [], parties: [], payments: [], manualEntries: [], banks: getStoredBanks(accId) };
  }
};

export const resetToDemoBills = (accId = getActiveAccountId()) => {
  return clearAllData(accId);
};

// Load full dataset bundle for an account
export const getFullAccountData = (accId = getActiveAccountId()) => {
  return {
    accountId: accId,
    bills: getStoredBills(accId),
    purchases: getStoredPurchases(accId),
    suppliers: getStoredSuppliers(accId),
    banks: getStoredBanks(accId),
    items: getStoredItems(accId),
    parties: getStoredParties(accId),
    payments: getStoredPayments(accId)
  };
};

// Bulk Import Previous Data records directly into Main Account
export const importPreviousBillsAndParties = (records, targetAccId = ACCOUNT_MAIN) => {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return { countBills: 0, countParties: 0 };
  }

  const existingBills = getStoredBills(targetAccId);
  const existingParties = getStoredParties(targetAccId);
  const existingPayments = getStoredPayments(targetAccId);

  const newBills = [];
  const partiesMap = new Map();
  existingParties.forEach(p => {
    const key = (p.name || '').toLowerCase().trim();
    if (key) partiesMap.set(key, p);
  });

  const newPayments = [];

  records.forEach((rec, idx) => {
    const billId = rec.id || rec.billNo || rec.invoiceNo || `OLD-${Math.floor(10000 + Math.random() * 90000)}`;
    const custName = (rec.customerName || rec.customer || 'Walk-in Customer').trim();
    const custPhone = (rec.customerPhone || rec.phone || '').trim();
    const amount = Number(rec.netTotal ?? rec.amount ?? rec.total ?? 0);
    const date = rec.date ? new Date(rec.date).toISOString() : new Date().toISOString();
    const status = (rec.status || rec.paymentStatus || 'Paid').toLowerCase().includes('pend') ? 'Pending' : 'Paid';
    const paymentMethod = rec.paymentMethod || 'Cash';

    // Parse items if provided or construct single generic item
    let items = [];
    if (Array.isArray(rec.items) && rec.items.length > 0) {
      items = rec.items;
    } else if (rec.itemName || rec.description) {
      const qty = Number(rec.qty ?? 1);
      const price = Number(rec.price ?? (amount / (qty || 1)));
      items = [{
        id: `item_old_${Date.now()}_${idx}`,
        name: rec.itemName || rec.description,
        price,
        qty,
        total: amount
      }];
    } else {
      items = [{
        id: `item_old_${Date.now()}_${idx}`,
        name: 'Previous App Sale / Balance',
        price: amount,
        qty: 1,
        total: amount
      }];
    }

    const billObj = {
      id: billId,
      date,
      customerName: custName,
      customerPhone: custPhone,
      deliveryAddress: rec.address || '',
      items,
      subtotal: amount,
      discount: Number(rec.discount || 0),
      netTotal: amount,
      paymentMethod,
      status,
      isImported: true,
      importedAt: new Date().toISOString()
    };

    newBills.push(billObj);

    // Register party
    const partyKey = custName.toLowerCase();
    if (!partiesMap.has(partyKey) && custName !== 'Walk-in Customer') {
      const pId = `pty_old_${Date.now()}_${idx}`;
      const newP = {
        id: pId,
        name: custName,
        phone: custPhone,
        address: rec.address || '',
        type: 'customer',
        openingBalance: Number(rec.openingBalance || 0),
        openingBalanceType: 'debit',
        createdAt: date
      };
      partiesMap.set(partyKey, newP);
    }

    // If paid, create receipt voucher
    if (status === 'Paid') {
      newPayments.push({
        id: `RCP-OLD-${Math.floor(1000 + Math.random() * 9000)}`,
        date,
        partyId: custPhone || custName,
        partyName: custName,
        partyPhone: custPhone,
        partyType: 'customer',
        amount,
        paymentMethod,
        notes: `Imported Sale Bill #${billId}`,
        billId,
        createdAt: date
      });
    }
  });

  const mergedBills = [...newBills, ...existingBills];
  const mergedParties = Array.from(partiesMap.values());
  const mergedPayments = [...newPayments, ...existingPayments];

  saveStoredBills(mergedBills, targetAccId);
  saveStoredParties(mergedParties, targetAccId);
  saveStoredPayments(mergedPayments, targetAccId);

  return {
    countBills: newBills.length,
    countParties: mergedParties.length - existingParties.length
  };
};

export const exportAllDataJSON = (accId = getActiveAccountId()) => {
  const data = {
    appName: "The Chocolate House",
    storeType: "Online Store",
    exportedAt: new Date().toISOString(),
    accountId: accId,
    bills: getStoredBills(accId),
    purchases: getStoredPurchases(accId),
    suppliers: getStoredSuppliers(accId),
    banks: getStoredBanks(accId),
    items: getStoredItems(accId),
    parties: getStoredParties(accId),
    payments: getStoredPayments(accId),
    manualEntries: getStoredManualEntries(accId),
    business: BUSINESS_INFO
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `TheChocolateHouse_${accId}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importAllDataJSON = (file, onSuccess, onError, targetAccId = getActiveAccountId()) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.bills && Array.isArray(data.bills)) {
        saveStoredBills(data.bills, targetAccId);
      }
      if (data.purchases && Array.isArray(data.purchases)) {
        saveStoredPurchases(data.purchases, targetAccId);
      }
      if (data.suppliers && Array.isArray(data.suppliers)) {
        saveStoredSuppliers(data.suppliers, targetAccId);
      }
      if (data.banks && Array.isArray(data.banks)) {
        saveStoredBanks(data.banks, targetAccId);
      }
      if (data.items && Array.isArray(data.items)) {
        saveStoredItems(data.items, targetAccId);
      }
      if (data.parties && Array.isArray(data.parties)) {
        saveStoredParties(data.parties, targetAccId);
      }
      if (data.payments && Array.isArray(data.payments)) {
        saveStoredPayments(data.payments, targetAccId);
      }
      if (data.manualEntries && Array.isArray(data.manualEntries)) {
        saveStoredManualEntries(data.manualEntries, targetAccId);
      }
      onSuccess?.(data);
    } catch (err) {
      onError?.("Invalid backup JSON file");
    }
  };
  reader.onerror = () => onError?.("Error reading file");
  reader.readAsText(file);
};
