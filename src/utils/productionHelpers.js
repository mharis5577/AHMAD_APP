/**
 * Production helpers for The Chocolate House app
 * Includes storage monitoring, data validation, and app health checks
 */

// Check available localStorage space
export const checkStorageSpace = () => {
  try {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
      }
    }
    const usedMB = (total / (1024 * 1024)).toFixed(2);
    const estimatedLimit = 5; // Most browsers have 5-10MB limit
    const percentUsed = ((total / (1024 * 1024)) / estimatedLimit * 100).toFixed(1);
    
    return {
      usedBytes: total,
      usedMB: parseFloat(usedMB),
      percentUsed: parseFloat(percentUsed),
      isLow: parseFloat(percentUsed) > 80,
      isCritical: parseFloat(percentUsed) > 95
    };
  } catch (e) {
    return { usedBytes: 0, usedMB: 0, percentUsed: 0, isLow: false, isCritical: false };
  }
};

// Sanitize text input to prevent XSS
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Sanitize phone number
export const sanitizePhone = (phone) => {
  if (!phone) return '';
  // Keep only digits, +, and spaces
  return phone.replace(/[^\d+\s-]/g, '').trim();
};

// Validate bill data before saving
export const validateBillData = (bill) => {
  const errors = [];
  
  if (!bill.id) errors.push('Bill ID is required');
  if (!bill.customerName?.trim()) errors.push('Customer name is required');
  if (!bill.items || !Array.isArray(bill.items) || bill.items.length === 0) {
    errors.push('At least one item is required');
  }
  if (bill.items?.some(item => !item.name?.trim())) {
    errors.push('All items must have a name');
  }
  if (bill.netTotal < 0) errors.push('Total cannot be negative');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Check if last backup was more than X days ago
export const shouldRemindBackup = (days = 7) => {
  try {
    const lastBackup = localStorage.getItem('tch_last_backup_date');
    if (!lastBackup) return true;
    
    const lastDate = new Date(lastBackup);
    const now = new Date();
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    
    return diffDays >= days;
  } catch (e) {
    return true;
  }
};

// Record backup date
export const recordBackupDate = () => {
  try {
    localStorage.setItem('tch_last_backup_date', new Date().toISOString());
  } catch (e) {
    // Ignore
  }
};

// Get data counts for integrity check
export const getDataCounts = () => {
  try {
    const bills = JSON.parse(localStorage.getItem('tch_main_bills_v2') || '[]');
    const purchases = JSON.parse(localStorage.getItem('tch_main_purchases_v2') || '[]');
    const parties = JSON.parse(localStorage.getItem('tch_main_parties_v2') || '[]');
    const items = JSON.parse(localStorage.getItem('tch_main_items_v2') || '[]');
    const payments = JSON.parse(localStorage.getItem('tch_main_payments_v2') || '[]');
    
    return {
      bills: Array.isArray(bills) ? bills.length : 0,
      purchases: Array.isArray(purchases) ? purchases.length : 0,
      parties: Array.isArray(parties) ? parties.length : 0,
      items: Array.isArray(items) ? items.length : 0,
      payments: Array.isArray(payments) ? payments.length : 0
    };
  } catch (e) {
    return { bills: 0, purchases: 0, parties: 0, items: 0, payments: 0 };
  }
};

// Format currency for display
export const formatCurrency = (amount, symbol = 'Rs.') => {
  const num = Number(amount) || 0;
  return `${symbol} ${num.toLocaleString('en-PK')}`;
};

// Format date for display
export const formatDate = (dateStr, includeTime = false) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const options = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-PK', options);
  } catch (e) {
    return dateStr;
  }
};

// Generate unique ID
export const generateId = (prefix = 'ID') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

// Debounce function for search inputs
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Check if app is running as PWA
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Get device info for debugging
export const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    isPWA: isPWA(),
    appVersion: window.APP_VERSION || '1.0.0'
  };
};
