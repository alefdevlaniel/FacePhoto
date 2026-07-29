import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { Breadcrumb } from '../components/Breadcrumb';
import { PhotoViewerModal } from './PhotoViewerModal';
import { API_BASE_URL, copiarResultados, obterResultados, ResultadoDTO } from '../services/api';

interface ResultsViewProps {
  sessaoId: string | null;
  onCopyCompleted: (copiedCount: number, destination: string) => void;
  onNewSearch: () => void;
  onNavigateHome: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  sessaoId,
  onCopyCompleted,
  onNewSearch,
  onNavigateHome,
}) => {
  const [resultados, setResultados] = useState<ResultadoDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'confirmed' | 'review'>('confirmed');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<ResultadoDTO | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [copying, setCopying] = useState<boolean>(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const carregarResultadosReais = async () => {
    if (!sessaoId) {
      setLoading(false);
      return;
    }
    try {
      const data = await obterResultados(sessaoId);
      setResultados(data);
      const confirmados = data.filter((r) => r.status === 'confirmado').map((r) => r.id);
      setSelectedIds(new Set(confirmados));
    } catch (err) {
      console.error('Erro ao buscar resultados do SQLite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarResultadosReais();
  }, [sessaoId]);

  const confirmados = resultados.filter((r) => r.status === 'confirmado');
  const revisoes = resultados.filter((r) => r.status === 'revisao_manual');

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === confirmados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(confirmados.map((r) => r.id)));
    }
  };

  const handleCopy = async () => {
    if (!sessaoId || selectedIds.size === 0) return;
    setCopying(true);
    try {
      const idsArray = Array.from(selectedIds);
      const res = await copiarResultados(sessaoId, idsArray);
      onCopyCompleted(res.total_copiadas, res.pasta_destino);
    } catch (err) {
      console.error('Erro ao copiar fotos:', err);
    } finally {
      setCopying(false);
    }
  };

  const handleOpenViewer = (item: ResultadoDTO) => {
    setSelectedPhoto(item);
    setIsViewerOpen(true);
  };

  const markImageFailed = (id: string) => {
    setFailedImages((prev) => new Set(prev).add(id));
  };

  return (
    <div className="screen active" id="screen-results">
      <Topbar
        onNavigateHome={onNavigateHome}
        onNewSearch={onNewSearch}
        showNewSearchButton={true}
      />
      <Breadcrumb
        items={[
          { label: '🏠 Início', onClick: onNavigateHome },
          { label: 'Resultados Reais (SQLite)', active: true },
        ]}
      />
      <div className="content">
        <div className="results-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>Resultados Encontrados 🎉</h1>
              <p>
                Fotos reais identificadas e registradas no banco SQLite para a sessão{' '}
                <strong>{sessaoId ? sessaoId.slice(0, 8) : 'Atual'}</strong>.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="badge badge-success" style={{ fontSize: 13, padding: '6px 14px' }}>
                {resultados.length} fotos salvas
              </div>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'confirmed' ? 'active' : ''}`}
            onClick={() => setActiveTab('confirmed')}
          >
            Confirmadas <span className="tab-count">{confirmados.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            Revisão Manual{' '}
            <span
              className="tab-count"
              style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}
            >
              {revisoes.length}
            </span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Carregando previews do banco de dados local...
          </div>
        ) : activeTab === 'confirmed' ? (
          <div className="tab-panel active">
            <div className="results-toolbar">
              <div className="toolbar-left">
                <div className="select-all-btn" onClick={toggleSelectAll}>
                  <span>{selectedIds.size === confirmados.length ? '☑' : '☐'}</span>
                  <span>
                    {selectedIds.size === confirmados.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                  </span>
                </div>
                <div className="selection-count">
                  <span>{selectedIds.size}</span> de {confirmados.length} selecionadas
                </div>
              </div>
            </div>

            {confirmados.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nenhuma foto confirmada nesta sessão.
              </div>
            ) : (
              <div className="photo-grid">
                {confirmados.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isFailed = failedImages.has(item.id);
                  const mediaUrl = `${API_BASE_URL}/api/media?path=${encodeURIComponent(item.caminho_foto)}`;

                  return (
                    <div
                      key={item.id}
                      className={`photo-thumb ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleOpenViewer(item)}
                      style={{ position: 'relative', overflow: 'hidden' }}
                    >
                      {!isFailed ? (
                        <img
                          src={mediaUrl}
                          alt="Preview da foto encontrada"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 1,
                          }}
                          onError={() => markImageFailed(item.id)}
                        />
                      ) : (
                        <div className="photo-face-mock" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                          <span style={{ fontSize: 28 }}>🖼️</span>
                        </div>
                      )}

                      {/* Bounding box do rosto identificado */}
                      {item.bounding_box && !isFailed && (
                        <div
                          style={{
                            position: 'absolute',
                            top: `${item.bounding_box.y}%`,
                            left: `${item.bounding_box.x}%`,
                            width: `${item.bounding_box.w}%`,
                            height: `${item.bounding_box.h}%`,
                            border: '2px solid var(--accent)',
                            borderRadius: '4px',
                            boxShadow: '0 0 8px var(--accent-glow)',
                            zIndex: 2,
                            pointerEvents: 'none',
                          }}
                        ></div>
                      )}

                      <div className="photo-thumb-footer" style={{ zIndex: 3 }}>
                        <span className="photo-score score-high">
                          {Math.round(item.score * 100)}%
                        </span>
                        <div
                          className="photo-checkbox"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(item.id);
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="tab-panel active">
            {revisoes.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nenhuma foto pendente de revisão manual.
              </div>
            ) : (
              <div className="photo-grid">
                {revisoes.map((item) => {
                  const mediaUrl = `${API_BASE_URL}/api/media?path=${encodeURIComponent(item.caminho_foto)}`;
                  const isFailed = failedImages.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className="photo-thumb review-item"
                      onClick={() => handleOpenViewer(item)}
                      style={{ position: 'relative', overflow: 'hidden' }}
                    >
                      {!isFailed ? (
                        <img
                          src={mediaUrl}
                          alt="Preview revisão"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 1,
                          }}
                          onError={() => markImageFailed(item.id)}
                        />
                      ) : (
                        <div className="photo-face-mock" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                          <span style={{ fontSize: 28 }}>🖼️</span>
                        </div>
                      )}

                      <div className="photo-thumb-footer" style={{ zIndex: 3 }}>
                        <span className="photo-score score-low">
                          {Math.round(item.score * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="results-footer">
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>
            {selectedIds.size} fotos
          </strong>{' '}
          selecionadas para cópia real
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onNavigateHome}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleCopy}
            disabled={copying || selectedIds.size === 0}
          >
            {copying ? 'Copiando...' : '📋 Copiar Selecionadas Reais'}
          </button>
        </div>
      </div>

      <PhotoViewerModal
        isOpen={isViewerOpen}
        photo={selectedPhoto}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
};
