import React, { useRef } from 'react';
import { Phone, Download, Upload } from 'lucide-react';
import { BUSINESS_INFO } from '../data/initialData';
import { exportAllDataJSON, importAllDataJSON } from '../utils/storage';
import { showAppAlert } from '../utils/dialog';

export default function MobileHeader({ onDataReloaded }) {
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
            message: 'Your backup data has been restored successfully.',
            type: 'success'
          });
          onDataReloaded?.();
        },
        (err) => {
          showAppAlert({
            title: 'Restore Failed',
            message: String(err),
            type: 'error'
          });
        }
      );
    }
  };

  return (
    <header 
      className="no-print" 
      style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 40,
        background: 'rgba(18, 11, 7, 0.95)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '10px 16px',
        paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))'
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Logo & Brand Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src={BUSINESS_INFO.logoUrl} 
            alt="The Chocolate House Logo" 
            style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '50%', 
              objectFit: 'cover', 
              border: '2px solid var(--gold-primary)',
              boxShadow: '0 0 10px var(--gold-glow)'
            }}
          />
          <div>
            <h1 className="brand-font gold-gradient-text" style={{ fontSize: '16px', fontWeight: '800', lineHeight: 1.1 }}>
              THE CHOCOLATE HOUSE
            </h1>
            <div style={{ fontSize: '11px', color: 'var(--gold-light)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Imported Chocolates
            </div>
          </div>
        </div>

        {/* Quick Actions (Call & Backup) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a 
            href={`tel:${BUSINESS_INFO.phone}`} 
            className="btn-icon" 
            title={`Call ${BUSINESS_INFO.phone}`}
            style={{ textDecoration: 'none' }}
          >
            <Phone size={16} color="var(--gold-primary)" />
          </a>

          <button 
            onClick={exportAllDataJSON} 
            className="btn-icon" 
            title="Backup Data"
          >
            <Download size={16} color="var(--text-muted)" />
          </button>

          <button 
            onClick={handleImportClick} 
            className="btn-icon" 
            title="Restore Data"
          >
            <Upload size={16} color="var(--text-muted)" />
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
