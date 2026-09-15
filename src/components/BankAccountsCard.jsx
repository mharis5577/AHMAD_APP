import React, { useState, useRef } from 'react';
import { Building2, Copy, Check, Share2, Edit2, Plus, Trash2, RotateCcw, X, Save, Eye, Sparkles } from 'lucide-react';
import { BUSINESS_INFO, BANK_ACCOUNTS as DEFAULT_BANKS } from '../data/initialData';
import { shareBillText } from '../utils/shareUtils';

const COMMON_BANKS = [
  { name: 'Meezan Bank', code: 'MEZN' },
  { name: 'Dubai Islamic Bank', code: 'DIB' },
  { name: 'United Bank Limited (UBL)', code: 'UBL' },
  { name: 'Habib Bank Limited (HBL)', code: 'HBL' },
  { name: 'Bank Alfalah', code: 'BAFL' },
  { name: 'MCB Bank', code: 'MCB' },
  { name: 'Faysal Bank', code: 'FABL' },
  { name: 'Standard Chartered', code: 'SCB' },
  { name: 'Easypaisa', code: 'EP' },
  { name: 'JazzCash', code: 'JC' },
  { name: 'Nayapay', code: 'NAYA' },
  { name: 'SadaPay', code: 'SADA' }
];

export default function BankAccountsCard({ banks = DEFAULT_BANKS, onUpdateBanks }) {
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingBank, setEditingBank] = useState(null); // bank object being edited
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState(null);

  const formRef = useRef(null);

  // Form states for edit/add
  const [bankName, setBankName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [iban, setIban] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareBankDetailsWhatsApp = async () => {
    let text = `🍫 *${BUSINESS_INFO.name.toUpperCase()}*\n`;
    text += `Official Bank Accounts for Online Transfer:\n\n`;

    banks.forEach((b) => {
      text += `🏛 *${b.bankName}*\n`;
      text += `• Title: ${b.accountTitle}\n`;
      if (b.accountNo) text += `• A/C: ${b.accountNo}\n`;
      text += `• IBAN: ${b.iban}\n\n`;
    });

    text += `📞 Official WhatsApp / Help: ${BUSINESS_INFO.phone}\n`;
    text += `_Please share screenshot after transfer._`;

    await shareBillText({
      title: 'Official Bank Accounts',
      text
    });
  };

  const handleStartEdit = (bank) => {
    setEditingBank(bank);
    setBankName(bank.bankName);
    setShortCode(bank.shortCode || bank.bankName.slice(0, 4).toUpperCase());
    setAccountTitle(bank.accountTitle);
    setAccountNo(bank.accountNo || '');
    setIban(bank.iban);
    setIsAdding(false);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleStartAdd = () => {
    setEditingBank({ id: `bank_${Date.now()}` });
    setBankName('');
    setShortCode('');
    setAccountTitle('The chocolate house');
    setAccountNo('');
    setIban('PK');
    setIsAdding(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSelectQuickBank = (item) => {
    setBankName(item.name);
    setShortCode(item.code);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!bankName.trim() || !accountTitle.trim() || !iban.trim()) {
      alert('Please fill in Bank Name, Account Title, and IBAN!');
      return;
    }

    const updatedBank = {
      id: editingBank.id,
      bankName: bankName.trim(),
      shortCode: (shortCode.trim() || bankName.trim().slice(0, 4)).toUpperCase(),
      accountTitle: accountTitle.trim(),
      accountNo: accountNo.trim(),
      iban: iban.trim().toUpperCase()
    };

    if (isAdding) {
      const updatedList = [...banks, updatedBank];
      onUpdateBanks?.(updatedList);
      showToast(`✓ Added "${updatedBank.bankName}" to official accounts!`);
    } else {
      const updatedList = banks.map(b => b.id === editingBank.id ? updatedBank : b);
      onUpdateBanks?.(updatedList);
      showToast(`✓ Updated "${updatedBank.bankName}" details successfully!`);
    }

    setEditingBank(null);
    setIsAdding(false);
  };

  const handleDeleteBank = (id, name) => {
    if (banks.length <= 1) {
      alert('You must keep at least one official bank account on file!');
      return;
    }
    if (window.confirm(`Delete bank account "${name}"?`)) {
      const updatedList = banks.filter(b => b.id !== id);
      onUpdateBanks?.(updatedList);
      showToast(`Removed "${name}" from accounts`);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all official bank accounts back to default (Meezan, Dubai Islamic, UBL)?')) {
      onUpdateBanks?.(DEFAULT_BANKS);
      showToast('✓ Reset to original official bank accounts');
    }
  };

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '14px 14px 40px 14px' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'sticky',
          top: '70px',
          zIndex: 50,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))',
          color: '#ffffff',
          padding: '10px 16px',
          borderRadius: '12px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          fontSize: '12.5px',
          fontWeight: '700',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '20px 16px', marginBottom: '16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'inline-flex', padding: '10px', background: 'rgba(212,163,89,0.15)', borderRadius: '50%', marginBottom: '10px' }}>
          <Building2 size={28} color="var(--gold-primary)" />
        </div>
        
        <h2 className="brand-font gold-gradient-text" style={{ fontSize: '22px', marginBottom: '4px' }}>
          Official Bank Accounts
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', maxWidth: '480px', margin: '0 auto' }}>
          These accounts appear on all HD Mobile Bills, POS bill generator, and WhatsApp statements for customer payments.
        </p>

        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={shareBankDetailsWhatsApp} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px', borderColor: '#25D366', color: '#4ade80' }}>
            <Share2 size={14} color="#25D366" />
            <span>Share All on WhatsApp</span>
          </button>

          <button onClick={handleStartAdd} className="btn-gold" style={{ padding: '8px 14px', fontSize: '12px' }}>
            <Plus size={14} />
            <span>Add New Bank</span>
          </button>

          <button onClick={handleResetToDefaults} className="btn-secondary" style={{ padding: '8px 10px', fontSize: '11.5px' }} title="Reset to original bank accounts">
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* EDIT / ADD BANK ACCOUNT FORM MODAL */}
      {editingBank && (
        <div ref={formRef} className="glass-panel" style={{ padding: '16px', marginBottom: '18px', border: '2px solid var(--gold-primary)', boxShadow: '0 0 25px rgba(212,163,89,0.25)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', background: 'rgba(212,163,89,0.2)', borderRadius: '8px', color: 'var(--gold-light)' }}>
                <Edit2 size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--gold-light)' }}>
                  {isAdding ? 'Add New Bank Account' : `Edit Account: ${editingBank.bankName}`}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
                  Updates will instantly sync to all Bills, HD Invoices & WhatsApp messages
                </p>
              </div>
            </div>

            <button type="button" onClick={() => setEditingBank(null)} className="btn-icon" style={{ width: '30px', height: '30px' }} title="Close Form">
              <X size={16} />
            </button>
          </div>

          {/* Quick Bank Chips */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>
              ⚡ Quick Select Popular Bank:
            </label>
            <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '4px' }}>
              {COMMON_BANKS.map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => handleSelectQuickBank(b)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: bankName === b.name ? 'rgba(212,163,89,0.3)' : 'rgba(255,255,255,0.05)',
                    border: bankName === b.name ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)',
                    color: bankName === b.name ? 'var(--gold-light)' : 'var(--text-muted)',
                    fontSize: '10.5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveForm}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px', fontWeight: '600' }}>
                  Bank Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meezan Bank / Dubai Islamic Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '13px' }}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px', fontWeight: '600' }}>
                  Badge (e.g. MEZN)
                </label>
                <input
                  type="text"
                  placeholder="MEZN"
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '13px', textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px', fontWeight: '600' }}>
                Account Title *
              </label>
              <input
                type="text"
                placeholder="e.g. THE CHOCOLATE HOUSE"
                value={accountTitle}
                onChange={(e) => setAccountTitle(e.target.value)}
                className="form-input"
                style={{ padding: '9px 12px', fontSize: '13px' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px', fontWeight: '600' }}>
                  Account Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 57020115209000"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '3px', fontWeight: '600' }}>
                  IBAN (24 Characters) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. PK39MEZN0057020115209000"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  className="form-input"
                  style={{ padding: '9px 12px', fontSize: '12.5px', fontFamily: 'monospace' }}
                  required
                />
              </div>
            </div>

            {/* Live Preview Card */}
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', border: '1px dashed var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', color: 'var(--gold-primary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Eye size={12} />
                <span>Live Bill / Receipt Preview</span>
              </div>
              <div style={{ fontSize: '11.5px', lineHeight: 1.4, color: 'var(--text-main)' }}>
                <strong>{bankName || 'Bank Name'}</strong>: {accountTitle || 'Account Title'}<br />
                {accountNo && <span>A/C: {accountNo} | </span>}
                <span style={{ fontFamily: 'monospace', color: 'var(--gold-light)' }}>IBAN: {iban || 'PK...'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setEditingBank(null)} className="btn-secondary" style={{ padding: '9px 16px', fontSize: '12.5px' }}>
                Cancel
              </button>
              <button type="submit" className="btn-gold" style={{ padding: '9px 20px', fontSize: '13px' }}>
                <Save size={14} />
                <span>Save Bank Details</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bank Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {banks.map((bank) => (
          <div 
            key={bank.id} 
            className="glass-card" 
            style={{ 
              padding: '16px', 
              borderLeft: '4px solid var(--gold-primary)',
              position: 'relative'
            }}
          >
            {/* Bank Card Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  background: 'rgba(212, 163, 89, 0.2)', 
                  color: 'var(--gold-light)', 
                  fontWeight: '800', 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  fontSize: '11px',
                  letterSpacing: '0.04em'
                }}>
                  {bank.shortCode || bank.bankName.slice(0, 4).toUpperCase()}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                  {bank.bankName}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {banks.length > 1 && (
                  <button 
                    onClick={() => handleDeleteBank(bank.id, bank.bankName)} 
                    className="btn-icon" 
                    style={{ width: '30px', height: '30px', color: '#ef4444' }}
                    title="Delete Bank Account"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Account Title */}
            <div style={{ marginBottom: '8px', background: 'rgba(18, 10, 6, 0.6)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>
                Account Title
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{bank.accountTitle}</span>
                <button 
                  onClick={() => copyToClipboard(bank.accountTitle, `${bank.id}-title`)} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === `${bank.id}-title` ? 'var(--status-paid)' : 'var(--text-dim)', padding: '2px' }}
                  title="Copy Title"
                >
                  {copiedId === `${bank.id}-title` ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Account Number (if available) */}
            {bank.accountNo && (
              <div style={{ marginBottom: '8px', background: 'rgba(18, 10, 6, 0.6)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Account Number
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                  <span>{bank.accountNo}</span>
                  <button 
                    onClick={() => copyToClipboard(bank.accountNo, `${bank.id}-acc`)} 
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === `${bank.id}-acc` ? 'var(--status-paid)' : 'var(--text-dim)', padding: '2px' }}
                    title="Copy Account Number"
                  >
                    {copiedId === `${bank.id}-acc` ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* IBAN */}
            <div style={{ marginBottom: '12px', background: 'rgba(18, 10, 6, 0.6)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>
                IBAN
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                <span>{bank.iban}</span>
                <button 
                  onClick={() => copyToClipboard(bank.iban, `${bank.id}-iban`)} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === `${bank.id}-iban` ? 'var(--status-paid)' : 'var(--text-dim)', marginLeft: '6px', padding: '2px' }}
                  title="Copy IBAN"
                >
                  {copiedId === `${bank.id}-iban` ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Action Buttons: Prominent Edit Details + Copy Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                type="button"
                onClick={() => handleStartEdit(bank)} 
                className="btn-gold" 
                style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                title="Edit this bank account's details"
              >
                <Edit2 size={13} />
                <span>Edit Details</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  const fullText = `${bank.bankName}\nTitle: ${bank.accountTitle}\n${bank.accountNo ? `A/C: ${bank.accountNo}\n` : ''}IBAN: ${bank.iban}`;
                  copyToClipboard(fullText, `${bank.id}-all`);
                }}
                className="btn-secondary"
                style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                title="Copy complete bank info"
              >
                {copiedId === `${bank.id}-all` ? (
                  <>
                    <Check size={13} color="var(--status-paid)" />
                    <span style={{ color: 'var(--status-paid)', fontWeight: '700' }}>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Info</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
