"""
Testes unitários para o serviço de geração e cache de thumbnails (thumbnail_service).
"""

from pathlib import Path
from PIL import Image
import pytest
from src.backend.core.thumbnail_service import get_or_create_thumbnail, get_thumbnail_path, CACHE_DIR


def test_thumbnail_generation_and_cache(tmp_path: Path):
    # Criar uma imagem fictícia de alta resolução
    orig_img_path = tmp_path / "high_res_photo.jpg"
    img = Image.new("RGB", (2000, 1500), color="blue")
    img.save(orig_img_path, format="JPEG")

    # Gerar thumbnail
    thumb_path = get_or_create_thumbnail(orig_img_path, max_size=300)

    assert thumb_path.exists()
    assert thumb_path != orig_img_path
    assert thumb_path.suffix == ".jpg"

    # Verificar dimensões da miniatura gerada
    with Image.open(thumb_path) as thumb_img:
        width, height = thumb_img.size
        assert width <= 300
        assert height <= 300
        assert width == 300  # Proporção 4:3 -> 300x225
        assert height == 225

    # Chamar novamente deve reaproveitar o cache
    cached_thumb = get_or_create_thumbnail(orig_img_path, max_size=300)
    assert cached_thumb == thumb_path


def test_thumbnail_non_existent_file():
    non_existent = Path("caminho/inexistente/foto.jpg")
    res = get_or_create_thumbnail(non_existent, max_size=300)
    assert res == non_existent
