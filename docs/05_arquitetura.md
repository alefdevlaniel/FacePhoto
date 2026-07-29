# 05 — Arquitetura do Sistema

**Projeto:** FacePhoto
**Versão:** 1.0
**Data:** 25/07/2026
**Responsável:** @Arquiteto

---

## 1. Visão Geral da Arquitetura

O FacePhoto adota uma **arquitetura em camadas com separação clara entre UI, API e Core Engine**. A interface gráfica é construída como um aplicativo web local (HTML/CSS/JS com React), que se comunica com um servidor FastAPI local via HTTP. O motor de processamento de imagens é inteiramente Python.

Essa arquitetura permite:
- Troca do motor de IA sem alterar a interface
- Interface moderna e multiplataforma (via Tauri)
- Separação testável de cada componente
- Escalabilidade para funcionalidades futuras (vídeo, nuvem, mobile)

---

## 2. Diagrama de Arquitetura Geral

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FACEPHOTO — DESKTOP APP                           │
│                        (Tauri: Rust shell)                               │
│                                                                          │
│  ┌────────────────────────────────────────┐                             │
│  │          UI LAYER (React/TypeScript)   │                             │
│  │                                        │                             │
│  │  ┌──────────┐  ┌──────────┐  ┌──────┐ │                             │
│  │  │  Tela    │  │  Tela    │  │ Tela │ │                             │
│  │  │ Config.  │  │ Progress │  │Resul.│ │                             │
│  │  └────┬─────┘  └────┬─────┘  └──┬───┘ │                             │
│  │       │              │           │     │                             │
│  │  ┌────▼──────────────▼───────────▼───┐ │                             │
│  │  │        API Client (fetch/axios)   │ │                             │
│  │  └──────────────────┬────────────────┘ │                             │
│  └─────────────────────┼──────────────────┘                             │
│                        │ HTTP (localhost)                                │
│  ┌─────────────────────▼──────────────────┐                             │
│  │        BACKEND LAYER (FastAPI/Python)   │                             │
│  │                                        │                             │
│  │  ┌──────────────┐  ┌───────────────┐  │                             │
│  │  │   /session   │  │  /progress    │  │                             │
│  │  │   /results   │  │  /copy        │  │                             │
│  │  └──────┬───────┘  └───────┬───────┘  │                             │
│  │         │                  │           │                             │
│  │  ┌──────▼──────────────────▼─────────┐ │                             │
│  │  │           CORE ENGINE             │ │                             │
│  │  │                                   │ │                             │
│  │  │ ┌─────────────┐ ┌──────────────┐  │ │                             │
│  │  │ │  File       │ │  Duplicate   │  │ │                             │
│  │  │ │  Scanner    │ │  Detector    │  │ │                             │
│  │  │ └──────┬──────┘ └──────┬───────┘  │ │                             │
│  │  │        │               │           │ │                             │
│  │  │ ┌──────▼───────────────▼────────┐  │ │                             │
│  │  │ │      Face Recognition Engine  │  │ │                             │
│  │  │ │  ┌──────────┐ ┌────────────┐  │  │ │                             │
│  │  │ │  │ Detector │ │ Embedder   │  │  │ │                             │
│  │  │ │  │(RetinaF.)│ │(ArcFace)   │  │  │ │                             │
│  │  │ │  └──────────┘ └────────────┘  │  │ │                             │
│  │  │ └───────────────────────────────┘  │ │                             │
│  │  │                                   │ │                             │
│  │  │ ┌──────────────┐ ┌──────────────┐ │ │                             │
│  │  │ │  Result      │ │  File Copy   │ │ │                             │
│  │  │ │  Ranker      │ │  Manager     │ │ │                             │
│  │  │ └──────────────┘ └──────────────┘ │ │                             │
│  │  └───────────────────────────────────┘ │                             │
│  │                                        │                             │
│  │  ┌──────────────────────────────────┐  │                             │
│  │  │  INFRASTRUCTURE                  │  │                             │
│  │  │  SQLite DB | GPU Detector | Logs │  │                             │
│  │  └──────────────────────────────────┘  │                             │
│  └────────────────────────────────────────┘                             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Camadas da Arquitetura

### 3.1 Camada de Interface (UI Layer)

**Tecnologia:** React + TypeScript, compilado e servido pelo Tauri

**Responsabilidades:**
- Renderizar as telas do aplicativo
- Capturar ações do usuário (cliques, uploads, seleções)
- Comunicar com o backend via requisições HTTP locais
- Exibir progresso em tempo real via Server-Sent Events (SSE) ou WebSocket
- Nenhuma lógica de negócio ou IA deve existir nesta camada

**Telas:**
```
src/renderer/
├── pages/
│   ├── Home.tsx           # Tela inicial / histórico
│   ├── NewSearch.tsx      # Configuração de busca
│   ├── Processing.tsx     # Progresso em tempo real
│   ├── Results.tsx        # Grade de resultados
│   └── Report.tsx         # Relatório final
├── components/
│   ├── PhotoGrid.tsx      # Grade de miniaturas
│   ├── PhotoViewer.tsx    # Visualizador ampliado
│   ├── ProgressBar.tsx    # Barra de progresso
│   ├── PersonCard.tsx     # Card de pessoa de referência
│   └── ThresholdSlider.tsx
└── services/
    └── api.ts             # Client HTTP para o backend
```

---

### 3.2 Camada de Backend (API Layer)

**Tecnologia:** FastAPI (Python 3.11+)

**Responsabilidades:**
- Expor endpoints REST para a UI
- Orquestrar a execução do Core Engine
- Transmitir progresso em tempo real (SSE)
- Gerenciar sessões de busca
- Persistir dados no banco SQLite

**Endpoints principais:**

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/pessoas` | Cadastrar pessoa com fotos de referência |
| `GET` | `/api/pessoas` | Listar pessoas cadastradas |
| `POST` | `/api/sessoes` | Criar e iniciar nova sessão de busca |
| `GET` | `/api/sessoes/{id}/progresso` | Stream de progresso (SSE) |
| `GET` | `/api/sessoes/{id}/resultados` | Listar resultados da sessão |
| `POST` | `/api/sessoes/{id}/copiar` | Copiar fotos selecionadas |
| `GET` | `/api/sessoes` | Histórico de sessões |

**Estrutura:**
```
src/backend/
├── main.py                # Entry point FastAPI
├── routers/
│   ├── pessoas.py
│   ├── sessoes.py
│   └── resultados.py
├── services/
│   ├── busca_service.py   # Orquestra o Core Engine
│   └── copia_service.py   # Gerencia cópia de arquivos
└── models/
    ├── pessoa.py
    ├── sessao.py
    └── resultado.py
```

---

### 3.3 Core Engine (Motor de IA)

**Tecnologia:** Python puro com bibliotecas de visão computacional

**Responsabilidades:**
- Varrer o sistema de arquivos e filtrar imagens suportadas
- Calcular hash perceptual para deduplicação
- Detectar rostos em cada imagem
- Extrair embeddings faciais
- Comparar embeddings com as referências
- Retornar resultados ranqueados por score

#### 3.3.1 Módulo: FileScanner

```
Entrada:  Caminho da pasta de origem
Saída:    Lista de caminhos de arquivos de imagem válidos

Responsabilidades:
  - Percorrer recursivamente a pasta e subpastas
  - Filtrar por extensão suportada (JPG, PNG, WebP, HEIC, RAW, BMP, TIFF)
  - Retornar lista de Path objects para processamento
```

#### 3.3.2 Módulo: DuplicateDetector

```
Entrada:  Lista de caminhos de imagens
Saída:    Lista deduplicada + relatório de grupos de duplicatas

Responsabilidades:
  - Calcular pHash (perceptual hash) de cada imagem usando imagehash
  - Agrupar imagens com hash idêntico ou distância Hamming ≤ 5
  - Para cada grupo, manter apenas 1 representante (maior resolução)
  - Retornar lista filtrada para análise
```

#### 3.3.3 Módulo: FaceRecognitionEngine

```
Entrada:  Caminho de imagem + embeddings de referência
Saída:    Lista de matches com score de confiança

Responsabilidades:
  - Detectar rostos: RetinaFace (InsightFace) ou MTCNN (DeepFace)
  - Extrair embeddings: ArcFace (InsightFace) ou FaceNet (DeepFace)
  - Calcular similaridade de cosseno entre rosto detectado e referências
  - Retornar lista de (score, bounding_box) para cada rosto

Interface abstrata (para troca de motor sem alterar resto):
  class FaceEngineBase(ABC):
      @abstractmethod
      def extract_embeddings(self, image_path: str) -> list[Embedding]: ...

      @abstractmethod
      def compare(self, embedding: Embedding, references: list[Embedding]) -> float: ...
```

#### 3.3.4 Módulo: ResultRanker

```
Entrada:  Lista bruta de resultados com scores
Saída:    Resultados classificados em: confirmados | revisão | descartados

Regras:
  - Score ≥ threshold configurado → "confirmado"
  - 35% ≤ Score < threshold      → "revisão_manual"
  - Score < 35%                  → "descartado" (não exibido)
```

#### 3.3.5 Módulo: FileCopyManager

```
Entrada:  Lista de arquivos selecionados + pasta de destino
Saída:    Relatório de cópia (sucesso/falha por arquivo)

Responsabilidades:
  - Copiar arquivo preservando metadados EXIF (via shutil.copy2)
  - Resolver conflitos de nome com sufixo numérico
  - Criar subpastas por pessoa (quando configurado)
  - Emitir progresso durante a cópia
```

---

### 3.4 Camada de Infraestrutura

#### Hardware Detector

```python
# Prioridade de detecção: CUDA → ROCm → Metal → CPU
class HardwareDetector:
    @staticmethod
    def get_best_device() -> str:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():  # Apple Silicon
            return "mps"
        # Verificar ROCm via variável de ambiente
        if os.getenv("ROCM_HOME"):
            return "rocm"
        return "cpu"
```

#### SQLite Database

Arquivo: `~/.facephoto/database.db`

Estrutura detalhada em `08_modelo_de_dados.md`.

#### Logger

```
Arquivo de log: ~/.facephoto/logs/facephoto_YYYY-MM-DD.log
Formato: JSON Lines (uma entrada por linha)
Nível padrão: INFO (DEBUG opcional via configuração)
```

---

## 4. Fluxo de Dados Completo

```
[Usuário seleciona referência e pasta]
        ↓
[UI envia POST /api/sessoes com configurações]
        ↓
[Backend cria sessão, dispara Core Engine em background]
        ↓
┌─────────────────────────────────────────┐
│           CORE ENGINE PIPELINE          │
│                                         │
│  [FileScanner] → lista de imagens       │
│        ↓                                │
│  [DuplicateDetector] → lista filtrada   │
│        ↓                                │
│  Para cada imagem:                      │
│    [FaceRecognitionEngine]              │
│      → detectar rostos                  │
│      → extrair embeddings               │
│      → comparar com referências         │
│      → calcular score                   │
│        ↓                                │
│  [ResultRanker] → classificar           │
│        ↓                                │
│  [Persistir no SQLite]                  │
└─────────────────────────────────────────┘
        ↓ (progresso via SSE)
[UI exibe progresso em tempo real]
        ↓
[Processamento concluído]
        ↓
[UI busca GET /api/sessoes/{id}/resultados]
        ↓
[UI exibe grade de fotos para revisão]
        ↓
[Usuário seleciona e confirma cópia]
        ↓
[UI envia POST /api/sessoes/{id}/copiar]
        ↓
[FileCopyManager executa cópia]
        ↓
[Relatório final exibido]
```

---

## 5. Estrutura de Diretórios do Projeto

```
FacePhoto/
├── docs/                        # Documentação do projeto
├── src/
│   ├── backend/                 # FastAPI + Core Engine
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   └── core/
│   │       ├── engine/
│   │       │   ├── base.py      # Interface abstrata FaceEngineBase
│   │       │   ├── deepface_engine.py
│   │       │   └── insightface_engine.py
│   │       ├── file_scanner.py
│   │       ├── duplicate_detector.py
│   │       ├── result_ranker.py
│   │       ├── file_copy_manager.py
│   │       └── hardware_detector.py
│   ├── renderer/                # React UI
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   └── tauri/                   # Tauri configuration (Rust)
│       ├── src/
│       └── tauri.conf.json
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/                # Imagens de teste
├── models/                      # Modelos de IA pré-treinados (empacotados)
├── pyproject.toml
├── package.json
└── README.md
```

---

## 6. Decisões Arquiteturais e Justificativas

### DA-001 · Por que Tauri em vez de Electron?

| Critério | Tauri | Electron |
|---|---|---|
| Tamanho do instalador | ~10-20 MB | ~100-200 MB |
| Consumo de memória | Menor (usa WebView nativo) | Maior (empacota Chromium) |
| Segurança | Melhor isolamento (Rust) | Maior superfície de ataque |
| Multiplataforma | ✅ | ✅ |
| Maturidade | Boa (v2 estável) | Muito alta |

**Decisão:** Tauri é preferido pelo tamanho reduzido do instalador e menor consumo de recursos.

---

### DA-002 · Por que DeepFace no v1.0 e InsightFace no v2.0?

- **DeepFace** simplifica a implementação inicial ao abstrair detecção + embedding + comparação em uma única chamada
- A interface abstrata `FaceEngineBase` garante que a troca para **InsightFace** no v1.1/v2.0 não quebre outros módulos
- InsightFace oferece maior precisão e desempenho industrial, mas exige mais configuração

---

### DA-003 · Por que FastAPI como backend?

- Suporte nativo a operações assíncronas (essencial para processamento em background)
- Server-Sent Events (SSE) nativo para streaming de progresso
- Alta performance e tipagem com Pydantic
- Documentação automática (Swagger UI — útil para testes durante desenvolvimento)

---

### DA-004 · Por que SQLite e não arquivo JSON/CSV?

- Queries eficientes para histórico, filtros e buscas
- Transações ACID garantem integridade dos dados
- Arquivo único portátil (fácil backup pelo usuário)
- Sem necessidade de servidor de banco de dados

---

*Documento elaborado pelo agente `@Arquiteto` com base no questionário de levantamento de requisitos e nas melhores práticas de arquitetura de software (25/07/2026).*
