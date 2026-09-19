import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { showAppAlert } from './dialog';

/**
 * Universal helper to save an XLSX workbook on both Mobile APK and Web Desktop
 */
async function saveWorkbook(workbook, filename = 'document.xlsx') {
  try {
    if (Capacitor.isNativePlatform()) {
      const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });
      await Share.share({
        title: filename,
        url: savedFile.uri,
        dialogTitle: 'Save / Share Excel Spreadsheet'
      });
      return true;
    } else {
      // Browser download
      XLSX.writeFile(workbook, filename);
      return true;
    }
  } catch (err) {
    console.error('Failed to save Excel file:', err);
    showAppAlert({
      title: 'Excel Export Failed',
      message: 'Could not export Excel file: ' + (err?.message || 'Unknown error'),
      type: 'error'
    });
    return false;
  }
}

/**
 * 1. Export single Bill / Invoice to Excel with calculation breakdown
 */
export async function exportBillToExcel(bill, banks = [], businessInfo = {}) {
  if (!bill) return;

  const wb = XLSX.utils.book_new();

  const formattedDate = new Date(bill.date).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const prevBal = Number(bill.previousBalance) || 0;
  const totalKhata = (bill.status === 'Paid') ? prevBal : (bill.netTotal + prevBal);

  // Construct sheet rows
  const rows = [
    // Header
    [businessInfo.name || 'THE CHOCOLATE HOUSE', '', '', '', ''],
    [businessInfo.tagline || 'Imported Chocolates', '', '', '', ''],
    [`Phone: ${businessInfo.phone || ''} | Address: ${businessInfo.address || ''}`, '', '', '', ''],
    ['', '', '', '', ''],
    ['OFFICIAL SALES INVOICE & BILL CALCULATION', '', '', '', ''],
    ['', '', '', '', ''],

    // Bill Metadata
    ['Invoice #:', bill.id, '', 'Date & Time:', formattedDate],
    ['Customer Name:', bill.customerName || 'Walk-in Customer', '', 'Payment Method:', bill.paymentMethod || 'Cash'],
    ['Customer Phone:', bill.customerPhone || 'N/A', '', 'Payment Status:', (bill.status || 'Pending').toUpperCase()],
    ['Delivery Address:', bill.deliveryAddress || 'N/A', '', '', ''],
    ['', '', '', '', ''],

    // Items Header
    ['Sr #', 'Item Description', 'Quantity', 'Unit Price (Rs.)', 'Total (Rs.)']
  ];

  // Items rows
  (bill.items || []).forEach((item, index) => {
    rows.push([
      index + 1,
      item.name || 'Item',
      Number(item.qty) || 1,
      Number(item.price) || 0,
      Number(item.total) || 0
    ]);
  });

  // Calculations section
  rows.push(['', '', '', '', '']);
  rows.push(['', '', '', 'Subtotal:', Number(bill.subtotal) || 0]);
  if (bill.discount > 0) {
    rows.push(['', '', '', 'Discount:', -Number(bill.discount)]);
  }
  rows.push(['', '', '', 'Net Bill Total:', Number(bill.netTotal) || 0]);

  if (prevBal !== 0) {
    rows.push(['', '', '', 'Previous Balance:', prevBal]);
    rows.push(['', '', '', 'Total Khata Due:', totalKhata]);
  }

  // Official Banks section
  if (banks && banks.length > 0) {
    rows.push(['', '', '', '', '']);
    rows.push(['OFFICIAL BANK ACCOUNTS FOR PAYMENT', '', '', '', '']);
    rows.push(['Bank Name', 'Account Title', 'Account No', 'IBAN', 'Short Code']);
    banks.forEach(b => {
      rows.push([
        b.bankName || '',
        b.accountTitle || '',
        b.accountNo || '',
        b.iban || '',
        b.shortCode || ''
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for clean readability
  ws['!cols'] = [
    { wch: 8 },   // Sr / Col A
    { wch: 32 },  // Description / Col B
    { wch: 14 },  // Qty / Col C
    { wch: 18 },  // Price / Col D
    { wch: 20 }   // Total / Col E
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Bill-${bill.id}`);

  const safeFilename = `Invoice_${bill.id}_${(bill.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  return await saveWorkbook(wb, safeFilename);
}

/**
 * 2. Export All Bills History / Sales Daybook to Excel
 */
export async function exportBillsHistoryToExcel(bills = [], filename = 'TheChocolateHouse_Sales_History.xlsx') {
  if (!bills || bills.length === 0) {
    showAppAlert({
      title: 'No Data',
      message: 'There are no bills to export.',
      type: 'warning'
    });
    return false;
  }

  const wb = XLSX.utils.book_new();

  const dataRows = bills.map((b, idx) => {
    const itemsSummary = (b.items || []).map(i => `${i.qty}x ${i.name}`).join('; ');
    const totalQty = (b.items || []).reduce((sum, i) => sum + (Number(i.qty) || 1), 0);
    const dateStr = new Date(b.date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      'Sr #': idx + 1,
      'Invoice #': b.id,
      'Date': dateStr,
      'Customer Name': b.customerName || 'Walk-in',
      'Phone': b.customerPhone || '',
      'Delivery Address': b.deliveryAddress || '',
      'Items Summary': itemsSummary,
      'Total Qty': totalQty,
      'Subtotal (Rs.)': Number(b.subtotal || b.netTotal || 0),
      'Discount (Rs.)': Number(b.discount || 0),
      'Net Total (Rs.)': Number(b.netTotal || 0),
      'Payment Method': b.paymentMethod || 'Cash',
      'Status': b.status || 'Pending'
    };
  });

  // Calculate totals
  const totalSales = bills.reduce((sum, b) => sum + (Number(b.netTotal) || 0), 0);
  const paidSales = bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + (Number(b.netTotal) || 0), 0);
  const pendingSales = bills.filter(b => b.status === 'Pending').reduce((sum, b) => sum + (Number(b.netTotal) || 0), 0);

  // Add summary row
  dataRows.push({
    'Sr #': '',
    'Invoice #': 'TOTAL SUMMARY',
    'Date': '',
    'Customer Name': `${bills.length} Bills`,
    'Phone': '',
    'Delivery Address': '',
    'Items Summary': `Paid: Rs. ${paidSales.toLocaleString()} | Unpaid: Rs. ${pendingSales.toLocaleString()}`,
    'Total Qty': '',
    'Subtotal (Rs.)': '',
    'Discount (Rs.)': '',
    'Net Total (Rs.)': totalSales,
    'Payment Method': '',
    'Status': `Total: Rs. ${totalSales.toLocaleString()}`
  });

  const ws = XLSX.utils.json_to_sheet(dataRows);

  ws['!cols'] = [
    { wch: 6 },   // Sr
    { wch: 14 },  // Invoice
    { wch: 18 },  // Date
    { wch: 22 },  // Customer
    { wch: 14 },  // Phone
    { wch: 20 },  // Address
    { wch: 34 },  // Items
    { wch: 10 },  // Qty
    { wch: 14 },  // Subtotal
    { wch: 14 },  // Discount
    { wch: 16 },  // Net Total
    { wch: 14 },  // Payment Method
    { wch: 12 }   // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sales History');
  return await saveWorkbook(wb, filename);
}

/**
 * 3. Download Blank Sample Excel Template for Previous App Data Migration
 */
export async function downloadPreviousDataTemplate() {
  const wb = XLSX.utils.book_new();

  const sampleRows = [
    {
      'Invoice No': 'INV-1001',
      'Date': '2026-01-15',
      'Customer Name': 'Ali Khan',
      'Phone': '03001234567',
      'Address': 'DHA Phase 5, Lahore',
      'Item Description': 'Ferrero Rocher Box 24pcs',
      'Quantity': 2,
      'Unit Price': 2800,
      'Total Amount': 5600,
      'Payment Status': 'Paid',
      'Payment Method': 'Cash'
    },
    {
      'Invoice No': 'INV-1002',
      'Date': '2026-01-16',
      'Customer Name': 'Sara Ahmed',
      'Phone': '03219876543',
      'Address': 'Gulberg III, Lahore',
      'Item Description': 'Lindt Swiss Classic Dark 100g',
      'Quantity': 3,
      'Unit Price': 1200,
      'Total Amount': 3600,
      'Payment Status': 'Pending',
      'Payment Method': 'Bank Transfer'
    },
    {
      'Invoice No': 'INV-1003',
      'Date': '2026-01-17',
      'Customer Name': 'Usman Tariq',
      'Phone': '03335554433',
      'Address': 'F-7/2, Islamabad',
      'Item Description': 'Nutella Hazelnut Spread 750g',
      'Quantity': 1,
      'Unit Price': 2400,
      'Total Amount': 2400,
      'Payment Status': 'Paid',
      'Payment Method': 'Cash'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);

  ws['!cols'] = [
    { wch: 14 },  // Invoice No
    { wch: 14 },  // Date
    { wch: 20 },  // Customer Name
    { wch: 16 },  // Phone
    { wch: 24 },  // Address
    { wch: 30 },  // Item Description
    { wch: 10 },  // Quantity
    { wch: 12 },  // Unit Price
    { wch: 14 },  // Total Amount
    { wch: 16 },  // Payment Status
    { wch: 16 }   // Payment Method
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Previous Data Template');
  return await saveWorkbook(wb, 'Previous_App_Data_Template.xlsx');
}

/**
 * 4. Parse an uploaded Excel or CSV file into structured previous records
 */
export async function parseExcelOrCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('Workbook contains no sheets.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('The uploaded spreadsheet contains no rows.');
        }

        // Smart column mapping helper
        const findField = (row, fieldNames) => {
          const keys = Object.keys(row);
          for (const name of fieldNames) {
            const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === name.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== '') {
              return row[foundKey];
            }
          }
          return '';
        };

        const parsedRows = rawJson.map((row, index) => {
          const invoiceNo = String(findField(row, ['invoiceno', 'invoice', 'billno', 'bill', 'id', 'orderno', 'receiptno']) || `OLD-${index + 1001}`);
          const dateRaw = findField(row, ['date', 'billdate', 'invoicedate', 'createdat', 'time']);
          
          let parsedDate = new Date().toISOString();
          if (dateRaw) {
            // Check if excel numeric date
            if (typeof dateRaw === 'number') {
              const parsed = new Date((dateRaw - 25569) * 86400 * 1000);
              if (!isNaN(parsed.getTime())) parsedDate = parsed.toISOString();
            } else {
              const parsed = new Date(dateRaw);
              if (!isNaN(parsed.getTime())) parsedDate = parsed.toISOString();
            }
          }

          const customerName = String(findField(row, ['customername', 'customer', 'name', 'client', 'party', 'buyer']) || 'Walk-in Customer');
          const phone = String(findField(row, ['phone', 'mobile', 'contact', 'customerphone', 'cell']) || '');
          const address = String(findField(row, ['address', 'deliveryaddress', 'location', 'city']) || '');
          const itemName = String(findField(row, ['itemdescription', 'itemname', 'item', 'description', 'product', 'details']) || 'Previous App Record');
          
          const qty = Number(findField(row, ['quantity', 'qty', 'units', 'count']) || 1);
          const price = Number(findField(row, ['unitprice', 'price', 'rate', 'cost']) || 0);
          
          let totalAmount = Number(findField(row, ['totalamount', 'total', 'nettotal', 'amount', 'net', 'billamount']) || 0);
          if (totalAmount === 0 && price > 0) {
            totalAmount = price * (qty || 1);
          }

          const statusRaw = String(findField(row, ['paymentstatus', 'status', 'payment', 'paid']) || 'Paid');
          const status = statusRaw.toLowerCase().includes('pend') || statusRaw.toLowerCase().includes('unpaid') ? 'Pending' : 'Paid';
          const paymentMethod = String(findField(row, ['paymentmethod', 'method', 'type', 'mode']) || 'Cash');

          return {
            id: invoiceNo,
            date: parsedDate,
            customerName,
            customerPhone: phone,
            address,
            itemName,
            qty,
            price: price || (totalAmount / (qty || 1)),
            amount: totalAmount,
            status,
            paymentMethod
          };
        });

        resolve({
          success: true,
          sheetName: firstSheetName,
          totalRows: parsedRows.length,
          rows: parsedRows
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 5. Export General Ledger & Profit Statement to Excel
 */
export async function exportGeneralLedgerToExcel(entries = [], summary = {}, filename = 'TheChocolateHouse_General_Ledger.xlsx') {
  if (!entries || entries.length === 0) {
    showAppAlert({
      title: 'No Entries',
      message: 'There are no ledger entries to export.',
      type: 'warning'
    });
    return false;
  }

  const wb = XLSX.utils.book_new();

  const summarySheetRows = [
    ['THE CHOCOLATE HOUSE - GENERAL LEDGER & PROFIT STATEMENT'],
    [`Generated: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`],
    [''],
    ['FINANCIAL FLOW SUMMARY (CAPITAL -> STOCK -> SALE -> PROFIT)'],
    ['Metric', 'Amount (Rs.)', 'Explanation'],
    ['Total Capital Investment', Number(summary.totalCapital || 0), 'Owner cash injected into business'],
    ['Total Stock Purchases', Number(summary.totalPurchases || 0), 'Money spent purchasing inventory'],
    ['Current Stock Valuation', Number(summary.currentStockValuation || 0), 'Valuation of remaining inventory assets'],
    ['Total Sales Revenue', Number(summary.totalSales || 0), 'Total gross sales invoice revenue'],
    ['Cost of Goods Sold (COGS)', Number(summary.totalCogs || 0), 'Original purchase cost of sold inventory'],
    ['Gross Profit', Number(summary.grossProfit || 0), 'Sales Revenue - Cost of Goods Sold'],
    ['Operating Expenses (Debits)', Number(summary.totalExpenses || 0), 'Shop rent, electricity, salaries, packaging'],
    ['Other Income (Credits)', Number(summary.totalOtherIncome || 0), 'Non-sale business income & deposits'],
    ['NET PROFIT', Number(summary.netProfit || 0), 'Gross Profit - Operating Expenses + Other Income'],
    ['Net Available Cash/Bank', Number(summary.netCashBalance || 0), 'Liquid cash and bank balance'],
    [''],
    ['HOW PROFIT AMOUNT IS CALCULATED:'],
    ['Formula: Net Profit = (Total Sales - COGS) - Operating Expenses + Other Income'],
    [`Calculation: (${(summary.totalSales || 0).toLocaleString()} - ${(summary.totalCogs || 0).toLocaleString()}) - ${(summary.totalExpenses || 0).toLocaleString()} + ${(summary.totalOtherIncome || 0).toLocaleString()} = Rs. ${(summary.netProfit || 0).toLocaleString()}`]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'P&L Summary');

  // Transactions Ledger Sheet
  const ledgerRows = entries.map((e, idx) => ({
    'Sr #': idx + 1,
    'Date': new Date(e.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    'Ref / Invoice #': e.refId || e.id || '-',
    'Type': e.typeLabel || e.type,
    'Particulars': e.particulars || e.notes || '-',
    'Category / Notes': e.category || '-',
    'Payment Mode': e.paymentMethod || 'Cash',
    'Debit (-) Rs.': e.debit > 0 ? Number(e.debit) : '',
    'Credit (+) Rs.': e.credit > 0 ? Number(e.credit) : '',
    'Running Balance Rs.': Number(e.runningBalance || 0)
  }));

  const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
  wsLedger['!cols'] = [
    { wch: 6 },   // Sr #
    { wch: 18 },  // Date
    { wch: 14 },  // Ref #
    { wch: 16 },  // Type
    { wch: 32 },  // Particulars
    { wch: 18 },  // Category
    { wch: 14 },  // Mode
    { wch: 14 },  // Debit
    { wch: 14 },  // Credit
    { wch: 18 }   // Balance
  ];
  XLSX.utils.book_append_sheet(wb, wsLedger, 'All Ledger Entries');

  return await saveWorkbook(wb, filename);
}
