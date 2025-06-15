from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routes.interface import router as chat_router
from backend.app.utils import simple_generate_unique_route_id
from app.config import settings

app = FastAPI(
    generate_unique_id_function=simple_generate_unique_route_id,
    openapi_url=settings.OPENAPI_URL,
)

# Middleware for CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
