"""
Módulo de conexão e gerenciamento do banco de dados SQLite local.
Utiliza platformdirs para garantir o caminho correto de dados em cada SO.
"""

from contextlib import contextmanager
from pathlib import Path
import sqlite3
from platformdirs import user_data_dir

APP_NAME = "FacePhoto"
APP_AUTHOR = "FacePhotoTeam"


def get_db_dir() -> Path:
    """Retorna o diretório de dados do usuário para o FacePhoto."""
    data_dir = Path(user_data_dir(appname=APP_NAME, appauthor=APP_AUTHOR))
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_db_path() -> Path:
    """Retorna o caminho completo para o arquivo database.db."""
    return get_db_dir() / "database.db"


@contextmanager
def get_db_connection(db_path: Path | None = None):
    """
    Context manager para obter conexão com o SQLite.
    Garante commit e fechamento automático da conexão.
    """
    target_path = db_path or get_db_path()
    conn = sqlite3.connect(str(target_path))
    conn.row_factory = sqlite3.Row
    # Habilitar chaves estrangeiras no SQLite
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
