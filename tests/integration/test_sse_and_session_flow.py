"""
Testes de integração para a Etapa 4 — SSE Streaming, Controle (Pausar/Retomar/Cancelar) e Cópia de Resultados.
"""

from pathlib import Path
import tempfile
import pytest
from fastapi.testclient import TestClient
from src.backend.database.schema import init_db
from src.backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_temp_db(tmp_path: Path, monkeypatch):
    test_db_path = tmp_path / "test_etapa4.db"
    monkeypatch.setattr(
        "src.backend.database.connection.get_db_path", lambda: test_db_path
    )
    init_db(test_db_path)
    return test_db_path


def test_fluxo_completo_sessao_controle_e_copia(tmp_path: Path):
    # 1. Cadastrar Pessoa
    p_res = client.post(
        "/api/pessoas",
        json={
            "nome": "Vó Maria",
            "fotos_referencia": [{"caminho_original": str(tmp_path / "ref_vo.jpg")}],
        },
    )
    assert p_res.status_code == 201
    p_id = p_res.json()["id"]

    # 2. Criar Pasta Origem e Destino
    origem_dir = tmp_path / "acervo"
    destino_dir = tmp_path / "fotos_vo_maria"
    origem_dir.mkdir()
    destino_dir.mkdir()

    # Criar foto simulada no acervo
    (origem_dir / "foto_1.jpg").touch()

    # 3. Criar Sessão
    s_res = client.post(
        "/api/sessoes",
        json={
            "nome_sessao": "Busca Vó Maria Teste",
            "pessoa_ids": [p_id],
            "pasta_origem": str(origem_dir),
            "pasta_destino": str(destino_dir),
            "threshold": 0.60,
        },
    )
    assert s_res.status_code == 201
    sessao_id = s_res.json()["id"]

    # 4. Testar Pausar e Retomar (RF-022)
    pause_res = client.post(f"/api/sessoes/{sessao_id}/pausar")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "pausada"

    resume_res = client.post(f"/api/sessoes/{sessao_id}/retomar")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "em_andamento"

    # 5. Testar Cancelar (RF-021)
    cancel_res = client.post(f"/api/sessoes/{sessao_id}/cancelar")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelada"

    # 6. Testar Excluir Sessão do Histórico
    del_res = client.delete(f"/api/sessoes/{sessao_id}")
    assert del_res.status_code == 204

    # Verificar se foi removida da lista
    list_res = client.get("/api/sessoes")
    assert list_res.status_code == 200
    ids_restantes = [s["id"] for s in list_res.json()]
    assert sessao_id not in ids_restantes


def test_obter_e_atualizar_status_resultados(tmp_path: Path):
    # 1. Cadastrar Pessoa
    p_res = client.post(
        "/api/pessoas",
        json={
            "nome": "Pessoa Teste",
            "fotos_referencia": [{"caminho_original": str(tmp_path / "ref.jpg")}],
        },
    )
    p_id = p_res.json()["id"]

    # 2. Criar Sessão
    s_res = client.post(
        "/api/sessoes",
        json={
            "nome_sessao": "Busca Resultados Teste",
            "pessoa_ids": [p_id],
            "pasta_origem": str(tmp_path),
            "pasta_destino": str(tmp_path / "dest"),
            "threshold": 0.60,
        },
    )
    sessao_id = s_res.json()["id"]

    # 3. Inserir resultado fictício no banco para teste
    from src.backend.database.connection import get_db_connection
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO resultados (id, sessao_id, pessoa_id, caminho_foto, score, status, bounding_box, hash_arquivo, encontrado_em)
            VALUES ('res-1', ?, ?, 'foto.jpg', 0.50, 'revisao_manual', '{"x": 10, "y": 20, "w": 30, "h": 40}', 'hash123', '2026-08-10T12:00:00');
            """,
            (sessao_id, p_id),
        )

    # 4. Obter resultados
    get_res = client.get(f"/api/sessoes/{sessao_id}/resultados")
    assert get_res.status_code == 200
    res_list = get_res.json()
    assert len(res_list) == 1
    assert res_list[0]["id"] == "res-1"
    assert res_list[0]["bounding_box"] == {"x": 10, "y": 20, "w": 30, "h": 40}

    # 5. Atualizar status para 'confirmado_manual'
    put_res = client.put(
        f"/api/sessoes/{sessao_id}/resultados/res-1/status",
        json={"status": "confirmado_manual"},
    )
    assert put_res.status_code == 200
    assert put_res.json()["status"] == "confirmado_manual"

    # Verificar no GET se status foi atualizado
    get_res2 = client.get(f"/api/sessoes/{sessao_id}/resultados")
    assert get_res2.json()[0]["status"] == "confirmado_manual"


