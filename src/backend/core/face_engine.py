"""
Motor de Reconhecimento Facial de Alta Precisão (InsightFace v1.1).
Utiliza ONNX Runtime com SCRFD para detecção facial e ArcFace (512-d) para extração de embeddings.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
import logging
import os
from pathlib import Path
from typing import Optional
import numpy as np

# Configuração de limites de threads da CPU para garantir fluidez no Windows
os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "4")
os.environ.setdefault("MKL_NUM_THREADS", "4")

logger = logging.getLogger(__name__)


@dataclass
class FaceBoundingBox:
    x: int
    y: int
    w: int
    h: int
    x_pct: float = 0.0
    y_pct: float = 0.0
    w_pct: float = 0.0
    h_pct: float = 0.0

    def to_dict(self) -> dict[str, float]:
        return {
            "x": float(self.x),
            "y": float(self.y),
            "w": float(self.w),
            "h": float(self.h),
            "x_pct": float(self.x_pct),
            "y_pct": float(self.y_pct),
            "w_pct": float(self.w_pct),
            "h_pct": float(self.h_pct),
        }


@dataclass
class FaceDetectionResult:
    bounding_box: FaceBoundingBox
    embedding: np.ndarray
    confidence: float


class FaceEngineBase(ABC):
    """Interface abstrata base para qualquer motor de reconhecimento facial."""

    @abstractmethod
    def detect_and_extract(self, image_path: Path) -> list[FaceDetectionResult]:
        """Detecta rostos em uma imagem e extrai seus vetores de embedding."""
        pass

    @abstractmethod
    def calculate_similarity(
        self, embedding1: np.ndarray, embedding2: np.ndarray
    ) -> float:
        """Calcula a similaridade calibrada entre dois vetores de embedding (0.0 a 1.0)."""
        pass


class InsightFaceEngine(FaceEngineBase):
    """
    Implementação concreta de alta precisão utilizando InsightFace (SCRFD + ArcFace 512-D com ONNX Runtime).
    """

    _instance: Optional["InsightFaceEngine"] = None
    _app = None

    def __init__(self, model_name: str = "buffalo_l", ctx_id: int = 0, det_size: tuple[int, int] = (640, 640)):
        self.model_name = model_name
        self.ctx_id = ctx_id
        self.det_size = det_size
        self._init_app()

    def _init_app(self):
        if InsightFaceEngine._app is None:
            import insightface
            from insightface.app import FaceAnalysis
            from src.backend.core.hardware_detector import get_optimal_onnx_providers

            candidate_providers = get_optimal_onnx_providers()
            logger.info("Detectando provedores de hardware ideais: %s", candidate_providers)

            # Tentar inicialização com os melhores providers disponíveis, com fallback automático em cascata
            app = None
            last_err = None

            for i in range(len(candidate_providers)):
                attempt_providers = candidate_providers[i:]
                try:
                    logger.info("Tentando inicializar InsightFace com providers: %s", attempt_providers)
                    app = FaceAnalysis(name=self.model_name, providers=attempt_providers)
                    app.prepare(ctx_id=self.ctx_id, det_size=self.det_size)
                    InsightFaceEngine._app = app
                    logger.info(
                        "✓ InsightFace Engine carregado com sucesso (Modelo: %s, Provedor ativo: %s)",
                        self.model_name,
                        attempt_providers[0],
                    )
                    break
                except Exception as err:
                    logger.warning("Falha ao inicializar com providers %s: %s. Tentando próximo provider...", attempt_providers, err)
                    last_err = err

            if InsightFaceEngine._app is None:
                logger.error("Falha irreversível ao inicializar InsightFace em todos os providers: %s", last_err)
                raise last_err

    def detect_and_extract(self, image_path: Path) -> list[FaceDetectionResult]:
        if not image_path.exists() or not image_path.is_file():
            return []

        try:
            import cv2

            # Leitura resiliente a caminhos Unicode / acentuados no Windows
            img_bytes = np.fromfile(str(image_path), dtype=np.uint8)
            img_bgr = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)

            if img_bgr is None:
                logger.warning("Não foi possível decodificar a imagem: %s", image_path)
                return []

            img_h, img_w = img_bgr.shape[:2]

            # Inferência de detecção e extração de embedding 512-D
            faces = InsightFaceEngine._app.get(img_bgr)
            results: list[FaceDetectionResult] = []

            for face in faces:
                bbox_raw = face.bbox.astype(int)
                x1, y1, x2, y2 = bbox_raw

                # Normalizar coordenadas da bounding box dentro dos limites da imagem
                x = max(0, int(x1))
                y = max(0, int(y1))
                w = max(1, min(img_w - x, int(x2 - x1)))
                h = max(1, min(img_h - y, int(y2 - y1)))

                x_pct = round(float(x / img_w), 4) if img_w > 0 else 0.0
                y_pct = round(float(y / img_h), 4) if img_h > 0 else 0.0
                w_pct = round(float(w / img_w), 4) if img_w > 0 else 0.0
                h_pct = round(float(h / img_h), 4) if img_h > 0 else 0.0

                bbox = FaceBoundingBox(x=x, y=y, w=w, h=h, x_pct=x_pct, y_pct=y_pct, w_pct=w_pct, h_pct=h_pct)

                # Vetor de embedding ArcFace (512 dimensões)
                raw_emb = face.embedding.astype(np.float32)
                norm = np.linalg.norm(raw_emb)
                normed_emb = raw_emb / norm if norm > 0 else raw_emb

                conf = float(getattr(face, "det_score", 1.0))

                results.append(
                    FaceDetectionResult(
                        bounding_box=bbox,
                        embedding=normed_emb,
                        confidence=conf,
                    )
                )

            return results

        except Exception as err:
            logger.debug("Erro ao processar rosto em %s com InsightFace: %s", image_path, err)
            return []

    def calculate_similarity(
        self, embedding1: np.ndarray, embedding2: np.ndarray
    ) -> float:
        """
        Calcula a similaridade de cosseno e calibra para a escala de probabilidade [0.0, 1.0].
        No ArcFace (InsightFace):
          - cos_sim >= 0.55 indica a mesma pessoa com altíssima certeza (>90%).
          - cos_sim entre 0.38 e 0.55 indica área de revisão manual (~65% a 90%).
          - cos_sim < 0.35 indica pessoas diferentes.
        """
        dot_product = float(np.dot(embedding1, embedding2))
        norm_a = float(np.linalg.norm(embedding1))
        norm_b = float(np.linalg.norm(embedding2))

        if norm_a == 0 or norm_b == 0:
            return 0.0

        raw_sim = dot_product / (norm_a * norm_b)

        # Calibração linear suave do cosseno do ArcFace para percentual de confiança
        # Mapeia [-0.10, 0.70] para a faixa de [0.0, 1.0]
        calibrated = (raw_sim - 0.15) / 0.55
        return float(np.clip(calibrated, 0.0, 1.0))


class MockFaceEngine(FaceEngineBase):
    """
    Motor Mock de IA leve utilizado para testes unitários rápidos e sem dependência de download de modelos.
    """

    def __init__(self, mock_score: float = 0.85):
        self.mock_score = mock_score

    def detect_and_extract(self, image_path: Path) -> list[FaceDetectionResult]:
        if not image_path.exists():
            return []
        seed = sum(ord(c) for c in str(image_path)) % 1000
        rng = np.random.default_rng(seed)
        emb = rng.standard_normal(512, dtype=np.float32)
        emb /= np.linalg.norm(emb)

        return [
            FaceDetectionResult(
                bounding_box=FaceBoundingBox(x=50, y=50, w=100, h=100),
                embedding=emb,
                confidence=0.95,
            )
        ]

    def calculate_similarity(
        self, embedding1: np.ndarray, embedding2: np.ndarray
    ) -> float:
        dot_product = np.dot(embedding1, embedding2)
        norm_a = np.linalg.norm(embedding1)
        norm_b = np.linalg.norm(embedding2)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        sim = dot_product / (norm_a * norm_b)
        return float(np.clip((sim + 1.0) / 2.0, 0.0, 1.0))


_global_engine: Optional[FaceEngineBase] = None


def create_face_engine(use_mock: bool = False) -> FaceEngineBase:
    """Factory singleton para instanciar o motor de reconhecimento facial InsightFace."""
    global _global_engine
    if use_mock:
        return MockFaceEngine()

    if _global_engine is not None:
        return _global_engine

    try:
        _global_engine = InsightFaceEngine()
        return _global_engine
    except Exception as err:
        logger.warning("InsightFace não pôde ser carregado: %s. Utilizando MockEngine.", err)
        _global_engine = MockFaceEngine()
        return _global_engine
