from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.db import check_db_connection
from app.modules.auth.router import router as auth_router
from app.modules.drafts.router import router as drafts_router
from app.modules.presets.router import router as presets_router
from app.modules.rendering.router import router as rendering_router
from app.modules.templates.router import router as templates_router

settings = get_settings()

app = FastAPI(
    title="Document: Fill and Deliver API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(presets_router)
app.include_router(templates_router)
app.include_router(drafts_router)
app.include_router(rendering_router)


@app.get("/api/health", tags=["health"])
def health_check() -> JSONResponse:
    """Return application and PostgreSQL health status."""
    db_ok = check_db_connection()
    payload = {
        "status": "ok" if db_ok else "degraded",
        "environment": settings.app_env,
        "database": "connected" if db_ok else "disconnected",
    }
    code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=code, content=payload)
