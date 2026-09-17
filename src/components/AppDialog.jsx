import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Info, Trash2, X, HelpCircle } from 'lucide-react';
import { registerDialogHandler } from '../utils/dialog';

export default function AppDialog() {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    buttonText: 'Got It',
    isConfirm: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmStyle: 'primary',
    onConfirm: null,
    onClose: null
  });

  useEffect(() => {
    return registerDialogHandler((newState) => {
      setDialogState(newState);
    });
  }, []);

  if (!dialogState.isOpen) return null;

  const handleClose = () => {
    dialogState.onClose?.();
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    dialogState.onConfirm?.();
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  // Determine icon & color based on type
  let iconComponent = <AlertTriangle size={30} color="#f59e0b" />;
  let iconBg = 'rgba(245, 158, 11, 0.15)';
  let iconBorder = 'rgba(245, 158, 11, 0.3)';

  if (dialogState.type === 'danger' || dialogState.confirmStyle === 'danger') {
    iconComponent = <Trash2 size={30} color="#ef4444" />;
    iconBg = 'rgba(239, 68, 68, 0.15)';
    iconBorder = 'rgba(239, 68, 68, 0.35)';
  } else if (dialogState.type === 'error') {
    iconComponent = <AlertCircle size={30} color="#f87171" />;
    iconBg = 'rgba(239, 68, 68, 0.15)';
    iconBorder = 'rgba(239, 68, 68, 0.35)';
  } else if (dialogState.type === 'success') {
    iconComponent = <CheckCircle size={30} color="#10b981" />;
    iconBg = 'rgba(16, 185, 129, 0.15)';
    iconBorder = 'rgba(16, 185, 129, 0.35)';
  } else if (dialogState.type === 'question') {
    iconComponent = <HelpCircle size={30} color="var(--gold-primary)" />;
    iconBg = 'rgba(212, 163, 89, 0.15)';
    iconBorder = 'rgba(212, 163, 89, 0.35)';
  } else if (dialogState.type === 'info') {
    iconComponent = <Info size={30} color="#60a5fa" />;
    iconBg = 'rgba(96, 165, 250, 0.15)';
    iconBorder = 'rgba(96, 165, 250, 0.35)';
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={handleClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(145deg, rgba(28, 16, 10, 0.98), rgba(18, 9, 5, 0.98))',
          border: '1.5px solid var(--gold-primary)',
          borderRadius: '20px',
          padding: '26px 22px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 20px rgba(212, 163, 89, 0.15)',
          textAlign: 'center',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Icon Button */}
        <button
          type="button"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px'
          }}
          title="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Icon Circle */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: iconBg,
            border: `1.5px solid ${iconBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
          }}
        >
          {iconComponent}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '18px',
            fontWeight: '800',
            color: 'var(--text-main)',
            margin: '0 0 10px 0',
            lineHeight: 1.3
          }}
        >
          {dialogState.title}
        </h3>

        {/* Message with paragraph breaks */}
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.6,
            marginBottom: '22px',
            whiteSpace: 'pre-line',
            textAlign: 'center',
            padding: '0 6px'
          }}
        >
          {dialogState.message}
        </div>

        {/* Action Buttons */}
        {dialogState.isConfirm ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {dialogState.cancelText}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              style={{
                flex: 1.2,
                padding: '12px 14px',
                borderRadius: '12px',
                background: dialogState.confirmStyle === 'danger'
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #e2b265, #ba8339)',
                border: 'none',
                color: dialogState.confirmStyle === 'danger' ? '#ffffff' : '#120904',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: dialogState.confirmStyle === 'danger'
                  ? '0 6px 16px rgba(239, 68, 68, 0.35)'
                  : '0 6px 16px rgba(212, 163, 89, 0.35)'
              }}
            >
              {dialogState.confirmText}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #e2b265, #ba8339)',
              border: 'none',
              color: '#120904',
              fontSize: '13.5px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(212, 163, 89, 0.35)'
            }}
          >
            {dialogState.buttonText || 'Got It'}
          </button>
        )}

      </div>
    </div>
  );
}
