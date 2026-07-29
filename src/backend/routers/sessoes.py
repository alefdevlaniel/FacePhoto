"""
Endpoints da API para criação, execução com SSE streaming, controle (pausar/retomar/cancelar)
e cópia de fotos nas Sessões de Busca com persistência de estado para retomada.
"""

import asyncio
from datetime import datetime
import json
from pathlib import Path
import uuid
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.backend.core.duplicate_detector import calculate_perceptual_hash, filter_unique_images
from src.backend.core.face_engine import create_face_engine
from src.backend.core.file_copy_manager import copy_multiple_files
from src.backend.core.file_scanner import count_supported_images, scan_directory_batches
from src.backend.core.hardware_detector import detect_hardware
from src.backend.core.result_ranker import MatchStatus, classify_match
from src.backend.database.connection import get_db_connection
from src.backend.models.sessao import SessaoCreate, SessaoResponse

router = APIRouter(prefix="/api/sessoes", tags=["Sessões"])

# Dicionário em memória para controle de estado das sessões em execução
SESSION_STATES: dict[str, str] = {}  # "em_andamento", "pausada", "interrompida", "cancelada", "concluida"


class CopyRequest(BaseModel):
    resultado_ids: list[str] = Field(..., description="Lista de IDs de resultados a serem copiados")
    subpasta_por_pessoa: bool = Field(default=False, description="Se True, cria subpastas por pessoa")


@router.post("", response_model=SessaoResponse, status_code=status.HTTP_201_CREATED)
async def criar_sessao(dados: SessaoCreate):
    """Cria e registra uma nova sessão de busca no banco de dados."""
    if dados.pasta_origem == dados.pasta_destino:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pasta de destino não pode ser igual à pasta de origem",
        )

    sessao_id = str(uuid.uuid4())
    iniciado_em_iso = datetime.now().isoformat()
    hw = detect_hardware()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessoes_busca (
                id, nome_sessao, pasta_origem, pasta_destino, threshold, status,
                dispositivo_proc, iniciado_em
            ) VALUES (?, ?, ?, ?, ?, 'em_andamento', ?, ?);
            """,
            (
                sessao_id,
                dados.nome_sessao,
                dados.pasta_origem,
                dados.pasta_destino,
                dados.threshold,
                hw.name,
                iniciado_em_iso,
            ),
        )
        for p_id in dados.pessoa_ids:
            cursor.execute(
                "INSERT INTO sessoes_pessoas (sessao_id, pessoa_id) VALUES (?, ?);",
                (sessao_id, p_id),
            )

    SESSION_STATES[sessao_id] = "em_andamento"

    return SessaoResponse(
        id=sessao_id,
        nome_sessao=dados.nome_sessao,
        pasta_origem=dados.pasta_origem,
        pasta_destino=dados.pasta_destino,
        threshold=dados.threshold,
        status="em_andamento",
        total_fotos=0,
        total_duplicatas=0,
        total_encontradas=0,
        total_copiadas=0,
        dispositivo_proc=hw.name,
        iniciado_em=datetime.fromisoformat(iniciado_em_iso),
        concluido_em=None,
    )


@router.post("/{sessao_id}/pausar")
async def pausar_sessao(sessao_id: str):
    """Pausa o processamento de uma sessão em andamento (RF-022)."""
    SESSION_STATES[sessao_id] = "pausada"
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE sessoes_busca SET status = 'pausada' WHERE id = ?;", (sessao_id,)
        )
    return {"status": "pausada", "sessao_id": sessao_id}


@router.post("/{sessao_id}/retomar")
async def retomar_sessao(sessao_id: str):
    """Retoma o processamento de uma sessão interrompida ou pausada de onde parou."""
    SESSION_STATES[sessao_id] = "em_andamento"
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE sessoes_busca SET status = 'em_andamento' WHERE id = ?;", (sessao_id,)
        )
    return {"status": "em_andamento", "sessao_id": sessao_id}


@router.post("/{sessao_id}/cancelar")
async def cancelar_sessao(sessao_id: str):
    """Cancela uma sessão em andamento (RF-021)."""
    SESSION_STATES[sessao_id] = "cancelada"
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE sessoes_busca SET status = 'cancelada', concluido_em = ? WHERE id = ?;",
            (datetime.now().isoformat(), sessao_id),
        )
    return {"status": "cancelada", "sessao_id": sessao_id}


@router.get("/{sessao_id}/stream")
async def stream_processamento(sessao_id: str):
    """
    Endpoint de streaming SSE para acompanhamento e retomada em tempo real foto por foto.
    Recupera os resultados parciais gravados no SQLite se a sessão tiver sido interrompida.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        sessao_row = cursor.execute(
            "SELECT * FROM sessoes_busca WHERE id = ?;", (sessao_id,)
        ).fetchone()

        if not sessao_row:
            raise HTTPException(status_code=404, detail="Sessão não encontrada")

        pessoas_rows = cursor.execute(
            "SELECT pessoa_id FROM sessoes_pessoas WHERE sessao_id = ?;", (sessao_id,)
        ).fetchall()
        pessoa_ids = [r["pessoa_id"] for r in pessoas_rows]

        # Obter resultados já gravados para retomar sem duplicar
        ja_processados = cursor.execute(
            "SELECT caminho_foto FROM resultados WHERE sessao_id = ?;", (sessao_id,)
        ).fetchall()
        caminhos_ja_salvos = {r["caminho_foto"] for r in ja_processados}

    origem = Path(sessao_row["pasta_origem"])
    threshold = float(sessao_row["threshold"])

    SESSION_STATES[sessao_id] = "em_andamento"
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE sessoes_busca SET status = 'em_andamento' WHERE id = ?;", (sessao_id,)
        )

    async def event_generator():
        # Usar motor de IA real ou fallback real
        engine = create_face_engine()

        # 1. Total de fotos reais no acervo
        try:
            total_fotos = count_supported_images(origem) if origem.exists() else 0
        except Exception:
            total_fotos = 0

        with get_db_connection() as conn:
            conn.execute(
                "UPDATE sessoes_busca SET total_fotos = ? WHERE id = ?;",
                (total_fotos, sessao_id),
            )

        # Buscar estatísticas parciais existentes
        with get_db_connection() as conn:
            cursor = conn.cursor()
            found_count = cursor.execute(
                "SELECT COUNT(*) as c FROM resultados WHERE sessao_id = ? AND status = 'confirmado';",
                (sessao_id,),
            ).fetchone()["c"]
            review_count = cursor.execute(
                "SELECT COUNT(*) as c FROM resultados WHERE sessao_id = ? AND status = 'revisao_manual';",
                (sessao_id,),
            ).fetchone()["c"]

        processed_count = found_count + review_count
        duplicate_count = sessao_row["total_duplicatas"] or 0

        files_to_process = (
            list(scan_directory_batches(origem, batch_size=20))
            if origem.exists()
            else []
        )

        for batch in files_to_process:
            state = SESSION_STATES.get(sessao_id, "em_andamento")
            if state == "interrompida" or state == "pausada":
                yield f"data: {json.dumps({'event': 'paused', 'sessao_id': sessao_id, 'log': '⏸ Processamento interrompido. Você pode retomar a qualquer momento.'})}\n\n"
                return

            # Deduplicação
            unique_files, dups = filter_unique_images(batch)
            duplicate_count += len(dups)

            for file_path in unique_files:
                if str(file_path) in caminhos_ja_salvos:
                    continue  # Já analisado antes da interrupção

                state = SESSION_STATES.get(sessao_id, "em_andamento")
                if state == "interrompida" or state == "pausada":
                    yield f"data: {json.dumps({'event': 'paused', 'sessao_id': sessao_id, 'log': '⏸ Processamento interrompido.'})}\n\n"
                    return

                processed_count += 1
                detections = engine.detect_and_extract(file_path)

                for det in detections:
                    score = engine.calculate_similarity(det.embedding, det.embedding)
                    status_match = classify_match(score, threshold)

                    if status_match != MatchStatus.DESCARTADO:
                        res_id = str(uuid.uuid4())
                        target_p_id = pessoa_ids[0] if pessoa_ids else "desconhecido"
                        now_iso = datetime.now().isoformat()
                        phash = calculate_perceptual_hash(file_path)

                        if status_match == MatchStatus.CONFIRMADO:
                            found_count += 1
                        else:
                            review_count += 1

                        caminhos_ja_salvos.add(str(file_path))
                        with get_db_connection() as conn:
                            conn.execute(
                                """
                                INSERT INTO resultados (
                                    id, sessao_id, pessoa_id, caminho_foto, score, status,
                                    bounding_box, hash_arquivo, encontrado_em
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                                """,
                                (
                                    res_id,
                                    sessao_id,
                                    target_p_id,
                                    str(file_path),
                                    score,
                                    status_match.value,
                                    json.dumps(det.bounding_box.to_dict()),
                                    phash,
                                    now_iso,
                                ),
                            )

                pct = min(100, int((processed_count / total_fotos) * 100))
                payload = {
                    "event": "progress",
                    "sessao_id": sessao_id,
                    "progress_pct": pct,
                    "processed_count": processed_count,
                    "total_fotos": total_fotos,
                    "found_count": found_count,
                    "review_count": review_count,
                    "duplicate_count": duplicate_count,
                    "current_file": file_path.name,
                    "log": f"Analisando {file_path.name} — {found_count} encontradas",
                }
                yield f"data: {json.dumps(payload)}\n\n"
                await asyncio.sleep(0.05)

        # Conclusão
        now_iso = datetime.now().isoformat()
        SESSION_STATES[sessao_id] = "concluida"
        with get_db_connection() as conn:
            conn.execute(
                """
                UPDATE sessoes_busca SET
                    status = 'concluida',
                    total_duplicatas = ?,
                    total_encontradas = ?,
                    concluido_em = ?
                WHERE id = ?;
                """,
                (duplicate_count, found_count, now_iso, sessao_id),
            )

        final_payload = {
            "event": "completed",
            "sessao_id": sessao_id,
            "progress_pct": 100,
            "processed_count": total_fotos,
            "total_fotos": total_fotos,
            "found_count": found_count,
            "review_count": review_count,
            "duplicate_count": duplicate_count,
            "log": "✓ Análise concluída com sucesso!",
        }
        yield f"data: {json.dumps(final_payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{sessao_id}/resultados")
async def obter_resultados(sessao_id: str):
    """Retorna a lista de resultados (parciais ou totais) da sessão para revisão e seleção."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        rows = cursor.execute(
            """
            SELECT id, sessao_id, pessoa_id, caminho_foto, score, status,
                   bounding_box, hash_arquivo, caminho_destino, encontrado_em
            FROM resultados
            WHERE sessao_id = ?
            ORDER BY score DESC;
            """,
            (sessao_id,),
        ).fetchall()

    res = []
    for r in rows:
        res.append(
            {
                "id": r["id"],
                "sessao_id": r["sessao_id"],
                "pessoa_id": r["pessoa_id"],
                "caminho_foto": r["caminho_foto"],
                "score": r["score"],
                "status": r["status"],
                "bounding_box": json.loads(r["bounding_box"]) if r["bounding_box"] else None,
                "hash_arquivo": r["hash_arquivo"],
                "caminho_destino": r["caminho_destino"],
                "encontrado_em": r["encontrado_em"],
            }
        )
    return res


@router.post("/{sessao_id}/copiar")
async def executar_copia(sessao_id: str, req: CopyRequest):
    """Executa a cópia de fotos selecionadas preservando metadados EXIF."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        sessao = cursor.execute(
            "SELECT pasta_destino FROM sessoes_busca WHERE id = ?;", (sessao_id,)
        ).fetchone()

        if not sessao:
            raise HTTPException(status_code=404, detail="Sessão não encontrada")

        dest_dir = Path(sessao["pasta_destino"])
        rows = cursor.execute(
            """
            SELECT r.id, r.caminho_foto, p.nome as nome_pessoa
            FROM resultados r
            LEFT JOIN pessoas p ON p.id = r.pessoa_id
            WHERE r.id IN ({});
            """.format(",".join(["?"] * len(req.resultado_ids))),
            req.resultado_ids,
        ).fetchall()

    items_to_copy = []
    for r in rows:
        subfolder = r["nome_pessoa"] if req.subpasta_por_pessoa else None
        items_to_copy.append((Path(r["caminho_foto"]), subfolder))

    copy_results = copy_multiple_files(items_to_copy, dest_dir)
    copiadas_sucesso = sum(1 for res in copy_results if res.sucesso)

    with get_db_connection() as conn:
        conn.execute(
            "UPDATE sessoes_busca SET total_copiadas = ? WHERE id = ?;",
            (copiadas_sucesso, sessao_id),
        )

    return {
        "sessao_id": sessao_id,
        "total_solicitadas": len(req.resultado_ids),
        "total_copiadas": copiadas_sucesso,
        "pasta_destino": str(dest_dir),
    }


@router.get("", response_model=list[SessaoResponse])
async def listar_sessoes():
    """Retorna o histórico de todas as sessões de busca, atualizando sessões paradas para 'interrompida'."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Se o servidor tiver reiniciado, marca sessões 'em_andamento' que não estejam ativas como 'interrompida'
        rows_em_andamento = cursor.execute(
            "SELECT id FROM sessoes_busca WHERE status = 'em_andamento';"
        ).fetchall()

        for r in rows_em_andamento:
            s_id = r["id"]
            if SESSION_STATES.get(s_id) != "em_andamento":
                conn.execute(
                    "UPDATE sessoes_busca SET status = 'interrompida' WHERE id = ?;", (s_id,)
                )

        rows = cursor.execute(
            """
            SELECT id, nome_sessao, pasta_origem, pasta_destino, threshold,
                   status, total_fotos, total_duplicatas, total_encontradas,
                   total_copiadas, dispositivo_proc, iniciado_em, concluido_em
            FROM sessoes_busca
            ORDER BY iniciado_em DESC;
            """
        ).fetchall()

    res = []
    for r in rows:
        concluido = datetime.fromisoformat(r["concluido_em"]) if r["concluido_em"] else None
        res.append(
            SessaoResponse(
                id=r["id"],
                nome_sessao=r["nome_sessao"],
                pasta_origem=r["pasta_origem"],
                pasta_destino=r["pasta_destino"],
                threshold=r["threshold"],
                status=r["status"],
                total_fotos=r["total_fotos"],
                total_duplicatas=r["total_duplicatas"],
                total_encontradas=r["total_encontradas"],
                total_copiadas=r["total_copiadas"],
                dispositivo_proc=r["dispositivo_proc"],
                iniciado_em=datetime.fromisoformat(r["iniciado_em"]),
                concluido_em=concluido,
            )
        )
    return res


@router.delete("/{sessao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_sessao(sessao_id: str):
    """Exclui uma sessão de busca e seus resultados associados do histórico no SQLite."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        sessao = cursor.execute(
            "SELECT id FROM sessoes_busca WHERE id = ?;", (sessao_id,)
        ).fetchone()

        if not sessao:
            raise HTTPException(status_code=404, detail="Sessão não encontrada")

        cursor.execute("DELETE FROM resultados WHERE sessao_id = ?;", (sessao_id,))
        cursor.execute("DELETE FROM sessoes_pessoas WHERE sessao_id = ?;", (sessao_id,))
        cursor.execute("DELETE FROM sessoes_busca WHERE id = ?;", (sessao_id,))

    SESSION_STATES.pop(sessao_id, None)

