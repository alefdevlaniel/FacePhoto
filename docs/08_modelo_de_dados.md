# 08 — Modelo de Dados

**Projeto:** FacePhoto
**Versão:** 1.0
**Data:** 25/07/2026
**Responsável:** @Arquiteto

---

## 1. Visão Geral

O FacePhoto utiliza um banco de dados **SQLite 3** local, armazenado no diretório de dados do usuário:

| Plataforma | Localização |
|---|---|
| Windows | `C:\Users\<usuario>\AppData\Local\FacePhoto\database.db` |
| macOS | `~/Library/Application Support/FacePhoto/database.db` |
| Linux | `~/.config/FacePhoto/database.db` |

O banco é gerenciado diretamente via `sqlite3` (nativo Python), sem uso de ORM.

---

## 2. Diagrama Entidade-Relacionamento

```
┌──────────────────┐         ┌──────────────────────────┐
│    pessoas       │  1    N │   fotos_referencia       │
│──────────────────│─────────│──────────────────────────│
│ id (PK)          │         │ id (PK)                  │
│ nome             │         │ pessoa_id (FK→pessoas)   │
│ criado_em        │         │ caminho_original          │
│ thumbnail_path   │         │ embedding (BLOB)          │
└──────────────────┘         │ criado_em                │
         │                   └──────────────────────────┘
         │
         │  N
         │
┌────────▼──────────────────────────────────────────────┐
│                  sessoes_busca                        │
│──────────────────────────────────────────────────────│
│ id (PK)                                              │
│ nome_sessao                                          │
│ pasta_origem                                         │
│ pasta_destino                                        │
│ threshold                                            │
│ status  ('em_andamento'|'concluida'|'cancelada')     │
│ total_fotos                                          │
│ total_duplicatas                                     │
│ total_encontradas                                    │
│ total_copiadas                                       │
│ dispositivo_processamento                            │
│ iniciado_em                                          │
│ concluido_em                                         │
└──────────────────────────────────────────────────────┘
         │
         │  1:N
         │
┌────────▼──────────────────────────────────────────────┐
│                   resultados                          │
│──────────────────────────────────────────────────────│
│ id (PK)                                              │
│ sessao_id (FK→sessoes_busca)                         │
│ pessoa_id (FK→pessoas)                               │
│ caminho_foto                                         │
│ score  (REAL 0.0 a 1.0)                              │
│ status ('confirmado'|'revisao'|'descartado'|'copiado'│
│         |'rejeitado_manual')                         │
│ bounding_box  (TEXT - JSON)                          │
│ hash_arquivo  (TEXT)                                 │
│ caminho_destino (TEXT, nullable)                     │
│ encontrado_em                                        │
└──────────────────────────────────────────────────────┘
         │
         │  1:N
         │
┌────────▼──────────────────────────────────────────────┐
│            sessoes_pessoas  (N:N)                     │
│──────────────────────────────────────────────────────│
│ sessao_id (FK→sessoes_busca)                         │
│ pessoa_id (FK→pessoas)                               │
└──────────────────────────────────────────────────────┘
```

---

## 3. Definição Completa das Tabelas

### 3.1 Tabela: `pessoas`

Armazena o cadastro de pessoas cujos rostos serão buscados.

```sql
CREATE TABLE IF NOT EXISTS pessoas (
    id            TEXT    PRIMARY KEY,    -- UUID v4
    nome          TEXT    NOT NULL,        -- Nome da pessoa (ex: "Vó Maria")
    thumbnail_path TEXT,                  -- Caminho para miniatura de exibição na UI
    criado_em     TEXT    NOT NULL        -- ISO 8601 (ex: "2026-07-25T14:30:00")
);

CREATE INDEX IF NOT EXISTS idx_pessoas_nome ON pessoas(nome);
```

---

### 3.2 Tabela: `fotos_referencia`

Armazena as fotos de referência e seus embeddings calculados.

```sql
CREATE TABLE IF NOT EXISTS fotos_referencia (
    id               TEXT    PRIMARY KEY,
    pessoa_id        TEXT    NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
    caminho_original TEXT    NOT NULL,    -- Caminho absoluto da foto de referência
    embedding        BLOB,               -- Vetor serializado em bytes (numpy → tobytes())
    embedding_modelo TEXT,               -- Nome do modelo usado (ex: "ArcFace")
    criado_em        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fotos_ref_pessoa ON fotos_referencia(pessoa_id);
```

**Nota técnica sobre embedding:**
```python
import numpy as np

# Serializar embedding para armazenar no SQLite
embedding_bytes: bytes = np.array(embedding_list, dtype=np.float32).tobytes()

# Deserializar ao recuperar do banco
embedding_array: np.ndarray = np.frombuffer(embedding_bytes, dtype=np.float32)
```

---

### 3.3 Tabela: `sessoes_busca`

Representa uma sessão completa de busca — da configuração ao relatório final.

```sql
CREATE TABLE IF NOT EXISTS sessoes_busca (
    id                      TEXT    PRIMARY KEY,
    nome_sessao             TEXT,                    -- Nome opcional (ex: "Busca Vó - Jul/26")
    pasta_origem            TEXT    NOT NULL,
    pasta_destino           TEXT    NOT NULL,
    threshold               REAL    NOT NULL DEFAULT 0.6,  -- 0.0 a 1.0
    status                  TEXT    NOT NULL DEFAULT 'em_andamento',
                            -- Valores: 'em_andamento' | 'concluida' | 'cancelada' | 'erro'
    total_fotos             INTEGER DEFAULT 0,
    total_duplicatas        INTEGER DEFAULT 0,
    total_encontradas       INTEGER DEFAULT 0,
    total_copiadas          INTEGER DEFAULT 0,
    dispositivo_proc        TEXT,                    -- "GPU: NVIDIA RTX 3060" ou "CPU"
    iniciado_em             TEXT    NOT NULL,
    concluido_em            TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessoes_status ON sessoes_busca(status);
CREATE INDEX IF NOT EXISTS idx_sessoes_iniciado ON sessoes_busca(iniciado_em DESC);
```

---

### 3.4 Tabela: `sessoes_pessoas` (N:N)

Relaciona sessões às pessoas buscadas (uma sessão pode buscar múltiplas pessoas).

```sql
CREATE TABLE IF NOT EXISTS sessoes_pessoas (
    sessao_id TEXT NOT NULL REFERENCES sessoes_busca(id) ON DELETE CASCADE,
    pessoa_id TEXT NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
    PRIMARY KEY (sessao_id, pessoa_id)
);
```

---

### 3.5 Tabela: `resultados`

Armazena cada foto encontrada em uma sessão com seu score e status de revisão.

```sql
CREATE TABLE IF NOT EXISTS resultados (
    id               TEXT    PRIMARY KEY,
    sessao_id        TEXT    NOT NULL REFERENCES sessoes_busca(id) ON DELETE CASCADE,
    pessoa_id        TEXT    NOT NULL REFERENCES pessoas(id),
    caminho_foto     TEXT    NOT NULL,   -- Caminho absoluto da foto no acervo de origem
    score            REAL    NOT NULL,   -- 0.0 a 1.0 (similaridade com referência)
    status           TEXT    NOT NULL DEFAULT 'confirmado',
                     -- 'confirmado' | 'revisao' | 'descartado'
                     -- | 'copiado' | 'rejeitado_manual' | 'confirmado_manual'
    bounding_box     TEXT,              -- JSON: {"x": 120, "y": 45, "w": 80, "h": 95}
    hash_arquivo     TEXT    NOT NULL,  -- pHash para deduplicação
    caminho_destino  TEXT,             -- Preenchido após cópia bem-sucedida
    encontrado_em    TEXT    NOT NULL  -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_resultados_sessao   ON resultados(sessao_id);
CREATE INDEX IF NOT EXISTS idx_resultados_pessoa   ON resultados(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_resultados_score    ON resultados(score DESC);
CREATE INDEX IF NOT EXISTS idx_resultados_status   ON resultados(status);
CREATE INDEX IF NOT EXISTS idx_resultados_hash     ON resultados(hash_arquivo);
```

---

### 3.6 Tabela: `cache_embeddings_acervo`

Cache de embeddings calculados para fotos já processadas, evitando reprocessamento.

```sql
CREATE TABLE IF NOT EXISTS cache_embeddings_acervo (
    hash_arquivo     TEXT    PRIMARY KEY,  -- pHash da imagem (chave de cache)
    caminho_foto     TEXT    NOT NULL,
    rostos_json      TEXT,               -- JSON com bounding boxes dos rostos detectados
    embeddings_blob  BLOB,               -- Embeddings de todos os rostos (serializado)
    modelo           TEXT    NOT NULL,   -- Nome do modelo (ex: "ArcFace")
    calculado_em     TEXT    NOT NULL
);
```

> **Nota:** O cache é **invalidado** quando o arquivo de origem é modificado (verificado por comparação de hash).

---

## 4. Queries Principais

### Buscar resultados confirmados de uma sessão, ordenados por score

```sql
SELECT
    r.id,
    r.caminho_foto,
    r.score,
    r.status,
    r.bounding_box,
    p.nome AS pessoa_nome
FROM resultados r
JOIN pessoas p ON p.id = r.pessoa_id
WHERE r.sessao_id = ?
  AND r.status IN ('confirmado', 'confirmado_manual', 'copiado')
ORDER BY r.score DESC;
```

### Buscar sessões recentes (histórico)

```sql
SELECT
    s.id,
    s.iniciado_em,
    s.status,
    s.total_encontradas,
    s.total_copiadas,
    GROUP_CONCAT(p.nome, ', ') AS pessoas_buscadas
FROM sessoes_busca s
JOIN sessoes_pessoas sp ON sp.sessao_id = s.id
JOIN pessoas p ON p.id = sp.pessoa_id
GROUP BY s.id
ORDER BY s.iniciado_em DESC
LIMIT 20;
```

### Verificar cache antes de processar imagem

```sql
SELECT rostos_json, embeddings_blob
FROM cache_embeddings_acervo
WHERE hash_arquivo = ?
  AND modelo = ?;
```

---

## 5. Estratégia de Migração

Para evolução do schema entre versões do aplicativo, será adotada migração via scripts SQL versionados:

```
src/backend/database/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_cache_table.sql    ← v1.1
│   └── 003_add_tags.sql           ← v1.2 (futuro)
└── migrator.py                   ← Aplica migrations pendentes na inicialização
```

**Regra:** Migrations são sempre **aditivas** (adicionar colunas/tabelas). Nunca remover colunas sem período de deprecação.

---

*Documento elaborado pelo agente `@Arquiteto` (25/07/2026).*
