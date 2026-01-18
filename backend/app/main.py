import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from brotli_asgi import BrotliMiddleware
from contextlib import asynccontextmanager
from .database import init_db
from .config import get_settings
from .routers import position_router, settings_router
from .services import get_position_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    init_db()

    position_service = get_position_service()
    await position_service.start()

    yield


settings = get_settings()

app = FastAPI(
    title="web-app-start API",
    description="Backend API for web-app-start",
    version="0.1.0",
    lifespan=lifespan,
)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)
    allowed_origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(BrotliMiddleware)

app.include_router(position_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "web-app-start API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
