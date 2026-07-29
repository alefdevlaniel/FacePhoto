"""
Runner de testes nativo com unittest para a Etapa 1.
"""

from pathlib import Path
import tempfile
import unittest
from fastapi.testclient import TestClient
from src.backend.database.connection import get_db_connection
from src.backend.database.schema import init_db
from src.backend.main import app

client = TestClient(app)


class TestEtapa1(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_db_path = Path(self.temp_dir.name) / "test_db.db"
        # Patch db path
        import src.backend.database.connection as conn_mod

        conn_mod.get_db_path = lambda: self.test_db_path
        init_db(self.test_db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_health_check(self):
        res = client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

    def test_system_status(self):
        res = client.get("/api/status")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["offline"])

    def test_cadastrar_e_listar_pessoa(self):
        payload = {
            "nome": "Vó Maria",
            "fotos_referencia": [
                {"caminho_original": "C:/Fotos/vo_maria_1.jpg"},
                {"caminho_original": "C:/Fotos/vo_maria_2.jpg"},
            ],
        }
        post_res = client.post("/api/pessoas", json=payload)
        self.assertEqual(post_res.status_code, 201)
        pessoa = post_res.json()
        self.assertEqual(pessoa["nome"], "Vó Maria")
        self.assertEqual(pessoa["total_fotos_ref"], 2)

        get_res = client.get("/api/pessoas")
        self.assertEqual(get_res.status_code, 200)
        lista = get_res.json()
        self.assertEqual(len(lista), 1)
        self.assertEqual(lista[0]["id"], pessoa["id"])

    def test_criar_sessao_busca(self):
        p_res = client.post(
            "/api/pessoas",
            json={
                "nome": "Tio João",
                "fotos_referencia": [{"caminho_original": "D:/ref_joao.jpg"}],
            },
        )
        p_id = p_res.json()["id"]

        sessao_payload = {
            "nome_sessao": "Busca Tio João - Jul/26",
            "pessoa_ids": [p_id],
            "pasta_origem": "D:/HD_Externo/Fotos",
            "pasta_destino": "C:/Users/Teste/Desktop/Fotos João",
            "threshold": 0.65,
        }
        s_res = client.post("/api/sessoes", json=sessao_payload)
        self.assertEqual(s_res.status_code, 201)
        sessao = s_res.json()
        self.assertEqual(sessao["nome_sessao"], "Busca Tio João - Jul/26")
        self.assertEqual(sessao["status"], "em_andamento")
        self.assertEqual(sessao["threshold"], 0.65)


if __name__ == "__main__":
    unittest.main()
