"""
Módulo para detecção de fotos duplicadas por Hash Perceptual (pHash).
Ignora duplicatas mesmo se redimensionadas, comprimidas ou renomeadas.
"""

from dataclasses import dataclass
import hashlib
import logging
from pathlib import Path
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class ImageHashInfo:
    file_path: Path
    phash: str
    file_size: int
    dimensions: tuple[int, int]


def calculate_perceptual_hash(image_path: Path) -> str:
    """
    Calcula o hash perceptual (pHash) de uma imagem.
    Se a biblioteca imagehash estiver disponível, utiliza phash;
    caso contrário, calcula um hash MD5 dos pixels reduzidos como fallback.
    """
    try:
        import imagehash

        with Image.open(image_path) as img:
            return str(imagehash.phash(img))
    except Exception:
        # Fallback leve usando Pillow
        try:
            with Image.open(image_path) as img:
                img_small = img.convert("L").resize((16, 16), Image.Resampling.BILINEAR)
                if hasattr(img_small, "get_flattened_data"):
                    pixels = list(img_small.get_flattened_data())
                else:
                    pixels = list(img_small.getdata())
                avg = sum(pixels) / len(pixels)
                bits = "".join(["1" if p > avg else "0" for p in pixels])
                return hex(int(bits, 2))[2:].zfill(16)
        except Exception as err:
            logger.warning("Falha ao calcular hash para %s: %s", image_path, err)
            # Fallback final por hash MD5 do conteúdo em bytes
            with open(image_path, "rb") as f:
                return hashlib.md5(f.read()).hexdigest()


def are_hashes_similar(hash1: str, hash2: str, max_distance: int = 5) -> bool:
    """
    Verifica se dois hashes perceptuais são similares (distância Hamming <= max_distance).
    Distância <= 5 indica imagens com o mesmo conteúdo visual.
    """
    if hash1 == hash2:
        return True

    try:
        import imagehash

        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
        return (h1 - h2) <= max_distance
    except Exception:
        # Comparação caractere por caractere para fallback de string binária/hex
        if len(hash1) != len(hash2):
            return False
        diffs = sum(1 for a, b in zip(hash1, hash2) if a != b)
        return diffs <= max_distance


def filter_unique_images(file_paths: list[Path]) -> tuple[list[Path], list[Path]]:
    """
    Recebe uma lista de caminhos de foto e separa em:
    - fotos_unicas: lista de fotos mantidas para análise
    - fotos_duplicadas: lista de fotos identificadas como duplicadas e ignoradas
    """
    seen_hashes: dict[str, Path] = {}
    unique: list[Path] = []
    duplicates: list[Path] = []

    for path in file_paths:
        try:
            h = calculate_perceptual_hash(path)
            is_dup = False
            for existing_hash in seen_hashes:
                if are_hashes_similar(h, existing_hash):
                    is_dup = True
                    duplicates.append(path)
                    break
            if not is_dup:
                seen_hashes[h] = path
                unique.append(path)
        except Exception as err:
            logger.warning("Erro na deduplicação de %s: %s", path, err)
            unique.append(path)

    return unique, duplicates
