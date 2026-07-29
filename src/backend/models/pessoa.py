"""
Schemas Pydantic para cadastro e transferência de dados de Pessoas.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class FotoReferenciaCreate(BaseModel):
    caminho_original: str = Field(..., description="Caminho absoluto da foto de referência")


class PessoaCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100, description="Nome da pessoa a ser buscada")
    fotos_referencia: list[FotoReferenciaCreate] = Field(
        ..., min_length=1, description="Lista de fotos de referência (mínimo 1)"
    )


class PessoaResponse(BaseModel):
    id: str
    nome: str
    thumbnail_path: str | None = None
    criado_em: datetime
    total_fotos_ref: int = 0
