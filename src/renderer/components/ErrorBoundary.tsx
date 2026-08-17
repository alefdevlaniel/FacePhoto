import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FacePhoto ErrorBoundary capturou um erro não tratado:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    localStorage.removeItem('facephoto_current_screen');
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-primary, #0B0F19)',
            color: 'var(--text-primary, #F3F4F6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            fontFamily: 'Inter, system-ui, sans-serif',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              background: 'var(--bg-surface, #111827)',
              border: '1px solid var(--border, #1F2937)',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
              Recuperação do Sistema
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary, #9CA3AF)', margin: '0 0 24px', lineHeight: 1.6 }}>
              A conexão foi pausada temporariamente (por exemplo, após hibernação ou suspensão do computador).
              Todos os seus dados e fotos analisadas permanecem salvos em segurança no banco local SQLite.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'var(--accent, #00B4D8)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 180, 216, 0.4)',
                }}
              >
                🔄 Recarregar e Continuar
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  background: 'var(--bg-elevated, #1F2937)',
                  color: 'var(--text-primary, #F3F4F6)',
                  border: '1px solid var(--border-light, #374151)',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                🏠 Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
