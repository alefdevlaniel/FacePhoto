"""
Módulo para detecção automática de hardware e seleção do melhor motor de aceleração.
Detecta dinamicamente suporte a NVIDIA CUDA, DirectML (NVIDIA/AMD/Intel GPU no Windows), Apple MPS/CoreML e CPU balanceada.
"""

from dataclasses import dataclass
import os
import subprocess
import sys


@dataclass
class HardwareInfo:
    device_type: str  # "cuda", "directml", "mps", "cpu"
    name: str  # Nome amigável do dispositivo
    has_gpu: bool
    optimal_providers: list[str]


def get_optimal_onnx_providers() -> list[str]:
    """
    Retorna a lista priorizada de Execution Providers do ONNX Runtime para a máquina atual,
    sempre com fallback garantido para CPU.
    """
    try:
        import onnxruntime as ort
        available = set(ort.get_available_providers())
    except Exception:
        return ["CPUExecutionProvider"]

    # Ordem de prioridade de aceleração por hardware
    priority_order = [
        "CUDAExecutionProvider",
        "DmlExecutionProvider",
        "CoreMLExecutionProvider",
        "OpenVINOExecutionProvider",
        "CPUExecutionProvider",
    ]

    selected = [p for p in priority_order if p in available]
    if "CPUExecutionProvider" not in selected:
        selected.append("CPUExecutionProvider")

    return selected


def detect_hardware() -> HardwareInfo:
    """
    Identifica dinamicamente o melhor hardware disponível no computador atual para aceleração de IA.
    Suporta qualquer fabricante (NVIDIA, AMD, Intel, Apple) com fallback robusto para CPU.
    """
    optimal_providers = get_optimal_onnx_providers()
    has_gpu = any(p in optimal_providers for p in ["CUDAExecutionProvider", "DmlExecutionProvider", "CoreMLExecutionProvider"])

    # 1. Verificar GPU NVIDIA via nvidia-smi
    gpu_name = None
    try:
        res = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=2,
        )
        if res.returncode == 0 and res.stdout.strip():
            gpu_name = res.stdout.splitlines()[0].strip()
    except Exception:
        pass

    # 2. Se houver CUDA ativo
    if "CUDAExecutionProvider" in optimal_providers:
        name = f"{gpu_name} (NVIDIA CUDA)" if gpu_name else "GPU NVIDIA CUDA"
        return HardwareInfo(
            device_type="cuda",
            name=name,
            has_gpu=True,
            optimal_providers=optimal_providers,
        )

    # 3. Se houver DirectML ativo (NVIDIA, AMD Radeon ou Intel Arc / iGPU no Windows)
    if "DmlExecutionProvider" in optimal_providers:
        name = f"{gpu_name} (Aceleração DirectML / GPU)" if gpu_name else "Aceleração DirectML (GPU Dedicada/Integrada)"
        return HardwareInfo(
            device_type="directml",
            name=name,
            has_gpu=True,
            optimal_providers=optimal_providers,
        )

    # 4. Apple Silicon / CoreML
    if "CoreMLExecutionProvider" in optimal_providers or sys.platform == "darwin":
        return HardwareInfo(
            device_type="mps",
            name="Apple Silicon GPU (Neural Engine / CoreML)",
            has_gpu=True,
            optimal_providers=optimal_providers,
        )

    # 5. Fallback Universal para CPU
    cpu_count = os.cpu_count() or 4
    return HardwareInfo(
        device_type="cpu",
        name=f"Processador CPU ({cpu_count} núcleos · {sys.platform.upper()})",
        has_gpu=False,
        optimal_providers=["CPUExecutionProvider"],
    )

