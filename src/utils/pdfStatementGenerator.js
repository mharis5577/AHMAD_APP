import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';

/**
 * Format IBAN with spaces for crisp readability (e.g. PK39 MEZN 0057 0201 1520 9000)
 */
function formatIbanReadable(iban = '') {
  if (!iban) return '-';
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/**
 * Generate and download an executive-grade Customer Khata Statement PDF
 */
export async function generateCustomerStatementPdf(client, banks = BANK_ACCOUNTS) {
  if (!client) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2); // 182mm

  // ==========================================
  // 1. LUXURY TOP BRANDING HEADER
  // ==========================================
  // Primary dark chocolate header banner
  doc.setFillColor(43, 22, 11); // #2b160b
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Gold hairline accent line at bottom of header banner
  doc.setFillColor(212, 163, 89); // #d4a359
  doc.rect(0, 27.2, pageWidth, 1.2, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text(BUSINESS_INFO.name.toUpperCase(), pageWidth / 2, 13, { align: 'center' });

  // Tagline & Contact Line
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(230, 205, 170);
  doc.text(
    `Imported Chocolates & Confections  •  WhatsApp / Phone: ${BUSINESS_INFO.phone}  •  Attock, Punjab`,
    pageWidth / 2,
    20,
    { align: 'center' }
  );

  // Document Title Badge
  const badgeWidth = 100;
  const badgeHeight = 7.5;
  const badgeX = (pageWidth - badgeWidth) / 2;
  const badgeY = 32;

  doc.setFillColor(252, 248, 242);
  doc.setDrawColor(212, 163, 89);
  doc.setLineWidth(0.6);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'FD');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(186, 131, 57); // Gold #ba8339
  doc.text('CUSTOMER ACCOUNT STATEMENT / KHATA', pageWidth / 2, badgeY + 5.2, { align: 'center' });

  // ==========================================
  // 2. CUSTOMER & STATEMENT PROFILE CARD
  // ==========================================
  const cardY = 43;
  const cardHeight = 28;

  doc.setFillColor(253, 251, 248);
  doc.setDrawColor(228, 218, 206);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, cardY, contentWidth, cardHeight, 3, 3, 'FD');

  // Left Column: Customer Details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(160, 120, 75);
  doc.text('BILLED TO CUSTOMER:', margin + 6, cardY + 6);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(43, 22, 11);
  doc.text(client.name.toUpperCase(), margin + 6, cardY + 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  let detailY = cardY + 17;
  if (client.phone) {
    doc.text(`Phone / Mobile: ${client.phone}`, margin + 6, detailY);
    detailY += 4.5;
  }
  if (client.address) {
    const wrappedAddr = doc.splitTextToSize(`Address: ${client.address}`, 105);
    doc.text(wrappedAddr, margin + 6, detailY);
  }

  // Right Column: Date & Status Badge
  const rightX = pageWidth - margin - 6;
  const todayFormatted = new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Statement Date: ${todayFormatted}`, rightX, cardY + 7, { align: 'right' });

  // Account Status Badge
  const statusBoxWidth = 58;
  const statusBoxHeight = 12;
  const statusBoxX = rightX - statusBoxWidth;
  const statusBoxY = cardY + 11;

  if (client.totalDue === 0) {
    // Settled (Green)
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.setDrawColor(52, 211, 153);
    doc.roundedRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text('ACCOUNT STATUS', statusBoxX + (statusBoxWidth / 2), statusBoxY + 4.5, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SETTLED (RS. 0)', statusBoxX + (statusBoxWidth / 2), statusBoxY + 9.2, { align: 'center' });
  } else if (client.totalDue > 0) {
    // Dues Pending (Amber/Orange)
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(180, 83, 9);
    doc.text('PENDING DUES', statusBoxX + (statusBoxWidth / 2), statusBoxY + 4.5, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${client.totalDue.toLocaleString()} (UNPAID)`, statusBoxX + (statusBoxWidth / 2), statusBoxY + 9.2, { align: 'center' });
  } else {
    // Advance Credit (Blue)
    doc.setFillColor(239, 246, 255); // Blue-50
    doc.setDrawColor(96, 165, 250);
    doc.roundedRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(29, 78, 216);
    doc.text('ADVANCE BALANCE', statusBoxX + (statusBoxWidth / 2), statusBoxY + 4.5, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${Math.abs(client.totalDue).toLocaleString()} (CREDIT)`, statusBoxX + (statusBoxWidth / 2), statusBoxY + 9.2, { align: 'center' });
  }

  // ==========================================
  // 3. TABLE OF ORDERS & PREVIOUS BALANCE
  // ==========================================
  const openingBal = Number(client.openingBalance) || 0;
  const openingType = client.openingBalanceType || 'debit';

  const tableRows = [];

  // Opening balance row if present
  if (openingBal > 0) {
    tableRows.push([
      'Opening',
      `Previous Balance (${openingType === 'debit' ? "Debit / You'll Get" : "Credit / Advance"})`,
      '-',
      `Rs. ${openingBal.toLocaleString()}`,
      'Carried'
    ]);
  }

  // Order bills
  if (client.bills && client.bills.length > 0) {
    client.bills.forEach(b => {
      const d = new Date(b.date).toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const itemsSummary = b.items?.map(i => `${i.qty}x ${i.name}`).join(', ') || 'Order Items';
      tableRows.push([
        d,
        itemsSummary,
        `#${b.id}`,
        `Rs. ${Number(b.netTotal || 0).toLocaleString()}`,
        b.status || 'Pending'
      ]);
    });
  }

  // Payments received / sent
  if (client.payments && client.payments.length > 0) {
    client.payments.forEach(p => {
      const d = new Date(p.date).toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const isSend = p.paymentType === 'send';
      tableRows.push([
        d,
        isSend
          ? `Amount Sent / Refund (${p.paymentMethod || 'Cash'})${p.notes ? ` - ${p.notes}` : ''}`
          : `Payment Received (${p.paymentMethod || 'Cash'})${p.notes ? ` - ${p.notes}` : ''}`,
        `#${p.id}`,
        isSend
          ? `+ Rs. ${Number(p.amount || 0).toLocaleString()}`
          : `- Rs. ${Number(p.amount || 0).toLocaleString()}`,
        isSend ? 'Sent' : 'Received'
      ]);
    });
  }

  autoTable(doc, {
    startY: cardY + cardHeight + 5,
    margin: { left: margin, right: margin },
    head: [['Date', 'Particulars / Items Description', 'Invoice #', 'Amount (Rs.)', 'Payment Status']],
    body: tableRows.length > 0 ? tableRows : [['-', 'No billing transactions recorded for this customer.', '-', 'Rs. 0', 'Cleared']],
    theme: 'grid',
    headStyles: {
      fillColor: [43, 22, 11], // Rich dark cocoa
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 4,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'normal' },
      1: { cellWidth: 76 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
      textColor: [40, 40, 40],
      lineColor: [228, 218, 206],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [253, 250, 246]
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 4) {
        if (data.cell.raw === 'Paid' || data.cell.raw === 'Received') {
          data.cell.styles.textColor = [5, 150, 105]; // Green
        } else if (data.cell.raw === 'Sent') {
          data.cell.styles.textColor = [225, 29, 72]; // Rose / Red
        } else if (data.cell.raw === 'Pending' || data.cell.raw === 'Unpaid') {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
        } else if (data.cell.raw === 'Carried') {
          data.cell.styles.textColor = [37, 99, 235]; // Blue
        }
      }
    }
  });

  // ==========================================
  // 4. FINANCIAL TOTALS SUMMARY BLOCK
  // ==========================================
  let currentY = doc.lastAutoTable.finalY + 5;

  // If table ran close to bottom, add new page for summary & banks
  if (currentY + 70 > pageHeight) {
    doc.addPage();
    currentY = 18;
  }

  const summaryWidth = 92;
  const summaryX = pageWidth - margin - summaryWidth;

  doc.setFillColor(253, 251, 248);
  doc.setDrawColor(218, 190, 150);
  doc.setLineWidth(0.4);
  doc.roundedRect(summaryX, currentY, summaryWidth, 34, 2, 2, 'FD');

  // Subtotal Billed
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text('Total Orders Billed:', summaryX + 5, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(43, 22, 11);
  doc.text(`Rs. ${(client.totalBilled || 0).toLocaleString()}`, summaryX + summaryWidth - 5, currentY + 7, { align: 'right' });

  // Total Paid
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text('Total Amount Paid / Settled:', summaryX + 5, currentY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`Rs. ${(client.totalPaid || 0).toLocaleString()}`, summaryX + summaryWidth - 5, currentY + 13, { align: 'right' });

  // Opening Balance
  if (openingBal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`Previous Balance (${openingType}):`, summaryX + 5, currentY + 19);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Rs. ${openingBal.toLocaleString()}`, summaryX + summaryWidth - 5, currentY + 19, { align: 'right' });
  }

  // Gold separator line
  doc.setDrawColor(212, 163, 89);
  doc.setLineWidth(0.5);
  doc.line(summaryX + 4, currentY + 23, summaryX + summaryWidth - 4, currentY + 23);

  // Net Balance Due
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(43, 22, 11);
  doc.text('NET BALANCE DUE:', summaryX + 5, currentY + 29.5);

  const dueColor = client.totalDue > 0 ? [180, 83, 9] : (client.totalDue < 0 ? [37, 99, 235] : [5, 150, 105]);
  doc.setTextColor(dueColor[0], dueColor[1], dueColor[2]);
  doc.setFontSize(10.5);
  doc.text(`Rs. ${client.totalDue.toLocaleString()}`, summaryX + summaryWidth - 5, currentY + 29.5, { align: 'right' });

  // ==========================================
  // 5. FULL-WIDTH BANK ACCOUNTS (3 LUXURY CARDS)
  // ==========================================
  const bankSectionY = currentY + 40;

  // Title
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(160, 120, 75);
  doc.text('OFFICIAL BANK REMITTANCE ACCOUNTS (FOR DIRECT PAYMENT)', margin, bankSectionY);

  const bankCardY = bankSectionY + 3;
  const activeBanks = (banks && banks.length > 0) ? banks : BANK_ACCOUNTS;
  const bankCardGap = 4;
  const bankCardWidth = (contentWidth - (bankCardGap * 2)) / 3; // ~58mm each
  const bankCardHeight = 24;

  activeBanks.slice(0, 3).forEach((b, idx) => {
    const bX = margin + (idx * (bankCardWidth + bankCardGap));

    // Card background
    doc.setFillColor(254, 252, 250);
    doc.setDrawColor(228, 218, 206);
    doc.setLineWidth(0.3);
    doc.roundedRect(bX, bankCardY, bankCardWidth, bankCardHeight, 2, 2, 'FD');

    // Header strip for bank name
    doc.setFillColor(43, 22, 11);
    doc.roundedRect(bX, bankCardY, bankCardWidth, 6, 2, 2, 'F');
    doc.rect(bX, bankCardY + 4, bankCardWidth, 2, 'F'); // square bottom of top header

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(b.bankName.toUpperCase(), bX + (bankCardWidth / 2), bankCardY + 4.2, { align: 'center' });

    // Details inside card
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Title: ${b.accountTitle}`, bX + 3, bankCardY + 9.5);

    if (b.accountNo) {
      doc.text(`A/C: ${b.accountNo}`, bX + 3, bankCardY + 13.5);
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(43, 22, 11);
    doc.text('IBAN:', bX + 3, bankCardY + (b.accountNo ? 17.5 : 14));

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(186, 131, 57); // Gold

    // Split IBAN into 2 lines so it fits comfortably in the card
    const formattedIban = formatIbanReadable(b.iban);
    const ibanParts = formattedIban.split(' ');
    const line1 = ibanParts.slice(0, 3).join(' ');
    const line2 = ibanParts.slice(3).join(' ');

    const ibanStartY = b.accountNo ? 17.5 : 14;
    doc.text(line1, bX + 13, bankCardY + ibanStartY);
    if (line2) {
      doc.text(line2, bX + 13, bankCardY + ibanStartY + 3.5);
    }
  });

  // ==========================================
  // 6. EXECUTIVE FOOTER
  // ==========================================
  doc.setDrawColor(218, 190, 150);
  doc.setLineWidth(0.4);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(130, 130, 130);
  doc.text(
    'Thank you for ordering with The Chocolate House! • Computer-Generated Customer Account Statement',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  // Download / Save
  const filename = `${client.name.replace(/[^a-zA-Z0-9]/g, '_')}_Khata_Statement.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });
      await Share.share({
        title: filename,
        url: savedFile.uri,
        dialogTitle: 'Save / Share PDF Statement'
      });
    } catch (err) {
      console.warn('Native share failed, downloading via save:', err);
      doc.save(filename);
    }
  } else {
    doc.save(filename);
  }
  return true;
}

/**
 * Generate and download an executive-grade Supplier Statement PDF
 */
export async function generateSupplierStatementPdf(supplier, banks = BANK_ACCOUNTS) {
  if (!supplier) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // 1. Header Banner
  doc.setFillColor(15, 60, 45); // Deep emerald green
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(52, 211, 153); // Emerald accent
  doc.rect(0, 27.2, pageWidth, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text(BUSINESS_INFO.name.toUpperCase(), pageWidth / 2, 13, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 240, 225);
  doc.text(
    `Supplier Procurement & Khata Ledger  •  Phone: ${BUSINESS_INFO.phone}  •  Attock, Punjab`,
    pageWidth / 2,
    20,
    { align: 'center' }
  );

  // Document Title Badge
  const badgeWidth = 105;
  const badgeHeight = 7.5;
  const badgeX = (pageWidth - badgeWidth) / 2;
  const badgeY = 32;

  doc.setFillColor(245, 253, 249);
  doc.setDrawColor(52, 211, 153);
  doc.setLineWidth(0.6);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'FD');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 80);
  doc.text('SUPPLIER ACCOUNT STATEMENT / KHATA', pageWidth / 2, badgeY + 5.2, { align: 'center' });

  // 2. Supplier Profile Card
  const cardY = 43;
  const cardHeight = 28;

  doc.setFillColor(250, 254, 252);
  doc.setDrawColor(200, 235, 220);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, cardY, contentWidth, cardHeight, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 110, 80);
  doc.text('SUPPLIER PARTY:', margin + 6, cardY + 6);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 60, 45);
  doc.text(supplier.name.toUpperCase(), margin + 6, cardY + 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  let detailY = cardY + 17;
  if (supplier.phone) {
    doc.text(`Phone / Mobile: ${supplier.phone}`, margin + 6, detailY);
    detailY += 4.5;
  }
  if (supplier.bank?.bankName) {
    doc.text(`Registered Bank: ${supplier.bank.bankName} (${supplier.bank.accountTitle || '-'})`, margin + 6, detailY);
  }

  // Right column: Date & Status
  const rightX = pageWidth - margin - 6;
  const todayFormatted = new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Statement Date: ${todayFormatted}`, rightX, cardY + 7, { align: 'right' });

  const statusBoxWidth = 58;
  const statusBoxHeight = 12;
  const statusBoxX = rightX - statusBoxWidth;
  const statusBoxY = cardY + 11;

  if (supplier.totalPayable === 0) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(52, 211, 153);
    doc.roundedRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text('ACCOUNT STATUS', statusBoxX + (statusBoxWidth / 2), statusBoxY + 4.5, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SETTLED (RS. 0)', statusBoxX + (statusBoxWidth / 2), statusBoxY + 9.2, { align: 'center' });
  } else if (supplier.totalPayable > 0) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(180, 83, 9);
    doc.text('PAYABLE BALANCE', statusBoxX + (statusBoxWidth / 2), statusBoxY + 4.5, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${supplier.totalPayable.toLocaleString()} (TO PAY)`, statusBoxX + (statusBoxWidth / 2), statusBoxY + 9.2, { align: 'center' });
  } else {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(96, 165, 250);
    doc.roundedRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(29, 78, 216);
    doc.text('ADVANCE BALANCE', statusBoxX + (statusBoxWidth / 2), statusBoxY + 4.5, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${Math.abs(supplier.totalPayable).toLocaleString()} (CREDIT)`, statusBoxX + (statusBoxWidth / 2), statusBoxY + 9.2, { align: 'center' });
  }

  // 3. Purchases Table
  const openingBal = Number(supplier.openingBalance) || 0;
  const openingType = supplier.openingBalanceType || 'credit';

  const tableRows = [];

  if (openingBal > 0) {
    tableRows.push([
      'Opening',
      `Previous Balance (${openingType === 'credit' ? "Credit / You'll Give" : "Debit / Advance"})`,
      '-',
      `Rs. ${openingBal.toLocaleString()}`,
      'Carried'
    ]);
  }

  if (supplier.purchases && supplier.purchases.length > 0) {
    supplier.purchases.forEach(p => {
      const d = new Date(p.date).toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const itemsSummary = p.items?.map(i => `${i.qty}x ${i.name}`).join(', ') || 'Raw Materials';
      tableRows.push([
        d,
        itemsSummary,
        `#${p.id}`,
        `Rs. ${Number(p.netTotal || 0).toLocaleString()}`,
        p.status || 'Pending'
      ]);
    });
  }

  // Payments paid to supplier
  if (supplier.payments && supplier.payments.length > 0) {
    supplier.payments.forEach(pmt => {
      const d = new Date(pmt.date).toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      tableRows.push([
        d,
        `Payment Paid (${pmt.paymentMethod || 'Cash'})${pmt.notes ? ` - ${pmt.notes}` : ''}`,
        `#${pmt.id}`,
        `- Rs. ${Number(pmt.amount || 0).toLocaleString()}`,
        'Paid'
      ]);
    });
  }

  autoTable(doc, {
    startY: cardY + cardHeight + 5,
    margin: { left: margin, right: margin },
    head: [['Date', 'Purchased Stock Description', 'Voucher #', 'Amount (Rs.)', 'Payment Status']],
    body: tableRows.length > 0 ? tableRows : [['-', 'No purchase transactions recorded.', '-', 'Rs. 0', 'Cleared']],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 60, 45],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 4,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 76 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
      textColor: [40, 40, 40],
      lineColor: [200, 235, 220],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 253, 250]
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 4) {
        if (data.cell.raw === 'Paid') {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (data.cell.raw === 'Pending' || data.cell.raw === 'Unpaid') {
          data.cell.styles.textColor = [217, 119, 6];
        } else if (data.cell.raw === 'Carried') {
          data.cell.styles.textColor = [37, 99, 235];
        }
      }
    }
  });

  // 4. Financial Summary
  let currentY = doc.lastAutoTable.finalY + 5;
  if (currentY + 70 > pageHeight) {
    doc.addPage();
    currentY = 18;
  }

  const summaryWidth = 92;
  const summaryX = pageWidth - margin - summaryWidth;

  doc.setFillColor(250, 254, 252);
  doc.setDrawColor(180, 225, 205);
  doc.setLineWidth(0.4);
  doc.roundedRect(summaryX, currentY, summaryWidth, 34, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text('Total Purchases:', summaryX + 5, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 60, 45);
  doc.text(`Rs. ${(supplier.totalPurchased || 0).toLocaleString()}`, summaryX + summaryWidth - 5, currentY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text('Total Amount Paid:', summaryX + 5, currentY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`Rs. ${(supplier.totalPaid || 0).toLocaleString()}`, summaryX + summaryWidth - 5, currentY + 13, { align: 'right' });

  if (openingBal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`Previous Balance (${openingType}):`, summaryX + 5, currentY + 19);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Rs. ${openingBal.toLocaleString()}`, summaryX + summaryWidth - 5, currentY + 19, { align: 'right' });
  }

  doc.setDrawColor(52, 211, 153);
  doc.setLineWidth(0.5);
  doc.line(summaryX + 4, currentY + 23, summaryX + summaryWidth - 4, currentY + 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 60, 45);
  doc.text('NET BALANCE PAYABLE:', summaryX + 5, currentY + 29.5);

  const dueColor = supplier.totalPayable > 0 ? [180, 83, 9] : (supplier.totalPayable < 0 ? [37, 99, 235] : [5, 150, 105]);
  doc.setTextColor(dueColor[0], dueColor[1], dueColor[2]);
  doc.setFontSize(10.5);
  doc.text(`Rs. ${supplier.totalPayable.toLocaleString()}`, summaryX + summaryWidth - 5, currentY + 29.5, { align: 'right' });

  // 5. Supplier Bank Account Box
  const supplierBankY = currentY + 40;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 80);
  doc.text('SUPPLIER REGISTERED BENEFICIARY DETAILS', margin, supplierBankY);

  const supBoxY = supplierBankY + 3;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 235, 220);
  doc.roundedRect(margin, supBoxY, contentWidth, 20, 2, 2, 'FD');

  if (supplier.bank?.bankName) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 60, 45);
    doc.text(`Bank: ${supplier.bank.bankName}`, margin + 5, supBoxY + 6);
    doc.text(`Title: ${supplier.bank.accountTitle || '-'}`, margin + 5, supBoxY + 11);

    doc.setFont('courier', 'bold');
    doc.setTextColor(15, 118, 80);
    doc.text(`IBAN: ${formatIbanReadable(supplier.bank.iban || supplier.bank.accountNo || '-')}`, margin + 5, supBoxY + 16);
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('No bank account information recorded for this supplier.', margin + 5, supBoxY + 11);
  }

  // Footer
  doc.setDrawColor(200, 235, 220);
  doc.setLineWidth(0.4);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(130, 130, 130);
  doc.text(
    'The Chocolate House • Supplier Procurement & Material Ledger Statement',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  const filename = `${supplier.name.replace(/[^a-zA-Z0-9]/g, '_')}_Supplier_Statement.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });
      await Share.share({
        title: filename,
        url: savedFile.uri,
        dialogTitle: 'Save / Share Supplier Statement'
      });
    } catch (err) {
      console.warn('Native share failed, downloading via save:', err);
      doc.save(filename);
    }
  } else {
    doc.save(filename);
  }
  return true;
}
