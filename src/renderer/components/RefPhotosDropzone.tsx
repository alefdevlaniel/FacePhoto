import React, { useState, useEffect, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open as openTauriDialog } from '@tauri-apps/plugin-dialog';
import { API_BASE_URL } from '../services/api';

export interface RefPhotoItem {
  path: string;
  previewUrl: string;
}

interface RefPhotosDropzoneProps {
  refPhotos: RefPhotoItem[];
  onChange: (photos: RefPhotoItem[]) => void;
  onValidationError?: (msg: string | null) => void;
}

const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.bmp',
  '.tiff',
  '.tif',
  '.jfif',
  '.heic',
  '.heif',
  '.gif',
  '.svg',
];

export const RefPhotosDropzone: React.FC<RefPhotosDropzoneProps> = ({
  refPhotos,
  onChange,
  onValidationError,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isImageFile = (filePathOrName: string): boolean => {
    const lower = filePathOrName.toLowerCase();
    return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  };

  const processFilePathsAndFiles = (paths: string[], files?: File[]) => {
    const newItems: RefPhotoItem[] = [];
    let invalidCount = 0;

    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      const fileObj = files && files[i] ? files[i] : undefined;

      if (!isImageFile(p)) {
        invalidCount++;
        continue;
      }

      let previewUrl = '';

      // 1. Se tivermos o objeto File do navegador/Webview, usar Blob URL (100% garantido no DOM)
      if (fileObj) {
        try {
          previewUrl = URL.createObjectURL(fileObj);
        } catch {
          // fallback
        }
      }

      // 2. Se for caminho absoluto do SO, usar a rota /api/media do backend local FastAPI
      if (!previewUrl && p && (p.includes('/') || p.includes('\\'))) {
        previewUrl = `${API_BASE_URL}/api/media?path=${encodeURIComponent(p)}`;
      }

      // 3. Fallback adicional para convertFileSrc
      if (!previewUrl && p) {
        try {
          previewUrl = convertFileSrc(p);
        } catch {
          // fallback
        }
      }

      newItems.push({
        path: p,
        previewUrl: previewUrl || p,
      });
    }

    if (invalidCount > 0 && onValidationError) {
      onValidationError(
        `${invalidCount} arquivo(s) ignorado(s) por não ter(em) formato de imagem válido (.jpg, .png, .webp, etc.).`
      );
    } else if (onValidationError) {
      onValidationError(null);
    }

    if (newItems.length > 0) {
      onChange([
        ...refPhotos,
        ...newItems.filter((item) => !refPhotos.some((existing) => existing.path === item.path)),
      ]);
    }
  };

  // Escutar eventos nativos de Drag & Drop do Tauri (OS File Drop)
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    async function setupTauriListener() {
      try {
        const appWin = getCurrentWindow();
        const unlistenFn = await appWin.onDragDropEvent((event) => {
          const type = event.payload.type;
          if (type === 'enter' || type === 'over') {
            setIsDragging(true);
          } else if (type === 'drop') {
            setIsDragging(false);
            if ('paths' in event.payload && event.payload.paths && event.payload.paths.length > 0) {
              processFilePathsAndFiles(event.payload.paths);
            }
          } else if (type === 'leave') {
            setIsDragging(false);
          }
        });
        unlisten = unlistenFn;
      } catch {
        // Ignora se não estiver em ambiente Tauri nativo
      }
    }

    setupTauriListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [refPhotos]);

  // Handlers HTML5 Drag & Drop (Navegador e WebView)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragging) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const paths = filesArray.map((f) => (f as any).path || f.name);
      processFilePathsAndFiles(paths, filesArray);
    }
  };

  // Diálogo nativo do Sistema Operacional via Tauri Dialog Plugin
  const handlePickFiles = async () => {
    try {
      const selected = await openTauriDialog({
        multiple: true,
        title: 'Selecione Fotos de Referência',
        filters: [
          {
            name: 'Imagens de Referência',
            extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'jfif', 'heic', 'gif'],
          },
        ],
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        processFilePathsAndFiles(paths);
        return;
      }
    } catch (err) {
      console.warn('Diálogo nativo Tauri indisponível. Usando seletor web:', err);
    }

    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const paths = filesArray.map((f) => (f as any).path || f.name);
      processFilePathsAndFiles(paths, filesArray);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = refPhotos.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="ref-photos-section">
      <div className="ref-photos-header">
        <span className="section-label" style={{ marginBottom: 0 }}>
          Fotos de referência ({refPhotos.length} adicionada{refPhotos.length === 1 ? '' : 's'})
        </span>
        {refPhotos.length > 0 && (
          <button
            type="button"
            className="btn-clear-all"
            onClick={handleClearAll}
            title="Remover todas as fotos de referência"
          >
            🗑 Limpar Todas
          </button>
        )}
      </div>

      {/* Grid de Thumbnails das Fotos de Referência */}
      {refPhotos.length > 0 && (
        <div className="ref-photos-grid">
          {refPhotos.map((item, idx) => (
            <div key={idx} className="ref-photo-card" title={item.path}>
              <img
                src={item.previewUrl}
                alt={`Foto de referência ${idx + 1}`}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallbackStep) {
                    target.dataset.fallbackStep = '1';
                    target.src = `${API_BASE_URL}/api/media?path=${encodeURIComponent(item.path)}`;
                  } else if (target.dataset.fallbackStep === '1') {
                    target.dataset.fallbackStep = '2';
                    try {
                      target.src = convertFileSrc(item.path);
                    } catch {
                      // ignore
                    }
                  }
                }}
              />
              <button
                type="button"
                className="remove-btn"
                onClick={() => handleRemovePhoto(idx)}
                title="Remover foto de referência"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Área interativa de Dropzone (Drag and Drop do SO) */}
      <div
        className={`dropzone-box ${isDragging ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handlePickFiles}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        <div className="dropzone-icon">{isDragging ? '📥' : '🖼️'}</div>

        <div className="dropzone-text">
          {isDragging ? (
            <strong style={{ color: 'var(--accent)' }}>Solte as fotos de referência aqui!</strong>
          ) : (
            <>
              <strong>Arraste e solte fotos aqui</strong> ou clique para navegar
            </>
          )}
        </div>

        <div className="dropzone-sub">
          Suporta JPG, PNG, WEBP, BMP, HEIC · Selecione quantas fotos quiser
        </div>
      </div>
    </div>
  );
};
