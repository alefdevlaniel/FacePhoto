"""
Módulo para detecção automática de hardware e aceleração gráfica (GPU vs CPU).
Detecta suporte a NVIDIA CUDA, Apple MPS e fallback para CPU.
"""

from dataclasses import dataclass
import subprocess
import sys


@dataclass
class HardwareInfo:
    device_type: str  # "cuda", "mps", "cpu"
    name: str  # Nome amigável do dispositivo
    has_gpu: bool


def detect_hardware() -> HardwareInfo:
    """
    Identifica o melhor hardware disponível no sistema para aceleração de IA.
    """
    # 1. Tentar obter nome real da GPU NVIDIA via nvidia-smi
    try:
        res = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if res.returncode == 0 and res.stdout.strip():
            gpu_name = res.stdout.splitlines()[0].strip()
            return HardwareInfo(
                device_type="cuda",
                name=f"{gpu_name} (NVIDIA CUDA)",
                has_gpu=True,
            )
    except Exception:
        pass

    # 2. PyTorch CUDA / MPS
    try:
        import torch

        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            return HardwareInfo(
                device_type="cuda",
                name=f"{device_name} (NVIDIA CUDA)",
                has_gpu=True,
            )
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return HardwareInfo(
                device_type="mps",
                name="Apple Silicon GPU (Metal Performance Shaders)",
                has_gpu=True,
            )
    except ImportError:
        pass

    # 3. ONNX Runtime
    try:
        import onnxruntime as ort

        providers = ort.get_available_providers()
        if "CUDAExecutionProvider" in providers:
            return HardwareInfo(
                device_type="cuda",
                name="GPU NVIDIA CUDA",
                has_gpu=True,
            )
    except ImportError:
        pass

    # Fallback para CPU
    return HardwareInfo(
        device_type="cpu",
        name=f"CPU ({sys.platform.upper()})",
        has_gpu=False,
    )
