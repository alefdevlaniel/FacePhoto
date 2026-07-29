import React from 'react';
import { Topbar } from '../components/Topbar';

interface ReportViewProps {
  copiedCount: number;
  targetFolder: string;
  onNewSearch: () => void;
  onNavigateHome: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  copiedCount,
  targetFolder,
  onNewSearch,
  onNavigateHome,
}) => {
  return (
    <div className="screen active" id="screen-report">
      <Topbar onNavigateHome={onNavigateHome} showNewSearchButton={false} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto',
          padding: 24,
        }}
      >
        <div className="report-wrap">
          <div className="report-success-icon">✓</div>
          <div>
            <div className="report-title">Cópia Concluída com Sucesso! 🎉</div>
            <div className="report-subtitle mt-8">
              As fotos foram copiadas preservando metadados EXIF e resolvendo duplicatas.
            </div>
          </div>

          <div className="report-grid">
            <div className="report-stat highlight">
              <div className="r-number">{copiedCount}</div>
              <div className="r-label">Fotos copiadas</div>
            </div>
            <div className="report-stat">
              <div className="r-number">100%</div>
              <div className="r-label">Sucesso na cópia</div>
            </div>
          </div>

          <div className="report-path">
            <span style={{ fontSize: 20 }}>📂</span>
            <div className="path-text">{targetFolder || 'Pasta de Destino'}</div>
          </div>

          <div className="report-actions">
            <button className="btn btn-primary btn-lg w-full" onClick={onNewSearch}>
              + Iniciar Nova Busca
            </button>
            <div className="report-actions-row">
              <button className="btn btn-secondary w-full" onClick={onNavigateHome}>
                🏠 Ir para Início
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
