"""
Testes de integração para resiliência e concorrência do SQLite no FacePhoto.
"""

from pathlib import Path
import pytest
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from src.backend.database.connection import get_db_connection
from src.backend.database.schema import init_db


@pytest.fixture(autouse=True)
def setup_temp_db(tmp_path: Path, monkeypatch):
    test_db_path = tmp_path / "test_resilience.db"
    monkeypatch.setattr(
        "src.backend.database.connection.get_db_path", lambda: test_db_path
    )
    init_db(test_db_path)
    return test_db_path


def test_wal_mode_and_concurrency(setup_temp_db: Path):
    """Verifica se o SQLite é inicializado em modo WAL e suporta conexões simultâneas."""
    with get_db_connection() as conn:
        mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
        assert mode.lower() == "wal"

    def worker_write(worker_id: int):
        with get_db_connection() as conn:
            conn.execute(
                "INSERT INTO pessoas (id, nome, criado_em) VALUES (?, ?, '2026-08-11T12:00:00');",
                (f"p-{worker_id}", f"Pessoa Worker {worker_id}"),
            )
        return True

    # Executa gravações concorrentes em múltiplas threads
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(worker_write, i) for i in range(10)]
        results = [f.result() for f in futures]

    assert all(results)

    with get_db_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM pessoas;").fetchone()[0]
        assert count == 10
