"""
Ponto de entrada da aplicação Backend FastAPI do FacePhoto.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
# pyrefly: ignore [missing-import]
from src.backend.database.schema import init_db
# pyrefly: ignore [missing-import]
from src.backend.routers import health, pessoas, sessoes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eventos de ciclo de vida da aplicação (startup e shutdown)."""
    # Startup: Inicializar banco de dados SQLite
    init_db()
    yield
    # Shutdown: Cleanup se necessário


app = FastAPI(
    title="FacePhoto API",
    description="Backend local do sistema FacePhoto — Reconhecimento Facial 100% Offline",
    version="1.0.0",
    lifespan=lifespan,
)

# Permitir CORS para chamadas locais da UI (React/Tauri)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir Routers
app.include_router(health.router)
app.include_router(pessoas.router)
app.include_router(sessoes.router)


from urllib.parse import unquote
# pyrefly: ignore [missing-import]
from src.backend.core.thumbnail_service import get_or_create_thumbnail


@app.get("/api/media")
async def serve_media(path: str, thumb: bool = False, size: int = 360):
    """
    Serve arquivos de imagem locais para a interface React de forma segura e com suporte
    a geração de miniaturas ultraleves (thumbnails) para prevenir estouro de memória no WebView2.
    """
    decoded_path = unquote(path)
    file_path = Path(decoded_path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo de imagem não encontrado")

    if thumb:
        # Gerar ou recuperar miniatura leve do cache local
        thumb_file = get_or_create_thumbnail(file_path, max_size=size)
        return FileResponse(
            str(thumb_file),
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    return FileResponse(str(file_path), headers={"Cache-Control": "public, max-age=86400"})



if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.backend.main:app", host="127.0.0.1", port=8001, reload=True)

