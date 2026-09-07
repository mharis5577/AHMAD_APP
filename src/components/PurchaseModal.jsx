import React, { useRef, useState } from 'react';
import { X, Share2, Printer, Copy, Check, Building2, Phone, FileText, Image as ImageIcon, CheckCircle, Clock } from 'lucide-react';
import { BUSINESS_INFO } from '../data/initialData';
import { exportElementAsHdImage, exportElementAsHdPdf } from '../utils/hdExport';

export default function PurchaseModal({ purchase, onClose }) {
  const cardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(purchase?.status || 'Pending');

  if (!purchase) return null;

  const formattedDate = new Date(purchase.date).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const handleDownloadHdImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    await exportElementAsHdImage(cardRef.current, `TheChocolateHouse_Purchase_${purchase.id}.jpg`);
    setIsExporting(false);
  };

  const handleDownloadHdPdf = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    await exportElementAsHdPdf(cardRef.current, `TheChocolateHouse_Purchase_${purchase.id}.pdf`);
    setIsExporting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const generateWhatsAppMessage = () => {
    let msg = `🍫 *${BUSINESS_INFO.name.toUpperCase()} — PURCHASE VOUCHER*\n`;
    msg += `═══════════════════════════\n`;
    msg += `🧾 *VOUCHER #${purchase.id}*\n`;
    msg += `📅 Date: ${formattedDate}\n`;
    msg += `🏢 Supplier: *${purchase.supplierName}*\n`;
    if (purchase.supplierPhone) msg += `📞 Phone: ${purchase.supplierPhone}\n`;
    msg += `═══════════════════════════\n`;
    msg += `*PURCHASED STOCK ITEMS:*\n\n`;

    purchase.items.forEach((item, index) => {
      msg += `${index + 1}. *${item.name}*\n   ${item.qty} x Rs. ${item.price.toLocaleString()} = *Rs. ${item.total.toLocaleString()}*\n`;
    });

    msg += `───────────────────────────\n`;
    msg += `Subtotal: Rs. ${purchase.subtotal.toLocaleString()}\n`;
    if (purchase.discount > 0) {
      msg += `Discount: -Rs. ${purchase.discount.toLocaleString()}\n`;
    }
    msg += `*NET TOTAL: Rs. ${purchase.netTotal.toLocaleString()}*\n`;
    msg += `Payment Status: *${currentStatus.toUpperCase()}*\n`;
    if (purchase.paidFromBank) msg += `Paid From: ${purchase.paidFromBank}\n`;
    if (purchase.txRef) msg += `Tx Ref / Proof: ${purchase.txRef}\n`;

    if (purchase.supplierBank?.bankName) {
      msg += `═══════════════════════════\n`;
      msg += `💳 *SUPPLIER BENEFICIARY ACCOUNT:*\n`;
      msg += `Bank: ${purchase.supplierBank.bankName}\n`;
      msg += `Title: ${purchase.supplierBank.accountTitle}\n`;
      if (purchase.supplierBank.accountNo) msg += `A/C: ${purchase.supplierBank.accountNo}\n`;
      if (purchase.supplierBank.iban) msg += `IBAN: ${purchase.supplierBank.iban}\n`;
    }

    msg += `\n_The Chocolate House Stock Procurement Record_`;
    return msg;
  };

  const handleWhatsAppShare = () => {
    const text = generateWhatsAppMessage();
    const encoded = encodeURIComponent(text);
    const phone = purchase.supplierPhone ? purchase.supplierPhone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phone.startsWith('0') ? '92' + phone.slice(1) : phone;

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
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
        {/* Top Actions */}
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
              Purchase Voucher
            </span>

            <button
              onClick={() => setCurrentStatus(prev => prev === 'Paid' ? 'Pending' : 'Paid')}
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
              title="Toggle Paid / Pending"
            >
              {currentStatus === 'Paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
              <span>{currentStatus === 'Paid' ? 'Paid' : 'Payable (Unpaid)'}</span>
            </button>
          </div>

          <button onClick={onClose} className="btn-icon" style={{ width: '32px', height: '32px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Printable Voucher Card */}
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
          {/* Top Emerald Accent Bar for Purchases */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #10b981, #059669, #d4a359)' }} />

          {/* Header */}
          <div style={{ textAlign: 'center', paddingBottom: '12px', borderBottom: '2px dashed #cfbfaa', marginTop: '4px' }}>
            <img
              src={BUSINESS_INFO.logoUrl}
              alt="Logo"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                objectFit: 'cover',
                margin: '0 auto 6px auto',
                display: 'block',
                border: '2px solid #5a301a'
              }}
            />
            <h2 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.04em', color: '#2b160b', margin: 0 }}>
              STOCK PURCHASE VOUCHER
            </h2>
            <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#82563a', marginTop: '2px', fontWeight: '700' }}>
              {BUSINESS_INFO.name} — Procurement
            </div>
          </div>

          {/* Voucher Details */}
          <div style={{ fontSize: '12px', lineHeight: 1.55, margin: '12px 0', background: '#f6fbf9', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1ebd8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#557262' }}>Voucher No:</span>
              <strong style={{ color: '#064e3b', fontSize: '13px' }}>{purchase.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#557262' }}>Date:</span>
              <span>{formattedDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#557262' }}>Supplier:</span>
              <span style={{ fontWeight: '700', color: '#2b160b' }}>{purchase.supplierName}</span>
            </div>
            {purchase.supplierPhone && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#557262' }}>Supplier Phone:</span>
                <span>{purchase.supplierPhone}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px dotted #c2e2cc' }}>
              <span style={{ color: '#557262' }}>Payment Status:</span>
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
                {currentStatus === 'Paid' ? 'PAID' : 'PAYABLE (DUE)'}
              </span>
            </div>
          </div>

          {/* Purchased Items Table */}
          <div style={{ marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #064e3b', textAlign: 'left', color: '#064e3b', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 2px', width: '56%' }}>Stock Item</th>
                  <th style={{ padding: '6px 2px', textAlign: 'center', width: '14%' }}>Qty</th>
                  <th style={{ padding: '6px 2px', textAlign: 'right', width: '30%' }}>Cost (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item, idx) => (
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

          {/* Totals */}
          <div style={{ borderTop: '2px solid #064e3b', paddingTop: '8px', fontSize: '12.5px', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#554236' }}>
              <span>Subtotal:</span>
              <span>Rs. {purchase.subtotal.toLocaleString()}</span>
            </div>
            {purchase.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <span>Discount:</span>
                <span>- Rs. {purchase.discount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', fontWeight: '800', color: '#2b1407', borderTop: '1.5px dashed #064e3b', marginTop: '6px', paddingTop: '6px' }}>
              <span>TOTAL PURCHASE:</span>
              <span style={{ color: '#065f46', fontSize: '18px' }}>Rs. {purchase.netTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Supplier Beneficiary Bank Account (if provided) */}
          {purchase.supplierBank?.bankName && (
            <div style={{ marginTop: '14px', background: '#f5eee6', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d9c7b5', fontSize: '10.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', color: '#4a2614', fontWeight: '800' }}>
                <Building2 size={13} />
                <span>SUPPLIER BENEFICIARY BANK ACCOUNT:</span>
              </div>
              <div>
                <strong>{purchase.supplierBank.bankName}</strong><br />
                Title: {purchase.supplierBank.accountTitle}<br />
                {purchase.supplierBank.accountNo && <span>A/C: {purchase.supplierBank.accountNo} | </span>}
                {purchase.supplierBank.iban && <span style={{ fontFamily: 'monospace' }}>IBAN: {purchase.supplierBank.iban}</span>}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '10.5px', color: '#7a685b' }}>
            <div>The Chocolate House • Procurement & Stock Register</div>
            {purchase.txRef && <div style={{ marginTop: '2px' }}>Tx Ref: {purchase.txRef}</div>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '14px' }}>
          <button onClick={handleDownloadHdImage} disabled={isExporting} className="btn-gold" style={{ padding: '12px 8px', fontSize: '13px' }}>
            <ImageIcon size={16} />
            <span>{isExporting ? 'Saving...' : 'Save HD Voucher'}</span>
          </button>

          <button onClick={handleDownloadHdPdf} disabled={isExporting} className="btn-secondary" style={{ padding: '12px 8px', fontSize: '13px' }}>
            <FileText size={16} color="var(--gold-light)" />
            <span>Download PDF</span>
          </button>

          <button onClick={handleWhatsAppShare} className="btn-secondary" style={{ padding: '12px 8px', fontSize: '13px', borderColor: '#25D366', color: '#4ade80' }}>
            <Share2 size={16} color="#25D366" />
            <span>WhatsApp Supplier</span>
          </button>

          <button onClick={handlePrint} className="btn-secondary" style={{ padding: '12px 8px', fontSize: '13px' }}>
            <Printer size={16} />
            <span>Print Voucher</span>
          </button>
        </div>

      </div>
    </div>
  );
}
