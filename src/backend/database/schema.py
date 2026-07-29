"""
Script de inicialização do schema de banco de dados SQLite do FacePhoto.
"""

from pathlib import Path
from src.backend.database.connection import get_db_connection

CREATE_TABLES_SQL = """
-- Tabela de Pessoas cadastradas
CREATE TABLE IF NOT EXISTS pessoas (
    id              TEXT    PRIMARY KEY,
    nome            TEXT    NOT NULL,
    thumbnail_path   TEXT,
    criado_em       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pessoas_nome ON pessoas(nome);

-- Tabela de Fotos de Referência
CREATE TABLE IF NOT EXISTS fotos_referencia (
    id               TEXT    PRIMARY KEY,
    pessoa_id        TEXT    NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
    caminho_original TEXT    NOT NULL,
    embedding        BLOB,
    embedding_modelo TEXT,
    criado_em        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fotos_ref_pessoa ON fotos_referencia(pessoa_id);

-- Tabela de Sessões de Busca
CREATE TABLE IF NOT EXISTS sessoes_busca (
    id                      TEXT    PRIMARY KEY,
    nome_sessao             TEXT,
    pasta_origem            TEXT    NOT NULL,
    pasta_destino           TEXT    NOT NULL,
    threshold               REAL    NOT NULL DEFAULT 0.6,
    status                  TEXT    NOT NULL DEFAULT 'em_andamento',
    total_fotos             INTEGER DEFAULT 0,
    total_duplicatas        INTEGER DEFAULT 0,
    total_encontradas       INTEGER DEFAULT 0,
    total_copiadas          INTEGER DEFAULT 0,
    dispositivo_proc        TEXT,
    iniciado_em             TEXT    NOT NULL,
    concluido_em            TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessoes_status ON sessoes_busca(status);
CREATE INDEX IF NOT EXISTS idx_sessoes_iniciado ON sessoes_busca(iniciado_em DESC);

-- Relacionamento N:N entre Sessões e Pessoas
CREATE TABLE IF NOT EXISTS sessoes_pessoas (
    sessao_id TEXT NOT NULL REFERENCES sessoes_busca(id) ON DELETE CASCADE,
    pessoa_id TEXT NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
    PRIMARY KEY (sessao_id, pessoa_id)
);

-- Tabela de Resultados
CREATE TABLE IF NOT EXISTS resultados (
    id               TEXT    PRIMARY KEY,
    sessao_id        TEXT    NOT NULL REFERENCES sessoes_busca(id) ON DELETE CASCADE,
    pessoa_id        TEXT    NOT NULL REFERENCES pessoas(id),
    caminho_foto     TEXT    NOT NULL,
    score            REAL    NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'confirmado',
    bounding_box     TEXT,
    hash_arquivo     TEXT    NOT NULL,
    caminho_destino  TEXT,
    encontrado_em    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resultados_sessao ON resultados(sessao_id);
CREATE INDEX IF NOT EXISTS idx_resultados_pessoa ON resultados(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_resultados_score  ON resultados(score DESC);
CREATE INDEX IF NOT EXISTS idx_resultados_status ON resultados(status);
"""


def init_db(db_path: Path | None = None) -> None:
    """Inicializa as tabelas do banco de dados SQLite se ainda não existirem."""
    with get_db_connection(db_path) as conn:
        conn.executescript(CREATE_TABLES_SQL)
