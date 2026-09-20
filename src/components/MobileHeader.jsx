import React, { useRef, useState, useEffect } from 'react';
import { Phone, Download, Upload, Database, WifiOff, Wifi } from 'lucide-react';
import { BUSINESS_INFO } from '../data/initialData';
import { exportAllDataJSON, importAllDataJSON, ACCOUNT_MAIN } from '../utils/storage';
import { showAppAlert } from '../utils/dialog';

export default function MobileHeader({ 
  onOpenPreviousDataModal, 
  onDataReloaded 
}) {
  const fileInputRef = useRef(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
            message: 'Your store data has been restored successfully.',
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
        },
        ACCOUNT_MAIN
      );
    }
  };

  const handleExportClick = async () => {
    try {
      await exportAllDataJSON(ACCOUNT_MAIN);
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
    <header 
      className="no-print" 
      style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50,
        background: 'rgba(18, 11, 7, 0.95)', 
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '8px 14px',
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))'
      }}
    >
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        
        {/* Top Row: Brand Info + Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          
          {/* Brand Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src={BUSINESS_INFO.logoUrl} 
              alt="The Chocolate House Logo" 
              style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                objectFit: 'cover', 
                border: '2px solid var(--gold-primary)',
                boxShadow: '0 0 10px var(--gold-glow)'
              }}
            />
            <div>
              <h1 className="brand-font gold-gradient-text" style={{ fontSize: '15px', fontWeight: '800', lineHeight: 1.1, margin: 0 }}>
                THE CHOCOLATE HOUSE
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--gold-light)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Imported Chocolates
                </span>
                {!isOnline && (
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '3px',
                    fontSize: '9px', 
                    color: '#f59e0b', 
                    background: 'rgba(245, 158, 11, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>
                    <WifiOff size={10} />
                    Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Icons & Import Old Data */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={onOpenPreviousDataModal}
              className="btn-secondary"
              title="Add / Import Previous App Records into Main Account"
              style={{
                padding: '5px 9px',
                fontSize: '11px',
                fontWeight: '700',
                borderColor: 'rgba(212, 163, 89, 0.5)',
                color: 'var(--gold-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(212, 163, 89, 0.12)',
                borderRadius: '8px'
              }}
            >
              <Database size={13} color="var(--gold-primary)" />
              <span>Import Old Data</span>
            </button>

            <a 
              href={`tel:${BUSINESS_INFO.phone}`} 
              className="btn-icon" 
              title={`Call ${BUSINESS_INFO.phone}`}
              style={{ textDecoration: 'none', width: '30px', height: '30px' }}
            >
              <Phone size={14} color="var(--gold-primary)" />
            </a>

            <button 
              onClick={handleExportClick} 
              className="btn-icon" 
              title="Backup Store Data (JSON)"
              style={{ width: '30px', height: '30px' }}
            >
              <Download size={14} color="var(--text-muted)" />
            </button>

            <button 
              onClick={handleImportClick} 
              className="btn-icon" 
              title="Restore Store Data (JSON)"
              style={{ width: '30px', height: '30px' }}
            >
              <Upload size={14} color="var(--text-muted)" />
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

      </div>
    </header>
  );
}
