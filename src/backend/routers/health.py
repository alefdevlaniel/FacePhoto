import subprocess
import sys
from fastapi import APIRouter
from pydantic import BaseModel
from src.backend.core.hardware_detector import detect_hardware

router = APIRouter(tags=["Health"])


class FolderPickerRequest(BaseModel):
    titulo: str = "Selecione uma pasta"


def abrir_seletor_pasta_nativo(titulo: str = "Selecione uma pasta") -> str | None:
    """Abre a caixa de diálogo nativa do sistema operacional (Windows FolderBrowserDialog) para seleção de pasta."""
    if sys.platform == "win32":
        try:
            ps_cmd = (
                'Add-Type -AssemblyName System.Windows.Forms; '
                '$d = New-Object System.Windows.Forms.FolderBrowserDialog; '
                f'$d.Description = "{titulo}"; '
                'if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }'
            )
            res = subprocess.run(
                ["powershell", "-NoProfile", "-Command", ps_cmd],
                capture_output=True,
                text=True,
                timeout=120,
            )
            caminho = res.stdout.strip()
            if caminho:
                return caminho
        except Exception:
            pass

    # Fallback genérico com tkinter
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        caminho = filedialog.askdirectory(title=titulo)
        root.destroy()
        if caminho:
            return caminho
    except Exception:
        pass

    return None


@router.get("/health")
async def health_check():
    """Retorna o status de saúde da API."""
    return {"status": "ok", "app": "FacePhoto API", "version": "1.0.0"}


@router.get("/api/status")
async def system_status():
    """Retorna detalhes operacionais do sistema e hardware detectado."""
    hw = detect_hardware()
    return {
        "status": "online",
        "engine": "FacePhoto Core 1.0",
        "offline": True,
        "hardware": {
            "device_type": hw.device_type,
            "name": hw.name,
            "has_gpu": hw.has_gpu,
        },
    }


@router.post("/api/utils/selecionar-pasta")
async def selecionar_pasta_nativo(req: FolderPickerRequest | None = None):
    """Abre o seletor nativo de diretórios do Windows e retorna o caminho absoluto da pasta selecionada."""
    titulo = req.titulo if req and req.titulo else "Selecione a pasta"
    caminho = abrir_seletor_pasta_nativo(titulo)
    return {"caminho": caminho}

