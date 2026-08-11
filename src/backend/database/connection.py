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


import time
import logging

logger = logging.getLogger(__name__)


@contextmanager
def get_db_connection(db_path: Path | None = None, max_retries: int = 5, retry_delay: float = 0.2):
    """
    Context manager para obter conexão com o SQLite em modo WAL.
    Garante commit, fechamento automático da conexão e retentativas em caso de bloqueio temporário.
    """
    target_path = db_path or get_db_path()
    
    conn = sqlite3.connect(str(target_path), timeout=30.0)
    conn.row_factory = sqlite3.Row
    
    # Habilitar pragma WAL, busy_timeout e foreign_keys no SQLite
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    
    try:
        yield conn
        
        # Tentar efetuar commit com retentativas se o banco estiver temporariamente ocupado
        for attempt in range(max_retries):
            try:
                conn.commit()
                break
            except sqlite3.OperationalError as err:
                if "locked" in str(err).lower() or "busy" in str(err).lower():
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay * (2 ** attempt))
                        continue
                raise
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        conn.close()
