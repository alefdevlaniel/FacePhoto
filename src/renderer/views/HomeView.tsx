import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { ConfirmModal } from '../components/ConfirmModal';
import { API_BASE_URL, excluirSessao, SessaoDTO } from '../services/api';

interface HomeViewProps {
  onNewSearch: () => void;
  onResumeSession: (sessaoId: string) => void;
  onNavigateResults: (sessaoId: string) => void;
  onNavigateHome: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNewSearch,
  onResumeSession,
  onNavigateResults,
  onNavigateHome,
}) => {
  const [sessoes, setSessoes] = useState<SessaoDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingLoading, setDeletingLoading] = useState<boolean>(false);

  const carregarHistorico = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessoes`);
      if (res.ok) {
        const data: SessaoDTO[] = await res.json();
        setSessoes(data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de sessões:', err);
    } finally {
      setLoading(false);
    }
  };

  const promptDeleteSession = (sessaoId: string, nomeSessao?: string | null) => {
    setSessionToDelete({ id: sessaoId, name: nomeSessao || 'esta busca' });
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    setDeletingLoading(true);
    try {
      await excluirSessao(sessionToDelete.id);
      setSessoes((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
      setSessionToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir sessão:', err);
    } finally {
      setDeletingLoading(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  const formatarData = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="screen active" id="screen-home">
      <Topbar
        onNavigateHome={onNavigateHome}
        onNewSearch={onNewSearch}
        showNewSearchButton={true}
      />
      <div className="content">
        <div className="home-header">
          <div>
            <h1>Boas-vindas de volta! 👋</h1>
            <p>Selecione uma busca do histórico para retomar ou visualizar os resultados parciais/totais.</p>
          </div>
          <button className="btn btn-primary" onClick={onNewSearch}>
            + Nova Busca
          </button>
        </div>

        <div className="history-label">Buscas Recentes (Histórico SQLite)</div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Carregando histórico do banco de dados...
          </div>
        ) : sessoes.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 32,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 40 }}>📁</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Nenhuma busca realizada ainda</div>
              <div className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
                Cadastre pessoas e selecione uma pasta para iniciar sua primeira análise.
              </div>
            </div>
            <button className="btn btn-primary btn-lg mt-8" onClick={onNewSearch}>
              + Iniciar Primeira Busca
            </button>
          </div>
        ) : (
          <div className="history-grid">
            {sessoes.map((sessao) => {
              const isConcluida = sessao.status === 'concluida';
              const isInterrompida = sessao.status === 'interrompida' || sessao.status === 'pausada';

              return (
                <div key={sessao.id} className="history-card" style={{ cursor: 'default' }}>
                  <div
                    className="history-avatar"
                    style={{ background: 'linear-gradient(135deg,#00B4D8,#0B2545)' }}
                  >
                    {sessao.nome_sessao ? sessao.nome_sessao.charAt(0).toUpperCase() : 'B'}
                  </div>

                  <div className="history-info">
                    <h3>{sessao.nome_sessao || 'Busca de Fotos'}</h3>
                    <p>{sessao.pasta_origem}</p>

                    <div className="history-meta" style={{ marginTop: 8 }}>
                      <span
                        className={`badge ${
                          isConcluida
                            ? 'badge-success'
                            : isInterrompida
                            ? 'badge-warning'
                            : 'badge-accent'
                        }`}
                      >
                        {isConcluida
                          ? '✓ Concluída'
                          : isInterrompida
                          ? '⏸ Interrompida'
                          : '⚡ Em andamento'}
                      </span>
                      <span className="badge badge-muted">{formatarData(sessao.iniciado_em)}</span>
                      <span className="badge badge-muted">
                        Threshold: {Math.round(sessao.threshold * 100)}%
                      </span>
                      {sessao.total_encontradas > 0 && (
                        <span className="badge badge-success">
                          {sessao.total_encontradas} encontradas
                        </span>
                      )}
                    </div>

                    {/* Botões de Ação Diretos no Card */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                      {!isConcluida && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onResumeSession(sessao.id)}
                        >
                          ▶ Retomar Busca
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onNavigateResults(sessao.id)}
                      >
                        👁 {isConcluida ? 'Ver Resultados' : 'Resultados Parciais'} ({sessao.total_encontradas})
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => promptDeleteSession(sessao.id, sessao.nome_sessao)}
                        title="Excluir busca do histórico"
                      >
                        🗑 Excluir
                      </button>
                    </div>
                  </div>

                  <div className="history-stats">
                    <div className="stat-big">{sessao.total_copiadas}</div>
                    <div className="stat-label">fotos copiadas</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(sessionToDelete)}
        title="Excluir busca do histórico"
        message={`Tem certeza que deseja excluir "${sessionToDelete?.name}" do seu histórico de buscas? Esta ação é permanente e removerá os dados gravados no SQLite local.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
        loading={deletingLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
};
