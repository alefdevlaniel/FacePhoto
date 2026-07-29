"""
Módulo gerenciador de cópia de arquivos.
Preserva metadados EXIF (shutil.copy2) e resolve colisões de nomes de arquivos.
"""

from dataclasses import dataclass
import logging
from pathlib import Path
import shutil

logger = logging.getLogger(__name__)


@dataclass
class CopyOperationResult:
    caminho_origem: Path
    caminho_destino: Path
    sucesso: bool
    erro: str | None = None


def resolve_destination_path(destination_dir: Path, file_name: str) -> Path:
    """
    Gera um caminho de destino resolvendo colisões de nome.
    Se 'foto.jpg' já existir, gera 'foto_2.jpg', 'foto_3.jpg', etc.
    """
    dest_path = destination_dir / file_name
    if not dest_path.exists():
        return dest_path

    stem = dest_path.stem
    suffix = dest_path.suffix
    counter = 2

    while True:
        candidate = destination_dir / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def copy_file_preserve_metadata(
    source_path: Path, destination_dir: Path, subfolder_name: str | None = None
) -> CopyOperationResult:
    """
    Copia um arquivo individual preservando timestamp e metadados EXIF.
    Cria a pasta de destino automaticamente se não existir.
    """
    if not source_path.exists():
        return CopyOperationResult(
            caminho_origem=source_path,
            caminho_destino=destination_dir / source_path.name,
            sucesso=False,
            erro="Arquivo de origem não encontrado",
        )

    target_dir = destination_dir
    if subfolder_name:
        target_dir = destination_dir / subfolder_name

    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        dest_file_path = resolve_destination_path(target_dir, source_path.name)

        # shutil.copy2 copia o conteúdo e tenta preservar permissões, timestamps e metadados EXIF
        shutil.copy2(str(source_path), str(dest_file_path))

        return CopyOperationResult(
            caminho_origem=source_path,
            caminho_destino=dest_file_path,
            sucesso=True,
        )
    except Exception as err:
        logger.error("Erro ao copiar %s para %s: %s", source_path, target_dir, err)
        return CopyOperationResult(
            caminho_origem=source_path,
            caminho_destino=target_dir / source_path.name,
            sucesso=False,
            erro=str(err),
        )


def copy_multiple_files(
    files: list[tuple[Path, str | None]], destination_dir: Path
) -> list[CopyOperationResult]:
    """
    Copia uma lista de tuplas (caminho_origem, subpasta_opcional) para o destino.
    """
    results: list[CopyOperationResult] = []
    for src_path, subfolder in files:
        res = copy_file_preserve_metadata(src_path, destination_dir, subfolder)
        results.append(res)
    return results
