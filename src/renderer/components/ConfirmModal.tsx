import React from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const iconMap = {
    danger: '🗑️',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const btnClassMap = {
    danger: 'btn-danger',
    warning: 'btn-warning',
    info: 'btn-primary',
  };

  const badgeBgMap = {
    danger: 'rgba(239, 68, 68, 0.15)',
    warning: 'rgba(245, 158, 11, 0.15)',
    info: 'rgba(0, 180, 216, 0.15)',
  };

  const badgeBorderMap = {
    danger: 'rgba(239, 68, 68, 0.3)',
    warning: 'rgba(245, 158, 11, 0.3)',
    info: 'rgba(0, 180, 216, 0.3)',
  };

  return (
    <div className="custom-modal-overlay" onClick={onCancel}>
      <div
        className="custom-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: badgeBgMap[variant],
              border: `1px solid ${badgeBorderMap[variant]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {iconMap[variant]}
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                marginBottom: 6,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {message}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            marginTop: 8,
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`btn ${btnClassMap[variant]}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Aguarde...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
