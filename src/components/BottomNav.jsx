import React from 'react';
import { LayoutDashboard, BookOpen, Package, FileText, Building2 } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, billsCount, lowStockCount = 0 }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ledger', label: 'Khata Ledger', icon: BookOpen },
    { id: 'items', label: 'Items', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: '#fbbf24' },
    { id: 'pos', label: 'Billing', icon: FileText, badge: billsCount },
    { id: 'banks', label: 'Bank A/C', icon: Building2 }
  ];

  return (
    <nav
      className="no-print"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(20, 11, 7, 0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'var(--safe-bottom)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)'
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '62px'
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--gold-light)' : 'var(--text-dim)',
                padding: '6px 0',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  padding: '4px 16px',
                  borderRadius: '16px',
                  background: isActive ? 'rgba(212, 163, 89, 0.18)' : 'transparent',
                  transition: 'background 0.2s ease'
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />

                {tab.badge !== undefined && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '0px',
                      right: '6px',
                      background: tab.badgeColor || (isActive ? 'var(--gold-primary)' : '#4a2b1b'),
                      color: tab.badgeColor ? '#120904' : (isActive ? '#120904' : 'var(--text-main)'),
                      borderRadius: '10px',
                      padding: '1px 5px',
                      fontSize: '10px',
                      fontWeight: '800'
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? '700' : '500',
                  letterSpacing: '0.02em'
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
