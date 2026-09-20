import React, { useRef } from 'react';
import { FileText, Receipt, BookOpen, Building2, Download, Upload, Phone } from 'lucide-react';
import { BUSINESS_INFO } from '../data/initialData';
import { exportAllDataJSON, importAllDataJSON } from '../utils/storage';
import { showAppAlert } from '../utils/dialog';

export default function Navbar({ activeTab, setActiveTab, billsCount, onDataReloaded }) {
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importAllDataJSON(
        file,
        () => {
          showAppAlert({
            title: 'Restore Completed',
            message: 'Data restored successfully!',
            type: 'success'
          });
          onDataReloaded?.();
          // Reset file input so same file can be selected again
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        (err) => {
          showAppAlert({
            title: 'Restore Failed',
            message: String(err),
            type: 'error'
          });
          // Reset file input on error too
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      );
    }
  };

  const handleExportClick = async () => {
    try {
      await exportAllDataJSON();
      showAppAlert({
        title: 'Backup Created',
        message: 'Your data backup has been prepared for sharing.',
        type: 'success'
      });
    } catch (err) {
      showAppAlert({
        title: 'Backup Failed',
        message: 'Failed to create backup: ' + String(err),
        type: 'error'
      });
    }
  };

  return (
    <header className="no-print" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(21, 12, 7, 0.95)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        
        {/* Brand Logo & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={() => setActiveTab('pos')}>
          <img 
            src={BUSINESS_INFO.logoUrl} 
            alt="The Chocolate House Logo" 
            style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-primary)', boxShadow: '0 0 12px var(--gold-glow)' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="brand-font gold-gradient-text" style={{ fontSize: '19px', fontWeight: '800', lineHeight: 1.1 }}>
                THE CHOCOLATE HOUSE
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-light)' }}>
                Imported Chocolates • Online Store
              </span>
              <span>•</span>
              <a href={`tel:${BUSINESS_INFO.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                <Phone size={12} color="var(--gold-primary)" />
                {BUSINESS_INFO.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Create Bill, Bills History, Ledger, Bank Accounts) */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 20, 13, 0.7)', padding: '5px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('pos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'pos' ? '600' : '500',
              background: activeTab === 'pos' ? 'linear-gradient(135deg, #e2b265, #ba8339)' : 'transparent',
              color: activeTab === 'pos' ? '#140a05' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <FileText size={16} />
            <span>Create Bill</span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'bills' ? '600' : '500',
              background: activeTab === 'bills' ? 'linear-gradient(135deg, #e2b265, #ba8339)' : 'transparent',
              color: activeTab === 'bills' ? '#140a05' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <Receipt size={16} />
            <span>Bills</span>
            <span style={{
              background: activeTab === 'bills' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              {billsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'ledger' ? '600' : '500',
              background: activeTab === 'ledger' ? 'linear-gradient(135deg, #e2b265, #ba8339)' : 'transparent',
              color: activeTab === 'ledger' ? '#140a05' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={16} />
            <span>Ledger / Khata</span>
          </button>

          <button
            onClick={() => setActiveTab('banks')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'banks' ? '600' : '500',
              background: activeTab === 'banks' ? 'linear-gradient(135deg, #e2b265, #ba8339)' : 'transparent',
              color: activeTab === 'banks' ? '#140a05' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <Building2 size={16} />
            <span>Bank Accounts</span>
          </button>
        </nav>

        {/* Actions: Backup & Restore */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={handleExportClick} 
            className="btn-secondary" 
            style={{ padding: '8px 12px', fontSize: '12px' }}
            title="Export all bills backup"
          >
            <Download size={14} color="var(--gold-primary)" />
            <span>Backup</span>
          </button>

          <button 
            onClick={handleImportClick} 
            className="btn-secondary" 
            style={{ padding: '8px 12px', fontSize: '12px' }}
            title="Restore backup"
          >
            <Upload size={14} color="var(--gold-light)" />
            <span>Restore</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".json" 
            onChange={handleFileChange} 
          />
        </div>

      </div>
    </header>
  );
}
