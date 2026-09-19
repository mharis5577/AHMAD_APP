import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle, Plus, Eye, ArrowRight, ShieldCheck, Database, DollarSign, Sparkles, Trash2 } from 'lucide-react';
import { parseExcelOrCsvFile, downloadPreviousDataTemplate } from '../utils/excelExport';
import { importPreviousBillsAndParties, loadDemoMemoData, deleteMemoData, ACCOUNT_MAIN } from '../utils/storage';
import { showAppAlert } from '../utils/dialog';

export default function PreviousDataModal({ isOpen, onClose, onDataImported }) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('excel'); // 'excel' or 'manual'
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [importing, setImporting] = useState(false);

  // Manual Quick Entry State
  const [manualInvoiceNo, setManualInvoiceNo] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualCustomer, setManualCustomer] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualOpeningBal, setManualOpeningBal] = useState('');
  const [manualOpeningType, setManualOpeningType] = useState('debit');
  const [manualItemDesc, setManualItemDesc] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualStatus, setManualStatus] = useState('Paid');
  const [manualMethod, setManualMethod] = useState('Cash');

  if (!isOpen) return null;

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const result = await parseExcelOrCsvFile(file);
      setParsedData(result);
      showAppAlert({
        title: 'File Parsed Successfully',
        message: `Found ${result.totalRows} records in sheet "${result.sheetName}". You can preview them below before confirming.`,
        type: 'success'
      });
    } catch (err) {
      console.error('File parsing error:', err);
      showAppAlert({
        title: 'Upload Error',
        message: 'Failed to parse file: ' + (err?.message || 'Invalid format'),
        type: 'error'
      });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmBulkImport = () => {
    if (!parsedData || !parsedData.rows || parsedData.rows.length === 0) return;

    setImporting(true);
    try {
      const { countBills, countParties } = importPreviousBillsAndParties(parsedData.rows, ACCOUNT_MAIN);
      showAppAlert({
        title: 'Import Successful! 📦',
        message: `Successfully imported ${countBills} previous sale bills and registered ${countParties} customers directly into your Main Store Account.`,
        type: 'success'
      });
      setParsedData(null);
      onDataImported?.(ACCOUNT_MAIN);
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      showAppAlert({
        title: 'Import Failed',
        message: 'Could not import records: ' + (err?.message || 'Unknown error'),
        type: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleLoadSampleData = () => {
    loadDemoMemoData(ACCOUNT_MAIN);
    showAppAlert({
      title: 'Demo & Memo Data Loaded! 🎉',
      message: 'Loaded 8 imported chocolate items, customer cash memos, wholesale purchases, and general ledger capital/expense entries into your Main Store Account.',
      type: 'success'
    });
    onDataImported?.(ACCOUNT_MAIN);
    onClose();
  };

  const handleDeleteMemoData = () => {
    deleteMemoData(ACCOUNT_MAIN);
    showAppAlert({
      title: 'Memo Data Deleted! 🗑️',
      message: 'All sample demo items, cash memos, wholesale purchases, and demo ledger entries have been permanently deleted from your Main Store Account.',
      type: 'success'
    });
    onDataImported?.(ACCOUNT_MAIN);
    onClose();
  };

  const handleSaveManualRecord = (e) => {
    e.preventDefault();
    const billAmount = Number(manualAmount) || 0;
    const openingBal = Number(manualOpeningBal) || 0;

    if (billAmount <= 0 && openingBal <= 0) {
      showAppAlert({
        title: 'Amount Required',
        message: 'Please enter a bill amount or a previous balance amount.',
        type: 'warning'
      });
      return;
    }

    const finalAmount = billAmount > 0 ? billAmount : openingBal;

    const record = {
      id: manualInvoiceNo.trim() || `OLD-${Math.floor(10000 + Math.random() * 90000)}`,
      date: manualDate ? new Date(manualDate).toISOString() : new Date().toISOString(),
      customerName: manualCustomer.trim() || 'Walk-in Customer',
      customerPhone: manualPhone.trim(),
      address: manualAddress.trim(),
      itemName: manualItemDesc.trim() || (openingBal > 0 ? 'Previous Balance (Past Udhaar)' : 'Previous App Sale'),
      qty: 1,
      price: finalAmount,
      amount: finalAmount,
      openingBalance: openingBal,
      openingBalanceType: manualOpeningType,
      status: billAmount > 0 ? manualStatus : (manualOpeningType === 'debit' ? 'Pending' : 'Paid'),
      paymentMethod: manualMethod
    };

    const { countBills, countParties } = importPreviousBillsAndParties([record], ACCOUNT_MAIN);
    if (countBills > 0 || countParties > 0) {
      showAppAlert({
        title: 'Record Added! 📦',
        message: `Added directly into your Main Store Account.`,
        type: 'success'
      });

      // Reset form
      setManualInvoiceNo('');
      setManualCustomer('');
      setManualPhone('');
      setManualAddress('');
      setManualOpeningBal('');
      setManualOpeningType('debit');
      setManualItemDesc('');
      setManualAmount('');

      onDataImported?.(ACCOUNT_MAIN);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="glass-card" 
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--gold-primary)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
        }}
      >
        
        {/* Modal Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <Database size={20} color="#34d399" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                Add Previous App Data
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>
                Import past sales, bills & customers from another app
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: '32px', height: '32px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Destination Info Banner */}
        <div style={{ padding: '10px 18px', background: 'rgba(212, 163, 89, 0.08)', borderBottom: '1px solid rgba(212, 163, 89, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={15} color="var(--gold-primary)" />
            <span style={{ fontSize: '12px', color: 'var(--gold-light)', fontWeight: '600' }}>
              Target: <strong style={{ color: '#fff' }}>Main Store Account</strong> (Unified Sales, Khata & Ledger)
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            All past sales, udhaar & customers will be merged into your primary store data
          </span>
        </div>

        {/* Tab Switcher: Excel Import vs Manual Entry vs Load Demo / Memo Data */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', overflowX: 'auto' }}>
          <button
            onClick={() => setActiveTab('excel')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'excel' ? 'var(--gold-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'excel' ? '2px solid var(--gold-primary)' : '2px solid transparent',
              fontWeight: activeTab === 'excel' ? '800' : '600',
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'manual' ? 'var(--gold-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'manual' ? '2px solid var(--gold-primary)' : '2px solid transparent',
              fontWeight: activeTab === 'manual' ? '800' : '600',
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap'
            }}
          >
            <Plus size={15} />
            <span>Manual Past Bill</span>
          </button>

          <button
            onClick={() => setActiveTab('memo')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'memo' ? '#fbbf24' : 'var(--text-muted)',
              borderBottom: activeTab === 'memo' ? '2px solid #fbbf24' : '2px solid transparent',
              fontWeight: activeTab === 'memo' ? '800' : '600',
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap'
            }}
          >
            <Sparkles size={15} color="#fbbf24" />
            <span>Demo / Memo Data</span>
          </button>
        </div>

        {/* Tab 1: Excel / CSV Importer */}
        {activeTab === 'excel' && (
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            
            {/* Upload Zone */}
            <div 
              style={{
                border: '2px dashed rgba(212, 163, 89, 0.4)',
                borderRadius: '14px',
                padding: '24px 16px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={36} color="var(--gold-primary)" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--text-main)' }}>
                Click to Upload Excel (.xlsx, .xls) or CSV
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)' }}>
                Automatic mapping of Invoice #, Customer Name, Phone, Items & Amounts
              </p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileSelected} 
              />
            </div>

            {/* Template Download & Info Bar */}
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={downloadPreviousDataTemplate}
                className="btn-secondary"
                style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
              >
                <Download size={14} />
                <span>Download Sample Excel Template</span>
              </button>

              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Supports standard formats from Excel, Vyapar, and Khata apps
              </span>
            </div>

            {/* Loading state */}
            {isParsing && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gold-light)' }}>
                <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
                <span>Reading and parsing spreadsheet...</span>
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedData && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gold-light)' }}>
                    Preview: {parsedData.totalRows} Records Found
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Total Volume: Rs. {parsedData.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.06)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px' }}>#</th>
                        <th style={{ padding: '8px' }}>Bill #</th>
                        <th style={{ padding: '8px' }}>Customer</th>
                        <th style={{ padding: '8px' }}>Phone</th>
                        <th style={{ padding: '8px' }}>Amount</th>
                        <th style={{ padding: '8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 50).map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{i + 1}</td>
                          <td style={{ padding: '6px 8px', fontWeight: '700', color: 'var(--gold-primary)' }}>{r.id}</td>
                          <td style={{ padding: '6px 8px' }}>{r.customerName}</td>
                          <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{r.customerPhone || '-'}</td>
                          <td style={{ padding: '6px 8px', fontWeight: '700' }}>Rs. {r.amount.toLocaleString()}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{ color: r.status === 'Paid' ? '#34d399' : '#fbbf24' }}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {parsedData.totalRows > 50 && (
                  <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '6px' }}>
                    Showing first 50 rows of {parsedData.totalRows} total rows.
                  </div>
                )}

                <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleConfirmBulkImport}
                    disabled={importing}
                    className="btn-gold"
                    style={{ flex: 1, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <CheckCircle size={16} />
                    <span>{importing ? 'Importing Data...' : `Confirm & Import ${parsedData.totalRows} Records`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParsedData(null)}
                    className="btn-secondary"
                    style={{ padding: '12px 18px', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Manual Past Record Entry */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSaveManualRecord} style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              
              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Invoice / Bill # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. OLD-101"
                  value={manualInvoiceNo}
                  onChange={(e) => setManualInvoiceNo(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Customer Name</label>
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={manualCustomer}
                  onChange={(e) => setManualCustomer(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="0300..."
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px' }}
                />
              </div>

              {/* PREVIOUS / OPENING BALANCE: Friendly & Clear */}
              <div style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <DollarSign size={14} color="var(--gold-primary)" />
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-light)' }}>
                    Previous Balance (Past Udhaar / Advance)
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount (Rs.)"
                    value={manualOpeningBal}
                    onChange={(e) => setManualOpeningBal(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(20, 11, 7, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px', fontWeight: '700' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setManualOpeningType('debit')}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        lineHeight: '1.25',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: manualOpeningType === 'debit' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                        background: manualOpeningType === 'debit' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: manualOpeningType === 'debit' ? '#fbbf24' : 'var(--text-muted)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Customer Owes You (Dues)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualOpeningType('credit')}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        lineHeight: '1.25',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: manualOpeningType === 'credit' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                        background: manualOpeningType === 'credit' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: manualOpeningType === 'credit' ? '#34d399' : 'var(--text-muted)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Customer Paid Advance
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '5px', lineHeight: '1.4' }}>
                  {manualOpeningType === 'debit' 
                    ? "👉 Customer owes past unpaid bills (Will be added to their due amount)."
                    : "👉 Customer paid advance cash into store (Will be deducted from future orders)."}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Item Description / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Imported Chocolates Box / Past Invoice"
                  value={manualItemDesc}
                  onChange={(e) => setManualItemDesc(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--gold-light)' }}>Total Bill Amount (Rs.)</label>
                <input
                  type="number"
                  placeholder="e.g. 4500 (or leave 0 if opening balance only)"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '14px', fontWeight: '800', borderColor: 'var(--gold-primary)' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Payment Status</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px' }}
                >
                  <option value="Paid">Paid (Settled)</option>
                  <option value="Pending">Pending (Unpaid Due)</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Payment Method</label>
                <select
                  value={manualMethod}
                  onChange={(e) => setManualMethod(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '12.5px' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Credit / Khata">Credit / Khata</option>
                </select>
              </div>

            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                type="submit"
                className="btn-gold"
                style={{ width: '100%', padding: '12px', fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Plus size={16} />
                <span>Add Record to Main Store Account</span>
              </button>
            </div>

          </form>
        )}

        {/* Tab 3: Demo & Cash Memo Dataset Loader */}
        {activeTab === 'memo' && (
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            
            <div style={{ background: 'rgba(212, 163, 89, 0.1)', border: '1px solid rgba(212, 163, 89, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Sparkles size={18} color="var(--gold-primary)" />
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--gold-light)', fontWeight: '800' }}>
                  Ready-to-Use Demo & Cash Memo Dataset
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                Quickly populate your <strong>Main Store Account</strong> with realistic imported chocolate inventory, customer cash memos, wholesale supplier invoices, and general ledger capital/expense entries.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontWeight: '700', color: 'var(--gold-light)' }}>🍫 8 Inventory Items</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '11px', lineHeight: '1.4' }}>Ferrero Rocher T16, Lindt 85%, Nutella 750g, Godiva Ganache, Toblerone, Cadbury Silk & Raffaello.</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontWeight: '700', color: '#34d399' }}>🧾 3 Sale Cash Memos</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '11px', lineHeight: '1.4' }}>Cash Memos with item breakdowns, customer phones, addresses, and special packing memo notes.</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontWeight: '700', color: '#60a5fa' }}>👥 Khata Customers & Suppliers</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '11px', lineHeight: '1.4' }}>Bilal Khan (Past Udhaar: Rs. 4,500), Ayesha (Advance: Rs. 1,500), and Al-Madina Wholesale Importers.</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontWeight: '700', color: '#fbbf24' }}>📈 General Ledger Flow</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '11px', lineHeight: '1.4' }}>Rs. 800,000 Capital Invested, Shop Rent, K-Electric, Packaging with detailed transaction memos.</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoadSampleData}
              className="btn-gold"
              style={{ width: '100%', padding: '13px', fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}
            >
              <Sparkles size={16} />
              <span>Load Demo & Cash Memo Records into Store</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteMemoData}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#f87171',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Trash2 size={16} />
              <span>Delete / Purge All Demo & Memo Records</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
