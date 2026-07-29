import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import {
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
              <div className="t-value" style={{ fontSize: 12 }}>SSE Local</div>
            </div>
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
