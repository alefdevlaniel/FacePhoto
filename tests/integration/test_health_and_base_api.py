"""
Testes de integração para a Etapa 1 — Health check, Banco de Dados SQLite e API Base.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from src.backend.database.connection import get_db_connection
from src.backend.database.schema import init_db
from src.backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_temp_db(tmp_path: Path, monkeypatch):
    """Configura um banco de dados SQLite temporário em memória/temp para os testes."""
    test_db_path = tmp_path / "test_facephoto.db"
    monkeypatch.setattr(
        "src.backend.database.connection.get_db_path", lambda: test_db_path
    )
    init_db(test_db_path)
    return test_db_path


def test_health_check_endpoint():
    """Valida se o endpoint /health responde com HTTP 200 e payload correto."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "FacePhoto API"


def test_system_status_endpoint():
    """Valida se o endpoint /api/status informa status offline."""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["offline"] is True


def test_cadastrar_e_listar_pessoa():
    """Valida o fluxo completo de cadastro e listagem de pessoas na API."""
    payload = {
        "nome": "Vó Maria",
        "fotos_referencia": [
            {"caminho_original": "C:/Fotos/vo_maria_1.jpg"},
            {"caminho_original": "C:/Fotos/vo_maria_2.jpg"},
        ],
    }
    # Cadastro
    post_res = client.post("/api/pessoas", json=payload)
    assert post_res.status_code == 201
    pessoa = post_res.json()
    assert pessoa["nome"] == "Vó Maria"
    assert pessoa["total_fotos_ref"] == 2
    assert "id" in pessoa

    # Listagem
    get_res = client.get("/api/pessoas")
    assert get_res.status_code == 200
    lista = get_res.json()
    assert len(lista) == 1
    assert lista[0]["id"] == pessoa["id"]


def test_criar_sessao_busca():
    """Valida a criação de uma sessão de busca na API."""
    # 1. Criar pessoa primeiro
    p_res = client.post(
        "/api/pessoas",
        json={
            "nome": "Tio João",
            "fotos_referencia": [{"caminho_original": "D:/ref_joao.jpg"}],
        },
    )
    p_id = p_res.json()["id"]

    # 2. Criar sessão
    sessao_payload = {
        "nome_sessao": "Busca Tio João - Jul/26",
        "pessoa_ids": [p_id],
        "pasta_origem": "D:/HD_Externo/Fotos",
        "pasta_destino": "C:/Users/Teste/Desktop/Fotos João",
        "threshold": 0.65,
    }
    s_res = client.post("/api/sessoes", json=sessao_payload)
    assert s_res.status_code == 201
    sessao = s_res.json()
    assert sessao["nome_sessao"] == "Busca Tio João - Jul/26"
    assert sessao["status"] == "em_andamento"
    assert sessao["threshold"] == 0.65
