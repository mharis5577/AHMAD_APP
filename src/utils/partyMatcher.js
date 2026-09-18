/**
 * Robust party matcher and double-entry ledger calculation engine.
 * Handles phone normalization, multi-key party lookup, and unified balance calculations.
 */

/**
 * Normalize Pakistani / international phone numbers to standard digit format
 * e.g. "0300-1234567" -> "03001234567"
 * e.g. "+92 300 1234567" -> "03001234567"
 * e.g. "923001234567" -> "03001234567"
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Check if an item (bill, payment, or purchase) matches a given party
 */
export function matchesParty(target, party) {
  if (!target || !party) return false;

  // 1. Exact Party ID match
  const targetPartyId = target.partyId || target.customerId || target.supplierId;
  const partyId = party.partyId || party.id;
  if (targetPartyId && partyId && String(targetPartyId).trim() === String(partyId).trim()) {
    return true;
  }

  // 2. Normalized Phone Match (if phone is at least 7 digits)
  const targetPhone = normalizePhone(target.customerPhone || target.supplierPhone || target.partyPhone || target.phone);
  const partyPhone = normalizePhone(party.phone || party.customerPhone || party.supplierPhone);
  if (targetPhone && partyPhone && targetPhone.length >= 7 && targetPhone === partyPhone) {
    return true;
  }

  // 3. Name Match (case-insensitive trimmed)
  const targetName = (target.customerName || target.supplierName || target.partyName || target.name || '').trim().toLowerCase();
  const partyName = (party.name || party.customerName || party.supplierName || '').trim().toLowerCase();
  if (targetName && partyName && targetName === partyName) {
    return true;
  }

  return false;
}

/**
 * Calculate pure double-entry totals for a customer ledger
 */
export function computeCustomerTotals(customer) {
  const opening = Number(customer.openingBalance) || 0;
  const openingType = customer.openingBalanceType || 'debit';

  const openingDebit = openingType === 'debit' ? opening : 0;
  const openingCredit = openingType === 'credit' ? opening : 0;

  const bills = customer.bills || [];
  const payments = customer.payments || [];

  const totalBilled = bills.reduce((acc, b) => acc + (Number(b.netTotal) || 0), 0);
  const totalPaid = payments
    .filter(p => p.paymentType !== 'send')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalSent = payments
    .filter(p => p.paymentType === 'send')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalDebits = openingDebit + totalBilled + totalSent;
  const totalCredits = openingCredit + totalPaid;
  const totalDue = totalDebits - totalCredits;

  return {
    openingBalance: opening,
    openingBalanceType: openingType,
    totalBilled,
    totalPaid,
    totalSent,
    totalDebits,
    totalCredits,
    totalDue // > 0: customer owes us (+), < 0: advance credit (-)
  };
}

/**
 * Calculate pure double-entry totals for a supplier ledger
 */
export function computeSupplierTotals(supplier) {
  const opening = Number(supplier.openingBalance) || 0;
  const openingType = supplier.openingBalanceType || 'credit';

  const openingCredit = openingType === 'credit' ? opening : 0;
  const openingDebit = openingType === 'debit' ? opening : 0;

  const purchases = supplier.purchases || [];
  const payments = supplier.payments || [];

  const totalPurchased = purchases.reduce((acc, p) => acc + (Number(p.netTotal) || 0), 0);
  
  // Normal payment we made to supplier (reduces payable / debit)
  const totalPaid = payments
    .filter(p => p.paymentType !== 'receive')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Refund we received from supplier (increases payable / credit)
  const totalRefundReceived = payments
    .filter(p => p.paymentType === 'receive')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalCredits = openingCredit + totalPurchased + totalRefundReceived;
  const totalDebits = openingDebit + totalPaid;
  const totalPayable = totalCredits - totalDebits;

  return {
    openingBalance: opening,
    openingBalanceType: openingType,
    totalPurchased,
    totalPaid,
    totalRefundReceived,
    totalCredits,
    totalDebits,
    totalPayable // > 0: we owe supplier (+), < 0: advance debit (-)
  };
}
