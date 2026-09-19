import React, { useRef, useState, useMemo } from 'react';
import { X, Share2, Printer, Copy, Check, Building2, Phone, FileText, Image as ImageIcon, CheckCircle, Clock, Share, FileSpreadsheet } from 'lucide-react';
import { BUSINESS_INFO, BANK_ACCOUNTS } from '../data/initialData';
import { exportElementAsHdImage, exportElementAsHdPdf } from '../utils/hdExport';
import { exportBillToExcel } from '../utils/excelExport';
import { shareBillText, openNativeShareSheet } from '../utils/shareUtils';

export default function InvoiceModal({ bill, onClose, banks = BANK_ACCOUNTS, onUpdateBillStatus }) {
  const cardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Status is directly derived from bill with immediate persistent toggle
  const currentStatus = bill?.status || 'Pending';

  const handleToggleStatus = () => {
    const nextStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
    onUpdateBillStatus?.(bill.id, nextStatus);
  };

  if (!bill) return null;

  const activeBanks = (banks && banks.length > 0) ? banks : BANK_ACCOUNTS;

  const formattedDate = new Date(bill.date).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const handleDownloadHdImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    await exportElementAsHdImage(cardRef.current, `TheChocolateHouse_Bill_${bill.id}.jpg`);
    setIsExporting(false);
  };

  const handleDownloadHdPdf = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    await exportElementAsHdPdf(cardRef.current, `TheChocolateHouse_Bill_${bill.id}.pdf`);
    setIsExporting(false);
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    await exportBillToExcel(bill, activeBanks, BUSINESS_INFO);
    setIsExporting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const prevBal = useMemo(() => {
    return Number(bill.previousBalance) || 0;
  }, [bill.previousBalance]);

  const generateWhatsAppMessage = () => {
    let msg = `*${BUSINESS_INFO.name.toUpperCase()}*\n`;
    msg += `Official Mobile Bill / Order Receipt\n`;
    msg += `═══════════════════════════\n`;
    msg += `🧾 *Invoice #:* ${bill.id}\n`;
    msg += `📅 *Date:* ${formattedDate}\n`;
    msg += `👤 *Customer:* ${bill.customerName || 'Walk-in'}\n`;
    if (bill.customerPhone) msg += `📞 *Phone:* ${bill.customerPhone}\n`;
    if (bill.deliveryAddress) msg += `📍 *Delivery Address:* ${bill.deliveryAddress}\n`;
    msg += `───────────────────────────\n`;
    msg += `*ORDER ITEMS:*\n`;

    bill.items.forEach((item, index) => {
      msg += `${index + 1}. *${item.name}*\n   ${item.qty} x Rs. ${item.price.toLocaleString()} = *Rs. ${item.total.toLocaleString()}*\n`;
    });

    msg += `───────────────────────────\n`;
    msg += `Subtotal: Rs. ${bill.subtotal.toLocaleString()}\n`;
    if (bill.discount > 0) {
      msg += `Discount: -Rs. ${bill.discount.toLocaleString()}\n`;
    }
    msg += `*Current Bill: Rs. ${bill.netTotal.toLocaleString()}*\n`;
    if (prevBal !== 0) {
      msg += `Previous Balance: *${prevBal > 0 ? `Rs. ${prevBal.toLocaleString()} (Pending Dues)` : `Rs. ${Math.abs(prevBal).toLocaleString()} (Advance)`}*\n`;
      const totalKhata = currentStatus === 'Paid' ? prevBal : (bill.netTotal + prevBal);
      msg += `*TOTAL KHATA BALANCE DUE: Rs. ${Math.abs(totalKhata).toLocaleString()} ${totalKhata > 0 ? '(Due)' : '(Adv)'}*\n`;
    }
    msg += `Payment Status: *${currentStatus.toUpperCase()}* (${bill.paymentMethod})\n`;
    msg += `═══════════════════════════\n`;
    msg += `💳 *OFFICIAL BANK ACCOUNTS:*\n\n`;

    activeBanks.forEach((bank) => {
      msg += `🏛 *${bank.bankName}*\n`;
      msg += `Title: ${bank.accountTitle}\n`;
      if (bank.accountNo) msg += `A/C: ${bank.accountNo}\n`;
      msg += `IBAN: ${bank.iban}\n\n`;
    });

    msg += `_Thank you for ordering with The Chocolate House!_`;
    return msg;
  };

  const handleWhatsAppShare = async () => {
    const text = generateWhatsAppMessage();
    await shareBillText({
      title: `Bill #${bill.id} - ${BUSINESS_INFO.name}`,
      text,
      phone: bill.customerPhone
    });
  };

  const handleNativeShare = async () => {
    const text = generateWhatsAppMessage();
    await openNativeShareSheet({
      title: `Bill #${bill.id} - ${BUSINESS_INFO.name}`,
      text
    });
  };

  const handleCopyText = async () => {
    const text = generateWhatsAppMessage();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
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
        zIndex: 100,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '20px 14px 100px 14px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Top Actions (Sticky & Clean) */}
        <div
          className="no-print"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            background: 'rgba(28, 16, 10, 0.96)',
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold-light)' }}>
              HD Mobile Bill
            </span>

            {/* Quick Status Toggle Button */}
            <button
              onClick={handleToggleStatus}
              style={{
                background: currentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: currentStatus === 'Paid' ? '#34d399' : '#fbbf24',
                border: `1px solid ${currentStatus === 'Paid' ? '#10b981' : '#f59e0b'}`,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Click to toggle Paid / Unpaid"
            >
              {currentStatus === 'Paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
              <span>{currentStatus === 'Paid' ? 'Paid' : 'Unpaid'}</span>
            </button>
          </div>

          <button 
            onClick={onClose} 
            className="btn-icon" 
            style={{ width: '32px', height: '32px' }}
            title="Close Bill"
          >
            <X size={16} />
          </button>
        </div>

        {/* THE HD MOBILE SIZE BILL CARD (Target for html2canvas & Print) */}
        <div
          ref={cardRef}
          className="receipt-sheet"
          style={{
            background: '#ffffff',
            color: '#1a0f08',
            borderRadius: '16px',
            padding: '24px 18px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
            border: '1px solid #dcd1c3',
            fontFamily: "'Outfit', sans-serif",
            position: 'relative'
          }}
        >
          {/* Top Gold Accent Bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #c59b4c, #e2b265, #ba8339)' }} />

          {/* Header Brand Section */}
          <div style={{ textAlign: 'center', paddingBottom: '14px', borderBottom: '2px dashed #cfbfaa', marginTop: '4px' }}>
            <img
              src={BUSINESS_INFO.logoUrl}
              alt="Logo"
              style={{
                width: '66px',
                height: '66px',
                borderRadius: '50%',
                objectFit: 'cover',
                margin: '0 auto 6px auto',
                display: 'block',
                border: '2px solid #5a301a',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}
            />
            <h2 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '0.04em', color: '#2b160b', margin: 0, lineHeight: 1.2 }}>
              {BUSINESS_INFO.name.toUpperCase()}
            </h2>
            <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#82563a', marginTop: '2px', fontWeight: '700' }}>
              {BUSINESS_INFO.tagline}
            </div>
            <div style={{ fontSize: '12px', color: '#523f33', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: '600' }}>
              <Phone size={11} color="#5a301a" />
              <span>{BUSINESS_INFO.phone}</span>
            </div>
          </div>

          {/* Bill Meta Data */}
          <div style={{ fontSize: '12px', lineHeight: 1.55, margin: '12px 0', background: '#faf6f0', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ebd9c8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#725e51' }}>Invoice No:</span>
              <strong style={{ color: '#2b160b', fontSize: '13px' }}>{bill.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#725e51' }}>Date / Time:</span>
              <span>{formattedDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#725e51' }}>Customer:</span>
              <span style={{ fontWeight: '700', color: '#2b160b' }}>{bill.customerName || 'Online Customer'}</span>
            </div>
            {bill.customerPhone && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#725e51' }}>Phone:</span>
                <span>{bill.customerPhone}</span>
              </div>
            )}
            {bill.deliveryAddress && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#725e51' }}>Delivery:</span>
                <span style={{ textAlign: 'right', maxWidth: '60%' }}>{bill.deliveryAddress}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px dotted #ddccbc' }}>
              <span style={{ color: '#725e51' }}>Payment Status:</span>
              <span
                style={{
                  color: currentStatus === 'Paid' ? '#047857' : '#b45309',
                  background: currentStatus === 'Paid' ? '#d1fae5' : '#fef3c7',
                  border: `1px solid ${currentStatus === 'Paid' ? '#10b981' : '#f59e0b'}`,
                  fontWeight: '800',
                  fontSize: '10.5px',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}
              >
                {currentStatus === 'Paid' ? 'PAID' : 'UNPAID / PENDING'}
              </span>
            </div>
          </div>

          {/* Chocolate Items Table */}
          <div style={{ marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #5a301a', textAlign: 'left', color: '#4a2b1a', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 2px', width: '56%' }}>Chocolate</th>
                  <th style={{ padding: '6px 2px', textAlign: 'center', width: '14%' }}>Qty</th>
                  <th style={{ padding: '6px 2px', textAlign: 'right', width: '30%' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px dashed #ded4c8' }}>
                    <td style={{ padding: '7px 2px' }}>
                      <div style={{ fontWeight: '600', color: '#221208', lineHeight: 1.25 }}>{item.name}</div>
                      <div style={{ fontSize: '10.5px', color: '#7a685b' }}>@ Rs. {item.price.toLocaleString()}</div>
                    </td>
                    <td style={{ padding: '7px 2px', textAlign: 'center', fontWeight: '700', color: '#331a0e' }}>
                      {item.qty}
                    </td>
                    <td style={{ padding: '7px 2px', textAlign: 'right', fontWeight: '700', color: '#2b160b' }}>
                      Rs. {item.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div style={{ borderTop: '2px solid #5a301a', paddingTop: '8px', fontSize: '12.5px', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#554236' }}>
              <span>Subtotal:</span>
              <span>Rs. {bill.subtotal.toLocaleString()}</span>
            </div>
            {bill.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <span>Discount:</span>
                <span>- Rs. {bill.discount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', fontWeight: '700', color: '#2b1407', borderTop: '1.5px dashed #5a301a', marginTop: '6px', paddingTop: '6px' }}>
              <span>CURRENT BILL:</span>
              <span style={{ color: '#884a1e', fontSize: '16px' }}>Rs. {bill.netTotal.toLocaleString()}</span>
            </div>

            {prevBal !== 0 && (
              <div style={{ 
                margin: '6px 0', 
                padding: '6px 8px', 
                borderRadius: '6px', 
                background: prevBal > 0 ? '#fef3c7' : '#eff6ff', 
                border: `1px solid ${prevBal > 0 ? '#f59e0b' : '#93c5fd'}`,
                fontSize: '11.5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: prevBal > 0 ? '#b45309' : '#1d4ed8', fontWeight: '700' }}>
                  <span>{prevBal > 0 ? 'Previous Unpaid Dues:' : 'Customer Advance Credit:'}</span>
                  <span>{prevBal > 0 ? `+ Rs. ${prevBal.toLocaleString()}` : `- Rs. ${Math.abs(prevBal).toLocaleString()}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e1b4b', fontWeight: '800', marginTop: '3px', borderTop: '1px dotted rgba(0,0,0,0.15)', paddingTop: '3px', fontSize: '12.5px' }}>
                  <span>{currentStatus === 'Paid' ? 'Remaining Khata Balance:' : 'Total Khata Balance Due:'}</span>
                  <span>Rs. {Math.abs(currentStatus === 'Paid' ? prevBal : (bill.netTotal + prevBal)).toLocaleString()} { (currentStatus === 'Paid' ? prevBal : (bill.netTotal + prevBal)) > 0 ? '(Due)' : '(Adv)' }</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', fontWeight: '800', color: '#2b1407', borderTop: prevBal !== 0 ? 'none' : '1.5px dashed #5a301a', marginTop: '2px' }}>
              <span>NET PAYABLE:</span>
              <span style={{ color: '#884a1e', fontSize: '18px' }}>Rs. {bill.netTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Memo / Notes Box */}
          {bill.notes && (
            <div style={{ marginTop: '10px', background: '#faf3eb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2cfbd', fontSize: '11px' }}>
              <strong style={{ color: '#5a301a' }}>Memo / Notes: </strong>
              <span style={{ color: '#3a2214' }}>{bill.notes}</span>
            </div>
          )}

          {/* Official Bank Accounts Box */}
          <div style={{ marginTop: '12px', background: '#f5eee6', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d9c7b5', fontSize: '10.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', color: '#4a2614', fontWeight: '800', letterSpacing: '0.04em' }}>
              <Building2 size={13} />
              <span>OFFICIAL BANK ACCOUNTS FOR PAYMENT:</span>
            </div>

            {activeBanks.map((b) => (
              <div key={b.id} style={{ marginBottom: '5px', borderBottom: '1px dotted #d1c0ae', paddingBottom: '3px', lineHeight: 1.35 }}>
                <strong style={{ color: '#2b160b' }}>{b.bankName}</strong>: {b.accountTitle}<br />
                {b.accountNo && <span>A/C: {b.accountNo} | </span>}
                <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>IBAN: {b.iban}</span>
              </div>
            ))}
          </div>

          {/* Receipt Footer */}
          <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: '#7a685b' }}>
            <div style={{ fontWeight: '600', color: '#442516' }}>🍫 Thank you for ordering with us!</div>
            <div style={{ fontSize: '10px', marginTop: '2px' }}>The Chocolate House • 03353465000</div>
          </div>
        </div>

        {/* EXPORT BUTTONS ROW (Completely scrollable & accessible) */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '14px' }}>
          
          <button
            onClick={handleDownloadHdImage}
            disabled={isExporting}
            className="btn-gold"
            style={{ padding: '12px 8px', fontSize: '13px' }}
          >
            <ImageIcon size={16} />
            <span>{isExporting ? 'Preparing Image...' : 'Share HD Photo'}</span>
          </button>

          <button
            onClick={handleDownloadHdPdf}
            disabled={isExporting}
            className="btn-secondary"
            style={{ padding: '12px 8px', fontSize: '13px' }}
          >
            <FileText size={16} color="var(--gold-light)" />
            <span>{isExporting ? 'Preparing PDF...' : 'Share PDF'}</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={isExporting}
            className="btn-secondary"
            style={{ padding: '12px 8px', fontSize: '13px', borderColor: '#10b981', color: '#34d399' }}
            title="Download formatted Excel spreadsheet with calculation formulas"
          >
            <FileSpreadsheet size={16} color="#10b981" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="btn-secondary"
            style={{ padding: '12px 8px', fontSize: '13px', borderColor: '#25D366', color: '#4ade80' }}
          >
            <Share2 size={16} color="#25D366" />
            <span>WhatsApp Bill</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="btn-secondary"
            style={{ padding: '12px 8px', fontSize: '13px', borderColor: 'var(--gold-primary)', color: 'var(--gold-light)' }}
          >
            <Share size={16} />
            <span>Share Sheet</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn-secondary"
            style={{ gridColumn: 'span 2', padding: '10px 8px', fontSize: '13px', opacity: 0.85 }}
          >
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>

        </div>

      </div>
    </div>
  );
}
