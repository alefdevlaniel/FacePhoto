# 07 — Stack Tecnológico

**Projeto:** FacePhoto
**Versão:** 1.0
**Data:** 25/07/2026
**Responsável:** @Arquiteto

---

## 1. Visão Geral da Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    STACK FACEPHOTO                          │
│                                                             │
│  INTERFACE     │  React 18 + TypeScript + Vite              │
│                │  Tauri 2 (Rust shell)                      │
│                │  CSS Modules / Vanilla CSS                  │
│                │  Fonte: Inter (Google Fonts — offline)     │
├────────────────┼────────────────────────────────────────────┤
│  COMUNICAÇÃO   │  FastAPI (HTTP REST + SSE)                  │
│                │  Pydantic v2 (validação e tipagem)          │
├────────────────┼────────────────────────────────────────────┤
│  CORE ENGINE   │  Python 3.11+                               │
│                │  DeepFace (v1.0) / InsightFace (v1.1+)     │
│                │  ONNX Runtime (aceleração)                  │
│                │  OpenCV (processamento de imagem)           │
│                │  imagehash (deduplicação)                   │
│                │  Pillow + rawpy + pillow-heif (formatos)   │
├────────────────┼────────────────────────────────────────────┤
│  PERSISTÊNCIA  │  SQLite 3 (via sqlite3 nativo Python)       │
├────────────────┼────────────────────────────────────────────┤
│  TESTES        │  pytest + pytest-asyncio + coverage         │
│                │  pytest-mock (mocks e stubs)                │
├────────────────┼────────────────────────────────────────────┤
│  EMPACOTAMENTO │  PyInstaller (backend Python)               │
│                │  Tauri bundler (instalador final)           │
│                │  Instaladores: .exe | .dmg | .AppImage/.deb│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Detalhamento por Camada

---

### 2.1 Interface (Frontend)

#### React 18 + TypeScript

- **Por quê React:** Componentização madura, ecossistema rico, curva de aprendizado razoável para manutenção futura
- **Por quê TypeScript:** Tipagem estática previne erros em tempo de desenvolvimento; fundamental para projeto de longa vida
- **Por quê Vite:** Build tool moderno, rápido para desenvolvimento local, compatível com Tauri

**Versões:**

| Dependência | Versão | Propósito |
|---|---|---|
| `react` | 18.x | Framework UI |
| `typescript` | 5.x | Tipagem estática |
| `vite` | 5.x | Build tool e dev server |
| `@tauri-apps/api` | 2.x | Bridge Tauri → Rust → OS |

#### Tauri 2

- **Por quê Tauri:** Instalador leve (~10-20 MB vs ~150 MB do Electron), usa WebView nativo do SO, escrito em Rust (segurança e performance)
- **Responsabilidade:** Empacotar o app React + servidor Python em um único instalador executável nativo por plataforma

**Capacidades Tauri utilizadas:**
- `dialog::open` — seletor de arquivos/diretórios nativo
- `shell::open` — abrir pasta no explorador nativo
- `window` — controle da janela (título, tamanho, etc.)
- HTTP client para comunicar com FastAPI local

#### CSS

- **Abordagem:** Vanilla CSS com CSS Custom Properties (variáveis CSS)
- **Sem frameworks:** Sem Tailwind ou Bootstrap — controle total sobre o visual
- **Organização:**
  ```
  src/renderer/styles/
  ├── tokens.css        # Design tokens (cores, tipografia, espaços)
  ├── reset.css         # Normalização cross-browser
  ├── global.css        # Estilos globais
  └── components/       # CSS por componente
  ```

---

### 2.2 Backend (API)

#### FastAPI

- **Por quê FastAPI:** Suporte nativo a async/await (essencial para não bloquear a UI durante processamento longo), Server-Sent Events (SSE) para streaming de progresso, Pydantic integrado, documentação automática
- **Versão:** FastAPI 0.115.x + Uvicorn 0.30.x

**Endpoints e características:**

```python
# Exemplo de endpoint de streaming de progresso
@router.get("/sessoes/{sessao_id}/progresso")
async def stream_progresso(sessao_id: str):
    async def gerador():
        async for evento in busca_service.obter_progresso(sessao_id):
            yield f"data: {evento.model_dump_json()}\n\n"
    return StreamingResponse(gerador(), media_type="text/event-stream")
```

#### Pydantic v2

- Validação automática de entrada e saída de todos os endpoints
- Serialização/deserialização JSON com tipagem forte
- Schemas compartilhados entre rotas e serviços

---

### 2.3 Core Engine (Motor de IA)

#### Python 3.11+

- Versão escolhida por: melhor performance de runtime, suporte a tipos modernos (`X | Y`, `match/case`), LTS até 2027

#### Motor de Reconhecimento Facial — v1.0: DeepFace

| Campo | Detalhe |
|---|---|
| **Biblioteca** | `deepface` 0.0.93+ |
| **Detector padrão** | RetinaFace (melhor precisão em grupos) |
| **Modelo de embedding** | ArcFace (128-D vector) |
| **Métrica de comparação** | Cosine Similarity |
| **Por quê DeepFace no v1.0** | Uma única API para detecção + embedding + comparação; facilita prototipagem e permite troca de backend interno sem mudar código externo |

**Plano de upgrade para v1.1:**

| Campo | Detalhe |
|---|---|
| **Biblioteca** | `insightface` 0.7.x + `onnxruntime` |
| **Detector** | SCRFD (mais rápido) ou RetinaFace |
| **Modelo de embedding** | buffalo_l (ArcFace ONNX — melhor precisão e velocidade com GPU) |
| **Por quê InsightFace depois** | 20-40% mais rápido com ONNX, maior precisão em benchmarks, melhor suporte GPU |

#### Deduplicação — imagehash

```python
import imagehash
from PIL import Image

def calcular_hash(caminho: str) -> str:
    img = Image.open(caminho)
    return str(imagehash.phash(img))  # Perceptual Hash

# Distância Hamming ≤ 5 = imagens visualmente idênticas
def sao_duplicatas(hash1: str, hash2: str) -> bool:
    return imagehash.hex_to_hash(hash1) - imagehash.hex_to_hash(hash2) <= 5
```

**Por quê imagehash:** Leve, rápido, detecta duplicatas mesmo com compressão diferente, redimensionamento ou metadados alterados.

#### Suporte a Formatos — Pillow + rawpy + pillow-heif

| Formato | Biblioteca |
|---|---|
| JPG, PNG, WebP, BMP, TIFF | `Pillow` (PIL) |
| RAW (CR2, CR3, NEF, ARW, etc.) | `rawpy` |
| HEIC, HEIF (iPhone) | `pillow-heif` |

```python
# Abertura unificada de qualquer formato suportado
def abrir_imagem(caminho: Path) -> Image.Image:
    extensao = caminho.suffix.lower()
    if extensao in {".heic", ".heif"}:
        from pillow_heif import register_heif_opener
        register_heif_opener()
    elif extensao in {".cr2", ".cr3", ".nef", ".arw", ".orf", ".rw2", ".dng"}:
        import rawpy
        with rawpy.imread(str(caminho)) as raw:
            return Image.fromarray(raw.postprocess())
    return Image.open(caminho)
```

#### Aceleração — ONNX Runtime

| Plataforma | Backend ONNX |
|---|---|
| NVIDIA (CUDA) | `onnxruntime-gpu` com `CUDAExecutionProvider` |
| AMD (ROCm) | `onnxruntime-rocm` |
| Apple Silicon | `onnxruntime` com `CoreMLExecutionProvider` |
| CPU (fallback) | `onnxruntime` com `CPUExecutionProvider` |

---

### 2.4 Persistência

#### SQLite 3

- **Localização:** `~/.facephoto/database.db` (multiplataforma via `platformdirs`)
- **Interface:** `sqlite3` (nativo Python) — sem ORM para manter dependências mínimas
- **Por quê sem ORM (SQLAlchemy):** Simplicidade, zero dependências extras, queries SQL diretas são suficientes para o volume do projeto

```python
# Uso via context manager para garantir fechamento de conexão
from contextlib import contextmanager
import sqlite3

@contextmanager
def conexao_db():
    conn = sqlite3.connect(CAMINHO_DB)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

---

### 2.5 Testes

| Ferramenta | Propósito |
|---|---|
| `pytest` | Framework de testes |
| `pytest-asyncio` | Testes de código assíncrono (FastAPI) |
| `pytest-mock` | Mocks e stubs para isolamento |
| `coverage` | Relatório de cobertura de código |
| `httpx` | Cliente HTTP para testes de endpoint FastAPI |

**Meta de cobertura:** ≥ 80% nos módulos de `core/`

---

### 2.6 Qualidade de Código

| Ferramenta | Propósito |
|---|---|
| `ruff` | Linter Python (substitui flake8 + isort) |
| `black` | Formatador de código Python |
| `mypy` | Verificação de tipos estáticos Python |
| `eslint` | Linter TypeScript/React |
| `prettier` | Formatador TypeScript/CSS |

**Configuração em `pyproject.toml` e `.eslintrc`**

---

### 2.7 Empacotamento e Distribuição

#### Fluxo de Build

```
1. Build do Frontend:
   npm run build → dist/ (HTML/JS/CSS estático)

2. Empacotamento do Backend Python:
   PyInstaller → backend_bundle/ (executável Python autocontido)

3. Inclusão dos Modelos de IA:
   Modelos ArcFace/RetinaFace copiados para bundle/models/

4. Build final do Tauri:
   tauri build → Instaladores nativos por plataforma
```

#### Instaladores Gerados

| Plataforma | Formato | Tamanho estimado |
|---|---|---|
| Windows 10/11 | `.exe` (NSIS installer) | ~400-600 MB* |
| macOS 12+ | `.dmg` | ~400-600 MB* |
| Ubuntu/Debian | `.deb` | ~400-600 MB* |
| Linux genérico | `.AppImage` | ~400-600 MB* |

> *O tamanho é maior que um app web tradicional por incluir os modelos de IA pré-treinados (~200-300 MB) e o runtime Python.

---

## 3. Dependências Python Completas

```toml
# pyproject.toml - dependências do backend

[project]
name = "facephoto-backend"
version = "1.0.0"
requires-python = ">=3.11"

dependencies = [
    # API
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "pydantic>=2.7.0",

    # Motor de Reconhecimento Facial
    "deepface>=0.0.93",          # v1.0
    # "insightface>=0.7.3",      # v1.1 (substitui deepface)

    # Aceleração
    "onnxruntime>=1.18.0",       # CPU
    # "onnxruntime-gpu>=1.18.0", # GPU NVIDIA (alternativa)

    # Processamento de Imagem
    "opencv-python-headless>=4.9.0",
    "Pillow>=10.3.0",
    "rawpy>=0.22.0",
    "pillow-heif>=0.16.0",

    # Deduplicação
    "ImageHash>=4.3.1",

    # Utilitários
    "platformdirs>=4.2.0",      # Caminhos de dados do usuário
    "tqdm>=4.66.0",             # Progress bars no backend
]

[project.optional-dependencies]
dev = [
    "pytest>=8.2.0",
    "pytest-asyncio>=0.23.0",
    "pytest-mock>=3.14.0",
    "coverage>=7.5.0",
    "httpx>=0.27.0",
    "ruff>=0.4.0",
    "black>=24.4.0",
    "mypy>=1.10.0",
]
```

---

## 4. Dependências Node.js

```json
// package.json - dependências do frontend

{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^9.0.0",
    "prettier": "^3.2.0"
  }
}
```

---

## 5. Compatibilidade de Plataformas

| Componente | Windows 10/11 | macOS 12+ | Ubuntu 22.04+ |
|---|:---:|:---:|:---:|
| Tauri 2 | ✅ | ✅ | ✅ |
| Python 3.11 | ✅ | ✅ | ✅ |
| DeepFace | ✅ | ✅ | ✅ |
| CUDA (NVIDIA GPU) | ✅ | ❌ | ✅ |
| Apple Metal (MPS) | ❌ | ✅ | ❌ |
| HEIC (pillow-heif) | ✅ | ✅ | ✅ |
| RAW (rawpy) | ✅ | ✅ | ✅ |

---

*Documento elaborado pelo agente `@Arquiteto` com base nos requisitos e nas melhores práticas de engenharia de software (25/07/2026).*
