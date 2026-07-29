"""
Endpoints da API para gestão de Pessoas e fotos de referência.
"""

from datetime import datetime
import uuid
from fastapi import APIRouter, HTTPException, status
from src.backend.database.connection import get_db_connection
from src.backend.models.pessoa import PessoaCreate, PessoaResponse

router = APIRouter(prefix="/api/pessoas", tags=["Pessoas"])


@router.post("", response_model=PessoaResponse, status_code=status.HTTP_201_CREATED)
async def cadastrar_pessoa(dados: PessoaCreate):
    """Cadastra uma nova pessoa e suas fotos de referência."""
    pessoa_id = str(uuid.uuid4())
    criado_em_iso = datetime.now().isoformat()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Inserir pessoa
        cursor.execute(
            "INSERT INTO pessoas (id, nome, criado_em) VALUES (?, ?, ?);",
            (pessoa_id, dados.nome, criado_em_iso),
        )
        # Inserir fotos de referência
        for foto in dados.fotos_referencia:
            foto_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO fotos_referencia (id, pessoa_id, caminho_original, criado_em)
                VALUES (?, ?, ?, ?);
                """,
                (foto_id, pessoa_id, foto.caminho_original, criado_em_iso),
            )

    return PessoaResponse(
        id=pessoa_id,
        nome=dados.nome,
        thumbnail_path=None,
        criado_em=datetime.fromisoformat(criado_em_iso),
        total_fotos_ref=len(dados.fotos_referencia),
    )


@router.get("", response_model=list[PessoaResponse])
async def listar_pessoas():
    """Retorna todas as pessoas cadastradas no sistema."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        rows = cursor.execute(
            """
            SELECT p.id, p.nome, p.thumbnail_path, p.criado_em,
                   COUNT(f.id) as total_fotos_ref
            FROM pessoas p
            LEFT JOIN fotos_referencia f ON f.pessoa_id = p.id
            GROUP BY p.id
            ORDER BY p.criado_em DESC;
            """
        ).fetchall()

    res = []
    for row in rows:
        res.append(
            PessoaResponse(
                id=row["id"],
                nome=row["nome"],
                thumbnail_path=row["thumbnail_path"],
                criado_em=datetime.fromisoformat(row["criado_em"]),
                total_fotos_ref=row["total_fotos_ref"],
            )
        )
    return res


@router.get("/{pessoa_id}", response_model=PessoaResponse)
async def obter_pessoa(pessoa_id: str):
    """Busca os detalhes de uma pessoa específica por ID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            """
            SELECT p.id, p.nome, p.thumbnail_path, p.criado_em,
                   COUNT(f.id) as total_fotos_ref
            FROM pessoas p
            LEFT JOIN fotos_referencia f ON f.pessoa_id = p.id
            WHERE p.id = ?
            GROUP BY p.id;
            """,
            (pessoa_id,),
        ).fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada"
        )

    return PessoaResponse(
        id=row["id"],
        nome=row["nome"],
        thumbnail_path=row["thumbnail_path"],
        criado_em=datetime.fromisoformat(row["criado_em"]),
        total_fotos_ref=row["total_fotos_ref"],
    )
