"""
Módulo de varredura recursiva de arquivos com leitor em lotes e streaming.
Projetado para processar até 30.000 fotos com consumo de memória estável.
"""

from collections.abc import Generator
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Formatos de imagem suportados
SUPPORTED_EXTENSIONS = {
    # JPEG
    ".jpg",
    ".jpeg",
    # PNG
    ".png",
    # WebP
    ".webp",
    # HEIC / HEIF (iPhone)
    ".heic",
    ".heif",
    # BMP & TIFF
    ".bmp",
    ".tif",
    ".tiff",
    # RAW (Câmeras Profissionais: Canon, Nikon, Sony, Olympus, Panasonic, DNG)
    ".cr2",
    ".cr3",
    ".nef",
    ".arw",
    ".orf",
    ".rw2",
    ".dng",
}


def has_supported_extension(path: Path) -> bool:
    """Verifica se o arquivo tem uma extensão de imagem suportada."""
    return path.suffix.lower() in SUPPORTED_EXTENSIONS


def is_supported_image(path: Path) -> bool:
    """Verifica se é um arquivo existente com extensão de imagem suportada."""
    return has_supported_extension(path) and path.is_file()


def scan_directory_stream(root_path: Path) -> Generator[Path, None, None]:
    """
    Gerador que realiza varredura recursiva em um diretório e gera (yield)
    caminhos de fotos suportadas sob demanda (lazy evaluation).

    Evita carregar listas gigantes na memória RAM (essencial para 30.000 fotos).
    """
    if not root_path.exists():
        raise FileNotFoundError(f"Diretório não encontrado: {root_path}")

    if not root_path.is_dir():
        raise ValueError(f"O caminho informado não é um diretório: {root_path}")

    try:
        for entry in root_path.rglob("*"):
            try:
                if is_supported_image(entry):
                    yield entry
            except (PermissionError, OSError) as err:
                logger.warning("Erro ao acessar o arquivo %s: %s", entry, err)
                continue
    except (PermissionError, OSError) as err:
        logger.error("Erro ao percorrer o diretório %s: %s", root_path, err)


def scan_directory_batches(
    root_path: Path, batch_size: int = 50
) -> Generator[list[Path], None, None]:
    """
    Agrupa o streaming de fotos em lotes de tamanho configurável (padrão: 50).
    Permite processamento em lote (batching) mantendo o uso de RAM reduzido.
    """
    batch = []
    for file_path in scan_directory_stream(root_path):
        batch.append(file_path)
        if len(batch) >= batch_size:
            yield batch
            batch = []
    if batch:
        yield batch


def count_supported_images(root_path: Path) -> int:
    """Retorna o total de imagens suportadas presentes no diretório."""
    return sum(1 for _ in scan_directory_stream(root_path))
