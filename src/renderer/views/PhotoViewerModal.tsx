import React from 'react';
import { API_BASE_URL, ResultadoDTO } from '../services/api';

interface PhotoViewerModalProps {
  isOpen: boolean;
  photo: ResultadoDTO | null;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  photo,
  onClose,
}) => {
  if (!isOpen || !photo) return null;

  const mediaUrl = `${API_BASE_URL}/api/media?path=${encodeURIComponent(photo.caminho_foto)}`;

  const getNomeArquivo = (caminho: string) => {
    const parts = caminho.split(/[/\\]/);
    return parts[parts.length - 1] || caminho;
  };

  return (
    <div className="screen active" id="screen-viewer">
      <div className="viewer-topbar">
        <button className="btn btn-secondary btn-sm" onClick={onClose}>
          ← Voltar aos Resultados
        </button>
        <div className="viewer-nav">
          <span className="text-sm text-secondary" style={{ padding: '0 12px' }}>
            Visualizando foto real encontrada
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
      <div className="viewer-body">
        <div className="viewer-main">
          <div className="viewer-photo-mock" style={{ position: 'relative', overflow: 'hidden' }}>
            <img
              src={mediaUrl}
              alt="Foto encontrada ampliada"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000',
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {photo.bounding_box && (
              <div
                style={{
                  position: 'absolute',
                  top: `${photo.bounding_box.y}%`,
                  left: `${photo.bounding_box.x}%`,
                  width: `${photo.bounding_box.w}%`,
                  height: `${photo.bounding_box.h}%`,
                  border: '3px solid var(--accent)',
                  borderRadius: '8px',
                  boxShadow: '0 0 24px var(--accent-glow)',
                  pointerEvents: 'none',
                }}
              ></div>
            )}
          </div>
        </div>

        <div className="viewer-sidebar">
          <div className="card-title">Detalhes da Foto Reais</div>
          <div className="meta-group">
            <div className="meta-item">
              <div className="meta-label">Arquivo</div>
              <div className="meta-value">{getNomeArquivo(photo.caminho_foto)}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Caminho do Disco</div>
              <div className="meta-value" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                {photo.caminho_foto}
              </div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Status</div>
              <div className="meta-value">
                {photo.status === 'confirmado' ? '✓ Confirmado' : '⚠ Revisão Manual'}
              </div>
            </div>
          </div>

          <div className="separator"></div>

          <div className="confidence-bar-wrap">
            <div className="card-title">Confiança do Reconhecimento</div>
            <div className="conf-header">
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Pontuação IA
              </div>
              <div className="conf-pct">{Math.round(photo.score * 100)}%</div>
            </div>
            <div className="conf-bar-track">
              <div
                className="conf-bar-fill"
                style={{ width: `${Math.round(photo.score * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="separator"></div>

          <div className="viewer-actions" style={{ flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary w-full" onClick={onClose}>
              ✓ Fechar Visualização
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
