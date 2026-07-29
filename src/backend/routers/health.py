"""
Endpoint de verificação de saúde da API e status do sistema.
"""

from fastapi import APIRouter
from src.backend.core.hardware_detector import detect_hardware

router = APIRouter(tags=["Health"])


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
