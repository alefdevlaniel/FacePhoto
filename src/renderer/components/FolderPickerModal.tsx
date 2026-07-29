import React, { useState } from 'react';

interface FolderPickerModalProps {
  isOpen: boolean;
  title: string;
  currentPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

export const FolderPickerModal: React.FC<FolderPickerModalProps> = ({
  isOpen,
  title,
  currentPath,
  onSelect,
  onClose,
}) => {
  const [pathInput, setPathInput] = useState<string>(currentPath);

  if (!isOpen) return null;

  const quickPresets = [
    { label: '🖼️ Imagens (Pictures)', path: 'C:\\Users\\alefl\\Pictures' },
    { label: '🖥️ Área de Trabalho (Desktop)', path: 'C:\\Users\\alefl\\Desktop\\Fotos_Encontradas' },
    { label: '📂 Documentos (Documents)', path: 'C:\\Users\\alefl\\Documents' },
    { label: '⬇️ Downloads', path: 'C:\\Users\\alefl\\Downloads' },
    { label: '💾 HD Externo (D:\\)', path: 'D:\\Fotos' },
  ];

  const handleApply = () => {
    if (pathInput.trim()) {
      onSelect(pathInput.trim());
      onClose();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // @ts-ignore
      const firstPath = e.target.files[0].path || '';
      if (firstPath) {
        const parts = firstPath.split(/[/\\]/);
        parts.pop();
        const folder = parts.join('\\');
        setPathInput(folder);
      }
    }
  };

  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div
        className="custom-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Digite ou cole o caminho absoluto da pasta:
          </label>
          <input
            type="text"
            className="person-name-input"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="Ex: C:\Users\nome\Pictures\MinhasFotos"
            style={{ width: '100%', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
            autoFocus
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Atalhos rápidos de pastas no sistema:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {quickPresets.map((preset, idx) => (
              <button
                key={idx}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: 12 }}
                onClick={() => setPathInput(preset.path)}
              >
                {preset.label} — <span style={{ opacity: 0.6, fontSize: 11 }}>{preset.path}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <input
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            📁 Escolher Arquivos na Pasta
          </label>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleApply}>Confirmar Pasta</button>
          </div>
        </div>
      </div>
    </div>
  );
};
