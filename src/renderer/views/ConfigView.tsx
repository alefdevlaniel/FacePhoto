import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { Breadcrumb } from '../components/Breadcrumb';
import { FolderPickerModal } from '../components/FolderPickerModal';
import { open as openTauriDialog } from '@tauri-apps/plugin-dialog';
import {
  cadastrarPessoa,
  criarSessao,
  HardwareStatusDTO,
  obterHardwareStatus,
  SessaoDTO,
} from '../services/api';

interface ConfigViewProps {
  onStartProcessingReal: (sessao: SessaoDTO) => void;
  onCancel: () => void;
  onNavigateHome: () => void;
}

interface RefPhotoItem {
  path: string;
  previewUrl: string;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  onStartProcessingReal,
  onCancel,
  onNavigateHome,
}) => {
  const [personName, setPersonName] = useState<string>('');
  const [refPhotos, setRefPhotos] = useState<RefPhotoItem[]>([]);
  const [sourcePath, setSourcePath] = useState<string>('');
  const [targetPath, setTargetPath] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(60);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hardwareInfo, setHardwareInfo] = useState<HardwareStatusDTO | null>(null);
  const [folderModalTarget, setFolderModalTarget] = useState<'source' | 'target' | null>(null);

  useEffect(() => {
    async function carregarHardware() {
      const hw = await obterHardwareStatus();
      setHardwareInfo(hw);
    }
    carregarHardware();
  }, []);

  const handleAddRefPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems: RefPhotoItem[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const previewUrl = URL.createObjectURL(file);
        // @ts-ignore
        const filePath = file.path || file.name;
        newItems.push({ path: filePath, previewUrl });
      }
      setRefPhotos((prev) => [...prev, ...newItems]);
    }
  };

  const handleBrowseFolder = async (target: 'source' | 'target') => {
    try {
      const selected = await openTauriDialog({
        directory: true,
        multiple: false,
        title: target === 'source' ? 'Selecione a Pasta de Origem' : 'Selecione a Pasta de Destino',
      });
      if (selected && typeof selected === 'string') {
        if (target === 'source') setSourcePath(selected);
        else setTargetPath(selected);
        return;
      }
    } catch (err) {
      console.warn('Nativo Tauri dialog indisponível (navegador). Usando seletor web:', err);
    }
    setFolderModalTarget(target);
  };

  const handleStartAnalysis = async () => {
    if (!personName.trim()) {
      setErrorMessage('Por favor, informe o nome da pessoa.');
      return;
    }
    if (refPhotos.length === 0) {
      setErrorMessage('Por favor, adicione pelo menos uma foto de referência da pessoa.');
      return;
    }
    if (!sourcePath.trim()) {
      setErrorMessage('Por favor, informe a pasta de origem das fotos.');
      return;
    }
    if (!targetPath.trim()) {
      setErrorMessage('Por favor, informe a pasta de destino para salvar as fotos.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Cadastrar pessoa no backend com os caminhos reais das fotos
      const fotosEnvio = refPhotos.map((item) => item.path);

      const pessoa = await cadastrarPessoa(personName.trim(), fotosEnvio);

      // 2. Criar sessão de busca no backend
      const sessao = await criarSessao(
        [pessoa.id],
        sourcePath.trim(),
        targetPath.trim(),
        threshold / 100,
        `Busca — ${personName.trim()}`
      );

      // 3. Avançar para o processamento real
      onStartProcessingReal(sessao);
    } catch (err: any) {
      console.error('Erro ao iniciar análise:', err);
      setErrorMessage(err.message || 'Erro ao conectar com o servidor local FastAPI.');
    } finally {
      setLoading(false);
    }
  };

  const isGpu = hardwareInfo ? (hardwareInfo.has_gpu || hardwareInfo.device_type.includes('cuda')) : false;

  return (
    <div className="screen active" id="screen-config">
      <Topbar
        onNavigateHome={onNavigateHome}
        showNewSearchButton={false}
        backButtonLabel="← Voltar"
        onBack={onCancel}
      />
      <Breadcrumb
        items={[
          { label: '🏠 Início', onClick: onNavigateHome },
          { label: 'Nova Busca', active: true },
        ]}
      />
      <div className="content">
        <div className="config-layout">
          <div>
            {errorMessage && (
              <div
                style={{
                  background: 'var(--error-dim)',
                  border: '1px solid rgba(248,113,113,.3)',
                  color: 'var(--error)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  marginBottom: 20,
                  fontSize: 13,
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Passo 1 */}
            <div className="section-label">Passo 1</div>
            <div className="section-title">Quem você quer encontrar?</div>
            <div className="section-sub">
              Adicione o nome e as fotos de referência da pessoa para a IA aprender o rosto.
            </div>

            <div className="person-block">
              <div className="person-name-row">
                <input
                  className="person-name-input"
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Ex: Vó Maria, Tio João..."
                />
              </div>

              <div className="section-label" style={{ marginBottom: 10 }}>
                Fotos de referência ({refPhotos.length} adicionadas)
              </div>
              <div className="ref-photos">
                {refPhotos.map((item, idx) => (
                  <div key={idx} className="ref-photo">
                    <img
                      src={item.previewUrl}
                      alt={`Foto de referência ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      className="remove-btn"
                      onClick={() =>
                        setRefPhotos((items) => items.filter((_, i) => i !== idx))
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <label className="add-photo-btn">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleAddRefPhotos}
                    style={{ display: 'none' }}
                  />
                  <div className="icon">+</div>
                  <div>Adicionar</div>
                </label>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="separator" style={{ margin: '24px 0' }}></div>
            <div className="section-label">Passo 2</div>
            <div className="section-title">Onde estão suas fotos? (Pasta Origem)</div>
            <div className="section-sub">
              Informe o caminho ou selecione a pasta do seu computador ou HD externo.
            </div>

            <div className="folder-picker" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="folder-icon">📁</div>
                <input
                  type="text"
                  className="person-name-input"
                  value={sourcePath}
                  onChange={(e) => setSourcePath(e.target.value)}
                  placeholder="Caminho da pasta de origem (ex: C:\Users\nome\Pictures)..."
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleBrowseFolder('source')}
                >
                  Procurar...
                </button>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="separator" style={{ margin: '24px 0' }}></div>
            <div className="section-label">Passo 3</div>
            <div className="section-title">Onde salvar as fotos encontradas? (Pasta Destino)</div>
            <div className="section-sub">
              As fotos serão <strong>copiadas</strong> — os originais permanecem intactos.
            </div>

            <div className="folder-picker" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="folder-icon">📂</div>
                <input
                  type="text"
                  className="person-name-input"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="Caminho da pasta de destino (ex: C:\Users\nome\Desktop\Fotos)..."
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleBrowseFolder('target')}
                >
                  Procurar...
                </button>
              </div>
            </div>

            {/* Avançado */}
            <div className="separator" style={{ margin: '24px 0' }}></div>
            <div className="section-label">Configurações Avançadas</div>
            <div className="card mt-8">
              <div className="threshold-row">
                <div>
                  <div style={{ fontWeight: 600 }}>Sensibilidade / Confiança do Reconhecimento</div>
                  <div className="text-sm text-secondary">
                    Valores mais altos (70%-80%) exigem maior certeza da IA. Valores mais baixos (40%-50%) encontram mais fotos porém podem exigir revisão.
                  </div>
                </div>
                <div className="threshold-value">{threshold}%</div>
              </div>
              <input
                type="range"
                className="slider mt-16"
                min="30"
                max="90"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>

            {errorMessage && (
              <div
                className="card"
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderColor: 'var(--danger)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Painel Direito */}
          <div className="config-side">
            <div className="side-card">
              <div className="side-card-title">Visão Geral da Configuração</div>
              <div className="info-item">
                <div style={{ fontSize: 16 }}>👤</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Buscando por</div>
                  <div className="text-sm text-secondary">{personName || '(Pessoa não informada)'}</div>
                </div>
              </div>
              <div className="info-item">
                <div style={{ fontSize: 16 }}>🖼️</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Fotos de Referência</div>
                  <div className="text-sm text-secondary">{refPhotos.length} adicionada(s)</div>
                </div>
              </div>
              <div className="info-item">
                <div style={{ fontSize: 16 }}>⚙️</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Limiar de Precisão</div>
                  <div className="text-sm text-secondary">{threshold}% (ArcFace Cosseno)</div>
                </div>
              </div>
            </div>

            <div className="side-card">
              <div className="side-card-title">Ambiente de Execução</div>
              <div className="info-item">
                <div style={{ fontSize: 16 }}>⚡</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {isGpu ? '⚡ GPU Detectada' : '💻 Processador (CPU)'}
                  </div>
                  <div
                    className="text-sm"
                    style={{
                      color: isGpu ? 'var(--success)' : 'var(--warning)',
                      fontWeight: 600,
                    }}
                  >
                    {hardwareInfo ? hardwareInfo.name : 'Detectando hardware...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="config-footer">
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓</span>{' '}
          Dispositivo de Aceleração: <strong style={{ color: isGpu ? 'var(--success)' : 'var(--warning)' }}>{hardwareInfo ? hardwareInfo.name : 'Detectando...'}</strong>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleStartAnalysis}
            disabled={loading}
          >
            {loading ? 'Criando sessão...' : '▶ Iniciar Análise Real'}
          </button>
        </div>
      </div>

      <FolderPickerModal
        isOpen={Boolean(folderModalTarget)}
        title={folderModalTarget === 'source' ? 'Selecione a Pasta de Origem' : 'Selecione a Pasta de Destino'}
        currentPath={folderModalTarget === 'source' ? sourcePath : targetPath}
        onSelect={(path) => {
          if (folderModalTarget === 'source') setSourcePath(path);
          else if (folderModalTarget === 'target') setTargetPath(path);
        }}
        onClose={() => setFolderModalTarget(null)}
      />
    </div>
  );
};
