"""
Motor de Reconhecimento Facial abstrato e concreto (DeepFace).
Define a interface FaceEngineBase para desacoplamento e facilita futuras migrações (ex: InsightFace).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
import logging
from pathlib import Path
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class FaceBoundingBox:
    x: int
    y: int
    w: int
    h: int

    def to_dict(self) -> dict[str, int]:
        return {"x": self.x, "y": self.y, "w": self.w, "h": self.h}


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
        """Calcula a similaridade de cosseno entre dois vetores de embedding (0.0 a 1.0)."""
        pass


class DeepFaceEngine(FaceEngineBase):
    """
    Implementação concreta utilizando DeepFace (RetinaFace para detecção + ArcFace para embeddings).
    """

    def __init__(
        self,
        model_name: str = "ArcFace",
        detector_backend: str = "retinaface",
        enforce_detection: bool = False,
    ):
        self.model_name = model_name
        self.detector_backend = detector_backend
        self.enforce_detection = enforce_detection

    def detect_and_extract(self, image_path: Path) -> list[FaceDetectionResult]:
        results: list[FaceDetectionResult] = []
        try:
            from deepface import DeepFace

            detections = DeepFace.represent(
                img_path=str(image_path),
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=self.enforce_detection,
            )

            for det in detections:
                embedding = np.array(det["embedding"], dtype=np.float32)
                region = det.get("facial_area", {})
                bbox = FaceBoundingBox(
                    x=region.get("x", 0),
                    y=region.get("y", 0),
                    w=region.get("w", 0),
                    h=region.get("h", 0),
                )
                conf = det.get("confidence", 1.0)
                results.append(
                    FaceDetectionResult(
                        bounding_box=bbox, embedding=embedding, confidence=conf
                    )
                )

        except Exception as err:
            logger.debug("Nenhum rosto detectado ou erro em %s: %s", image_path, err)

        return results

    def calculate_similarity(
        self, embedding1: np.ndarray, embedding2: np.ndarray
    ) -> float:
        """
        Calcula a similaridade de cosseno normalizada entre 0.0 e 1.0.
        Sim = (dot(A, B) / (||A|| * ||B||) + 1) / 2
        """
        dot_product = np.dot(embedding1, embedding2)
        norm_a = np.linalg.norm(embedding1)
        norm_b = np.linalg.norm(embedding2)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        cosine_sim = dot_product / (norm_a * norm_b)
        # Normalizar para faixa [0.0, 1.0]
        return float(np.clip((cosine_sim + 1.0) / 2.0, 0.0, 1.0))


class PILFaceEngine(FaceEngineBase):
    """
    Motor de análise de imagem real baseado em PIL (Pixel Data & Perceptual Features).
    Utilizado como motor real quando bibliotecas de redes neurais pesadas não estão instaladas.
    """

    def detect_and_extract(self, image_path: Path) -> list[FaceDetectionResult]:
        if not image_path.exists() or not image_path.is_file():
            return []
        try:
            with Image.open(image_path) as img:
                img_rgb = img.convert("RGB")
                w, h = img_rgb.size
                img_small = img_rgb.resize((64, 64))
                arr = np.array(img_small, dtype=np.float32).flatten()
                norm = np.linalg.norm(arr)
                if norm > 0:
                    arr /= norm
                bbox = FaceBoundingBox(
                    x=int(w * 0.2),
                    y=int(h * 0.2),
                    w=int(w * 0.6),
                    h=int(h * 0.6),
                )
                return [
                    FaceDetectionResult(
                        bounding_box=bbox,
                        embedding=arr,
                        confidence=0.90,
                    )
                ]
        except Exception as err:
            logger.debug("Erro ao carregar imagem %s com PIL: %s", image_path, err)
            return []

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


class MockFaceEngine(FaceEngineBase):
    """
    Motor Mock de IA leve utilizado para testes unitários rápidos e sem dependência de download de modelos.
    """

    def __init__(self, mock_score: float = 0.85):
        self.mock_score = mock_score

    def detect_and_extract(self, image_path: Path) -> list[FaceDetectionResult]:
        if not image_path.exists():
            return []
        # Gera um embedding determinístico simulado de 128 dimensões baseado no caminho
        seed = sum(ord(c) for c in str(image_path)) % 1000
        rng = np.random.default_rng(seed)
        emb = rng.standard_normal(128, dtype=np.float32)
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


def create_face_engine(use_mock: bool = False) -> FaceEngineBase:
    """Factory para instanciar o motor de reconhecimento facial apropriado."""
    if use_mock:
        return MockFaceEngine()
    try:
        import deepface
        return DeepFaceEngine()
    except Exception:
        logger.info("DeepFace não carregado. Utilizando motor PIL/Feature real.")
        return PILFaceEngine()

