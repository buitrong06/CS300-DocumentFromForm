from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.db import check_db_connection

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
