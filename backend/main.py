from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from database import engine, Base
import models.user  # noqa: F401 — requis pour create_all
import models.annotation  # noqa: F401 — requis pour create_all
from routers import health, annotations, ws, videos, auth, sessions, hls

load_dotenv()

UPLOAD_DIR = Path("uploads")
HLS_DIR = Path("media/hls")

# Créer les dossiers avant l'app — StaticFiles vérifie leur existence à la création
UPLOAD_DIR.mkdir(exist_ok=True)
HLS_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Collabix API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/videos", StaticFiles(directory=UPLOAD_DIR), name="videos")
app.mount("/hls", StaticFiles(directory=HLS_DIR), name="hls")

app.include_router(auth.router)
app.include_router(health.router)
app.include_router(annotations.router)
app.include_router(videos.router)
app.include_router(ws.router)
app.include_router(sessions.router)
app.include_router(hls.router)
