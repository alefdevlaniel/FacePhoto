import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { Breadcrumb } from '../components/Breadcrumb';
import { PhotoViewerModal } from './PhotoViewerModal';
import {
  API_BASE_URL,
  atualizarStatusResultado,
  copiarResultados,
  obterResultados,
  ResultadoDTO,
} from '../services/api';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    setLoading(true);
    setErrorMsg(null);

    let retries = 3;
    let data: ResultadoDTO[] | null = null;
    let lastError: any = null;

    while (retries > 0) {
      try {
        data = await obterResultados(sessaoId);
        break;
      } catch (err: any) {
        lastError = err;
        retries -= 1;
        if (retries > 0) {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }

    if (data) {
      setResultados(data);
      const confirmados = data
        .filter(
          (r) =>
            r.status === 'confirmado' ||
            r.status === 'confirmado_manual' ||
            r.status === 'copiado'
        )
        .map((r) => r.id);
      setSelectedIds(new Set(confirmados));
      setLoading(false);
    } else {
      console.error('Erro ao buscar resultados do SQLite após retentativas:', lastError);
      setErrorMsg(
        lastError?.message || 'Não foi possível carregar os resultados do banco de dados SQLite local.'
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarResultadosReais();
  }, [sessaoId]);

  const confirmados = resultados.filter(
    (r) =>
      r.status === 'confirmado' ||
      r.status === 'confirmado_manual' ||
      r.status === 'copiado'
  );

  const revisoes = resultados.filter(
    (r) => r.status === 'revisao' || r.status === 'revisao_manual'
  );

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

  const handleAcceptReview = async (item: ResultadoDTO) => {
    if (!sessaoId) return;
    try {
      await atualizarStatusResultado(sessaoId, item.id, 'confirmado_manual');
      setResultados((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: 'confirmado_manual' } : r))
      );
      setSelectedIds((prev) => new Set(prev).add(item.id));
    } catch (err) {
      console.error('Erro ao aceitar foto:', err);
    }
  };

  const handleRejectReview = async (item: ResultadoDTO) => {
    if (!sessaoId) return;
    try {
      await atualizarStatusResultado(sessaoId, item.id, 'descartado');
      setResultados((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: 'descartado' } : r))
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      console.error('Erro ao rejeitar foto:', err);
    }
  };

  const handleOpenViewer = (item: ResultadoDTO) => {
    setSelectedPhoto(item);
    setIsViewerOpen(true);
  };

  const markImageFailed = (id: string) => {
    setFailedImages((prev) => new Set(prev).add(id));
  };

  const renderBoundingBox = (bbox: any) => {
    if (!bbox || typeof bbox !== 'object') return null;
    const x = Number(bbox.x);
    const y = Number(bbox.y);
    const w = Number(bbox.w);
    const h = Number(bbox.h);
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return null;

    const top = y <= 1 ? `${y * 100}%` : y <= 100 ? `${y}%` : '20%';
    const left = x <= 1 ? `${x * 100}%` : x <= 100 ? `${x}%` : '20%';
    const width = w <= 1 ? `${w * 100}%` : w <= 100 ? `${w}%` : '60%';
    const height = h <= 1 ? `${h * 100}%` : h <= 100 ? `${h}%` : '60%';

    return (
      <div
        style={{
          position: 'absolute',
          top,
          left,
          width,
          height,
          border: '2px solid var(--accent)',
          borderRadius: '4px',
          boxShadow: '0 0 8px var(--accent-glow)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
    );
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

        {errorMsg ? (
          <div
            className="card"
            style={{
              padding: 24,
              textAlign: 'center',
              background: 'var(--error-dim)',
              borderColor: 'var(--error)',
              color: 'var(--error)',
              marginTop: 16,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Erro ao carregar os resultados</div>
            <div style={{ fontSize: 13, marginTop: 4, marginBottom: 16 }}>{errorMsg}</div>
            <button className="btn btn-primary btn-sm" onClick={carregarResultadosReais}>
              🔄 Tentar Novamente
            </button>
          </div>
        ) : loading ? (
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

                      {!isFailed && renderBoundingBox(item.bounding_box)}

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

                      {!isFailed && renderBoundingBox(item.bounding_box)}

                      <div className="photo-thumb-footer" style={{ zIndex: 3, justifyContent: 'space-between' }}>
                        <span className="photo-score score-low">
                          {Math.round(item.score * 100)}%
                        </span>
                        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => handleAcceptReview(item)}
                            title="Aceitar foto (Mover para Confirmadas)"
                          >
                            ✓ Aceitar
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => handleRejectReview(item)}
                            title="Rejeitar foto"
                          >
                            ✕
                          </button>
                        </div>
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
        onAccept={handleAcceptReview}
        onReject={handleRejectReview}
        isSelected={selectedPhoto ? selectedIds.has(selectedPhoto.id) : false}
        onToggleSelect={(p) => toggleSelect(p.id)}
      />
    </div>
  );
};

