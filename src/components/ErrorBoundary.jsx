import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', fontFamily: 'monospace', background: '#1e1b2e', minHeight: '100vh', color: 'white' }}>
          <h2 style={{ color: '#f87171', fontSize: '1.25rem', marginBottom: '16px' }}>
            React render error — kopieer dit naar de chat:
          </h2>
          <pre style={{ background: '#0f0a1a', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem', color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
