"""
Schemas Pydantic para Sessões de Busca e Resultados.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class SessaoCreate(BaseModel):
    nome_sessao: str | None = Field(None, description="Nome identificador da busca")
    pessoa_ids: list[str] = Field(..., min_length=1, description="Lista de IDs de pessoas a buscar")
    pasta_origem: str = Field(..., description="Caminho da pasta raiz de acervo")
    pasta_destino: str = Field(..., description="Caminho da pasta de destino para fotos encontradas")
    threshold: float = Field(default=0.6, ge=0.3, le=0.95, description="Sensibilidade de matching (0.3 a 0.95)")


class SessaoResponse(BaseModel):
    id: str
    nome_sessao: str | None = None
    pasta_origem: str
    pasta_destino: str
    threshold: float
    status: str
    total_fotos: int = 0
    total_duplicatas: int = 0
    total_encontradas: int = 0
    total_copiadas: int = 0
    dispositivo_proc: str | None = None
    iniciado_em: datetime
    concluido_em: datetime | None = None
