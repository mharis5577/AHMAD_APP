import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // Log error for debugging
    console.error('App Error:', error, errorInfo);
    
    // Store error in localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error?.message || String(error),
        stack: errorInfo?.componentStack
      };
      const logs = JSON.parse(localStorage.getItem('tch_error_logs') || '[]');
      logs.unshift(errorLog);
      // Keep only last 10 errors
      localStorage.setItem('tch_error_logs', JSON.stringify(logs.slice(0, 10)));
    } catch (e) {
      // Ignore storage errors
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #120b07, #1a0f0a)',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '400px',
            textAlign: 'center',
            padding: '32px',
            background: 'rgba(40, 24, 16, 0.95)',
            borderRadius: '20px',
            border: '1px solid rgba(212, 163, 89, 0.2)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <AlertTriangle size={36} color="#ef4444" />
            </div>
            
            <h1 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#fdfaf6',
              marginBottom: '10px'
            }}>
              Something Went Wrong
            </h1>
            
            <p style={{
              fontSize: '14px',
              color: '#c8b7a6',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              The app encountered an unexpected error. Your data is safe. Please reload the app to continue.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #d4a359, #ba8339)',
                  color: '#120b07',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} />
                Reload App
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{
                marginTop: '24px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '11px',
                color: '#f87171',
                fontFamily: 'monospace',
                maxHeight: '150px',
                overflow: 'auto'
              }}>
                <strong>Error:</strong> {this.state.error.message || String(this.state.error)}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
