"""
Módulo de ranqueamento e classificação de resultados por threshold de confiança.
"""

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from src.backend.core.face_engine import FaceBoundingBox


class MatchStatus(str, Enum):
    CONFIRMADO = "confirmado"
    REVISAO_MANUAL = "revisao_manual"
    DESCARTADO = "descartado"


@dataclass
class MatchResult:
    caminho_foto: Path
    pessoa_id: str
    score: float
    status: MatchStatus
    bounding_box: FaceBoundingBox
    hash_arquivo: str


def classify_match(score: float, threshold: float = 0.60) -> MatchStatus:
    """
    Classifica um resultado com base no score de similaridade e threshold.
    - score >= threshold: Confirmado
    - 0.35 <= score < threshold: Revisão Manual
    - score < 0.35: Descartado
    """
    if score >= threshold:
        return MatchStatus.CONFIRMADO
    elif score >= 0.35:
        return MatchStatus.REVISAO_MANUAL
    else:
        return MatchStatus.DESCARTADO


def rank_and_filter_results(
    matches: list[MatchResult],
    min_status: MatchStatus = MatchStatus.REVISAO_MANUAL,
) -> list[MatchResult]:
    """
    Filtra os resultados mantendo apenas aqueles com status Relevante (Confirmado ou Revisão)
    e ordena por score de confiança em ordem decrescente.
    """
    filtered = [m for m in matches if m.status != MatchStatus.DESCARTADO]
    filtered.sort(key=lambda m: m.score, reverse=True)
    return filtered
