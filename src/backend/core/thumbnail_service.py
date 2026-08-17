"""
Serviço de geração e cache em disco de miniaturas (thumbnails) de imagens.
Otimiza a renderização de acervos pesados na interface gráfica, evitando alto consumo de memória RAM/GPU.
"""

from io import BytesIO
import hashlib
from pathlib import Path
from PIL import Image, ImageOps

# Diretório padrão para cache de miniaturas
CACHE_DIR = Path(".cache/thumbnails")


def get_thumbnail_path(file_path: Path, max_size: int = 360) -> Path:
    """Calcula o caminho determinístico do arquivo de cache para a imagem e tamanho informados."""
    try:
        stat = file_path.stat()
        file_signature = f"{file_path.resolve()}_{stat.st_mtime}_{stat.st_size}_{max_size}"
    except Exception:
        file_signature = f"{file_path.resolve()}_{max_size}"

    hash_key = hashlib.sha256(file_signature.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{hash_key}.jpg"


def get_or_create_thumbnail(file_path: Path, max_size: int = 360) -> Path:
    """
    Retorna o caminho da miniatura gerada em cache para a imagem fornecida.
    Se a miniatura ainda não existir ou estiver corrompida, cria uma nova com PIL.
    Em caso de falha irreversível de leitura, retorna o próprio caminho do arquivo original.
    """
    if not file_path.exists() or not file_path.is_file():
        return file_path

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    thumb_path = get_thumbnail_path(file_path, max_size)

    if thumb_path.exists() and thumb_path.stat().st_size > 0:
        return thumb_path

    try:
        with Image.open(file_path) as img:
            # Respeitar orientação EXIF se presente
            img = ImageOps.exif_transpose(img)

            # Converter para RGB caso seja RGBA ou CMYK
            if img.mode in ("RGBA", "LA", "P"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[-1] if len(img.split()) == 4 else None)
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # Redimensionar mantendo proporção de aspecto (thumbnail)
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

            # Salvar miniatura otimizada em JPEG
            temp_path = thumb_path.with_suffix(".tmp")
            img.save(temp_path, format="JPEG", quality=82, optimize=True)
            temp_path.replace(thumb_path)

            return thumb_path
    except Exception as err:
        # Fallback gracioso para a imagem original em caso de formato não suportado pelo PIL
        return file_path
