import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import {
  API_BASE_URL,
  cancelarSessao,
  conectarStreamSSE,
  pausarSessao,
  retomarSessao,
} from '../services/api';

interface ProcessingViewProps {
  sessaoId: string | null;
  onComplete: () => void;
  onCancel: () => void;
  onNavigateHome: () => void;
}

interface FoundPhotoItem {
  id?: string;
  caminho_foto: string;
  nome: string;
  score: number;
  status: string;
  bounding_box?: any;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  sessaoId,
  onComplete,
  onCancel,
  onNavigateHome,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentFile, setCurrentFile] = useState<string>('Iniciando...');
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalPhotos, setTotalPhotos] = useState<number>(0);
  const [foundCount, setFoundCount] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [lastFound, setLastFound] = useState<FoundPhotoItem | null>(null);
  const [recentFound, setRecentFound] = useState<FoundPhotoItem[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<FoundPhotoItem | null>(null);

  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: string }>>([
    {
      time: new Date().toLocaleTimeString(),
      text: 'Conectando ao EventSource de streaming SSE da API FastAPI...',
      type: '',
    },
  ]);

  useEffect(() => {
    if (!sessaoId) return;

    const eventSource = conectarStreamSSE(
      sessaoId,
      (data) => {
        if (data.progress_pct !== undefined) setProgress(data.progress_pct);
        if (data.processed_count !== undefined) setProcessedCount(data.processed_count);
        if (data.total_fotos !== undefined) setTotalPhotos(data.total_fotos);
        if (data.found_count !== undefined) setFoundCount(data.found_count);
        if (data.review_count !== undefined) setReviewCount(data.review_count);
        if (data.duplicate_count !== undefined) setDuplicateCount(data.duplicate_count);
        if (data.current_file) setCurrentFile(data.current_file);

        if (data.last_found) {
          setLastFound(data.last_found);
          setSelectedPreview(data.last_found);
        }
        if (data.recent_found && Array.isArray(data.recent_found)) {
          setRecentFound(data.recent_found);
        }

        if (data.log) {
          setLogs((prev) => [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              text: data.log,
              type: data.log.includes('✓') ? 'found' : data.log.includes('⚠') ? 'warning' : '',
            },
          ]);
        }
      },
      () => {
        setIsCompleted(true);
        setProgress(100);
        setLogs((prev) => [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            text: '✓ Análise concluída e salva no SQLite local!',
            type: 'found',
          },
        ]);
      },
      (err) => {
        console.error('Erro na conexão SSE:', err);
      }
    );

    return () => {
      eventSource.close();
    };
  }, [sessaoId]);

  const togglePause = async () => {
    if (!sessaoId) return;
    if (isPaused) {
      await retomarSessao(sessaoId);
      setIsPaused(false);
      setLogs((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          text: '▶ Processamento retomado no servidor FastAPI.',
          type: 'warning',
        },
      ]);
    } else {
      await pausarSessao(sessaoId);
      setIsPaused(true);
      setLogs((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          text: '⏸ Processamento pausado no servidor FastAPI.',
          type: 'warning',
        },
      ]);
    }
  };

  const handleCancelSession = async () => {
    if (sessaoId) {
      await cancelarSessao(sessaoId);
    }
    onCancel();
  };

  const activePhoto = selectedPreview || lastFound;

  const renderBoundingBox = (bbox: any) => {
    if (!bbox || typeof bbox !== 'object') return null;
    let top = '';
    let left = '';
    let width = '';
    let height = '';

    if (bbox.x_pct !== undefined && bbox.y_pct !== undefined && bbox.w_pct && bbox.h_pct) {
      left = `${bbox.x_pct * 100}%`;
      top = `${bbox.y_pct * 100}%`;
      width = `${bbox.w_pct * 100}%`;
      height = `${bbox.h_pct * 100}%`;
    } else {
      const x = Number(bbox.x);
      const y = Number(bbox.y);
      const w = Number(bbox.w);
      const h = Number(bbox.h);
      if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return null;

      if (x <= 1 && y <= 1 && w <= 1 && h <= 1) {
        left = `${x * 100}%`;
        top = `${y * 100}%`;
        width = `${w * 100}%`;
        height = `${h * 100}%`;
      } else {
        return null;
      }
    }

    return (
      <div
        style={{
          position: 'absolute',
          top,
          left,
          width,
          height,
          border: '2px solid var(--accent)',
          borderRadius: '6px',
          boxShadow: '0 0 16px var(--accent-glow)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
    );
  };

  return (
    <div className="screen active" id="screen-processing">
      <Topbar onNavigateHome={onNavigateHome} showNewSearchButton={false} />
      <div className="processing-body">
        <div>
          <div className="processing-title">
            {isCompleted ? 'Análise concluída! 🎉' : 'Analisando suas fotos em tempo real...'}
          </div>
          <div className="processing-sub">
            {isCompleted
              ? `${foundCount + reviewCount} fotos identificadas · Clique para revisar os resultados`
              : 'Conexão ativa com FastAPI — Varredura, deduplicação e IA'}
          </div>
        </div>

        <div className="progress-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="gpu-badge">
              <div className="gpu-dot"></div>
              Aceleração Hardware: Ativa
            </div>
            <div className="text-sm text-secondary">
              Sessão ID: {sessaoId ? sessaoId.slice(0, 8) + '...' : 'Sessão Local'}
            </div>
          </div>

          <div className="progress-wrap">
            <div className="progress-header">
              <div className="progress-label">Progresso Geral</div>
              <div className="progress-pct">{progress}%</div>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-counts">
              <span>{processedCount} de {totalPhotos} fotos analisadas</span>
              <span style={{ color: 'var(--success)' }}>{foundCount} encontradas</span>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-box found">
              <div className="stat-number">{foundCount}</div>
              <div className="stat-desc">Encontradas</div>
            </div>
            <div className="stat-box review">
              <div className="stat-number">{reviewCount}</div>
              <div className="stat-desc">Revisão manual</div>
            </div>
            <div className="stat-box skip">
              <div className="stat-number">{duplicateCount}</div>
              <div className="stat-desc">Duplicatas ignoradas</div>
            </div>
          </div>

          <div className="time-row">
            <div className="time-item">
              <div className="t-label">Status</div>
              <div className="t-value" style={{ color: isPaused ? 'var(--warning)' : 'var(--success)' }}>
                {isPaused ? 'Pausado' : isCompleted ? 'Concluído' : 'Processando'}
              </div>
            </div>
            <div className="time-item">
              <div className="t-label">Foto atual</div>
              <div className="t-value" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {currentFile}
              </div>
            </div>
            <div className="time-item">
              <div className="t-label">Transmissão</div>
              <div className="t-value" style={{ fontSize: 12 }}>SSE Live</div>
            </div>
          </div>

          {/* ── Live Preview das Fotos Encontradas ── */}
          <div className="live-preview-section">
            <div className="live-preview-header">
              <div className="section-label" style={{ margin: 0 }}>
                Visualização em Tempo Real ({foundCount + reviewCount} descobertas)
              </div>
              <div className="live-badge">
                <div className="live-pulse-dot"></div>
                {activePhoto ? 'Match Detectado' : 'Varrendo Acervo'}
              </div>
            </div>

            <div className="live-featured-card">
              {activePhoto ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', height: '100%', maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      key={activePhoto.caminho_foto}
                      src={`${API_BASE_URL}/api/media?path=${encodeURIComponent(activePhoto.caminho_foto)}&thumb=true&size=480`}
                      alt="Preview foto encontrada ao vivo"
                      style={{ maxHeight: '210px', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                    />
                    {renderBoundingBox(activePhoto.bounding_box)}
                  </div>
                  <div className="live-featured-overlay">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        {activePhoto.nome}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {activePhoto.status === 'confirmado' ? '✓ Match Confirmado' : '⚠ Revisão Manual'}
                      </div>
                    </div>
                    <div
                      style={{
                        background: 'var(--accent)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontWeight: 800,
                        fontSize: 13,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {Math.round(activePhoto.score * 100)}%
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.6 }}>🔍</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Rastreando rostos no acervo...</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    As fotos identificadas aparecerão aqui automaticamente.
                  </div>
                </div>
              )}
            </div>

            {/* Carrossel de Miniaturas Recentes */}
            {recentFound.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Últimas fotos encontradas (clique para focar):
                </div>
                <div className="live-carousel-scroll">
                  {recentFound.map((item, idx) => {
                    const isSelected = activePhoto?.caminho_foto === item.caminho_foto;
                    return (
                      <div
                        key={idx}
                        className={`live-carousel-thumb ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedPreview(item)}
                        title={`Foto: ${item.nome} (${Math.round(item.score * 100)}%)`}
                      >
                        <img
                          src={`${API_BASE_URL}/api/media?path=${encodeURIComponent(item.caminho_foto)}&thumb=true&size=160`}
                          alt={item.nome}
                          loading="lazy"
                        />
                        <div className="live-carousel-badge">
                          {Math.round(item.score * 100)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>
              Log de Processamento (SSE Live)
            </div>
            <div className="log-box">
              {logs.map((log, idx) => (
                <div key={idx} className={`log-entry ${log.type}`}>
                  <span className="log-time">{log.time}</span>
                  <span className="log-msg">{log.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="proc-controls">
            {isCompleted ? (
              <button className="btn btn-primary btn-lg" onClick={onComplete}>
                Ver Resultados Reais ({foundCount + reviewCount}) →
              </button>
            ) : (
              <>
                <button
                  className={`btn ${isPaused ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={togglePause}
                >
                  {isPaused ? '▶ Retomar' : '⏸ Pausar'}
                </button>
                <button className="btn btn-danger" onClick={handleCancelSession}>
                  ✕ Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

