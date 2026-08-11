import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { Breadcrumb } from '../components/Breadcrumb';
import { FolderPickerModal } from '../components/FolderPickerModal';
import { RefPhotosDropzone, RefPhotoItem } from '../components/RefPhotosDropzone';
import { open as openTauriDialog } from '@tauri-apps/plugin-dialog';
import {
  cadastrarPessoa,
  criarSessao,
  HardwareStatusDTO,
  obterHardwareStatus,
  selecionarPastaNativa,
  SessaoDTO,
} from '../services/api';

interface ConfigViewProps {
  onStartProcessingReal: (sessao: SessaoDTO) => void;
  onCancel: () => void;
  onNavigateHome: () => void;
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
  const [draggingFolderTarget, setDraggingFolderTarget] = useState<'source' | 'target' | null>(null);

  const sourceFileInputRef = React.useRef<HTMLInputElement>(null);
  const targetFileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function carregarHardware() {
      const hw = await obterHardwareStatus();
      setHardwareInfo(hw);
    }
    carregarHardware();
  }, []);

  const handleFolderDragOver = (e: React.DragEvent, target: 'source' | 'target') => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (draggingFolderTarget !== target) setDraggingFolderTarget(target);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingFolderTarget(null);
  };

  const handleFolderDrop = (e: React.DragEvent, target: 'source' | 'target') => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingFolderTarget(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const path = (file as any).path || file.name;
      if (path) {
        if (target === 'source') setSourcePath(path);
        else setTargetPath(path);
      }
    }
  };

  const handleBrowseFolder = async (target: 'source' | 'target') => {
    const title = target === 'source' ? 'Selecione a Pasta de Origem' : 'Selecione a Pasta de Destino';

    // 1. Tentar diálogo nativo Tauri
    try {
      const selected = await openTauriDialog({
        directory: true,
        multiple: false,
        title,
      });
      if (selected && typeof selected === 'string') {
        if (target === 'source') setSourcePath(selected);
        else setTargetPath(selected);
        return;
      }
    } catch (err) {
      console.warn('Diálogo Tauri não disponível no ambiente web:', err);
    }

    // 2. Tentar seletor de pasta nativo do Windows via API do backend local Python
    const caminhoNativo = await selecionarPastaNativa(title);
    if (caminhoNativo) {
      if (target === 'source') setSourcePath(caminhoNativo);
      else setTargetPath(caminhoNativo);
      return;
    }

    // 3. Fallback: disparar seletor HTML5 de diretório
    if (target === 'source' && sourceFileInputRef.current) {
      sourceFileInputRef.current.click();
    } else if (target === 'target' && targetFileInputRef.current) {
      targetFileInputRef.current.click();
    } else {
      setFolderModalTarget(target);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'source' | 'target') => {
    if (e.target.files && e.target.files.length > 0) {
      const firstFile = e.target.files[0];
      const fullPath = (firstFile as any).path;
      if (fullPath) {
        const parts = fullPath.split(/[/\\]/);
        parts.pop();
        const folderPath = parts.join('\\');
        if (target === 'source') setSourcePath(folderPath);
        else setTargetPath(folderPath);
      }
    }
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

              <RefPhotosDropzone
                refPhotos={refPhotos}
                onChange={setRefPhotos}
                onValidationError={(msg) => setErrorMessage(msg)}
              />
            </div>

            {/* Passo 2 */}
            <div className="separator" style={{ margin: '24px 0' }}></div>
            <div className="section-label">Passo 2</div>
            <div className="section-title">Onde estão suas fotos? (Pasta Origem)</div>
            <div className="section-sub">
              Informe o caminho, selecione a pasta ou arraste a pasta diretamente aqui.
            </div>

            <div
              className={`folder-picker ${draggingFolderTarget === 'source' ? 'drag-active' : ''}`}
              style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}
              onDragOver={(e) => handleFolderDragOver(e, 'source')}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, 'source')}
            >
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
                <input
                  type="file"
                  ref={sourceFileInputRef}
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileInputChange(e, 'source')}
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

            <div
              className={`folder-picker ${draggingFolderTarget === 'target' ? 'drag-active' : ''}`}
              style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}
              onDragOver={(e) => handleFolderDragOver(e, 'target')}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, 'target')}
            >
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
                <input
                  type="file"
                  ref={targetFileInputRef}
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileInputChange(e, 'target')}
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
