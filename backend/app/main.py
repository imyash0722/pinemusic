import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import get_config
from app.database import init_db
from app.queue_manager import queue_manager
from app.api.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    cfg = get_config()
    print(f"[PineMusic] Starting PineMusic Server on port {cfg['port']}...")
    print(f"[PineMusic] Music storage directory: {cfg['music_dir']}")
    print(f"[PineMusic] Navidrome endpoint: {cfg['navidrome_url']}")
    
    await init_db()
    await queue_manager.start_worker()
    yield
    # Shutdown
    print("[PineMusic] Shutting down queue worker...")
    await queue_manager.stop_worker()

app = FastAPI(
    title="PineMusic Server",
    description="High-fidelity music requester, queue orchestrator, and downloader for Navidrome",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for homelab and remote access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(api_router)

# Mount frontend if built
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API or docs
        if full_path.startswith("api/") or full_path in ("docs", "redoc", "openapi.json"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "name": "PineMusic Server",
            "version": "1.0.0",
            "status": "running",
            "docs": "/docs",
            "api": "/api/v1"
        }

if __name__ == "__main__":
    import uvicorn
    cfg = get_config()
    uvicorn.run("app.main:app", host=cfg["host"], port=cfg["port"], reload=False)
