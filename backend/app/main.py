"""FastAPI application entry point for Virtual Lab AI Mentor & Report Services."""

import os
import time
from collections import defaultdict
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from dotenv import load_dotenv
    backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(backend_env):
        load_dotenv(backend_env)
    else:
        load_dotenv()
except ImportError:
    pass

from .schemas import HealthResponse, MentorRequest, MentorResponse, ReportRequest, ReportResponse
from .groq_service import get_groq_config, query_mentor, generate_report


app = FastAPI(
    title="Virtual Lab AI Services",
    description="Groq-powered pedagogical mentor and experiment report generator.",
    version="1.0.0",
)

# CORS configuration
allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:8000,http://localhost:8080,http://127.0.0.1:8000,http://127.0.0.1:8080,http://localhost:5173"
)
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Lightweight in-memory rate limiting (per IP, max 60 requests per 60 seconds)
RATE_LIMIT_WINDOW = 60.0
MAX_REQUESTS_PER_WINDOW = 60
_request_records: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    
    # Prune old timestamps
    timestamps = [t for t in _request_records[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(timestamps) >= MAX_REQUESTS_PER_WINDOW:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Request rate limit exceeded. Please wait a minute."},
        )
    
    timestamps.append(now)
    _request_records[client_ip] = timestamps
    return await call_next(request)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint exposing service status without sensitive secrets."""
    api_key, model = get_groq_config()
    return HealthResponse(
        status="ok",
        groq_configured=bool(api_key),
        model=model,
        version="1.0.0",
    )


@app.post("/api/mentor", response_model=MentorResponse)
async def mentor_endpoint(request: MentorRequest):
    """Contextual lab coach consultation."""
    try:
        response = await query_mentor(request)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mentor service encountered an unexpected error: {str(exc)}",
        )


@app.post("/api/report", response_model=ReportResponse)
async def report_endpoint(request: ReportRequest):
    """Generate structured experiment report based exclusively on simulator evidence."""
    try:
        response = await generate_report(request)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generator encountered an error: {str(exc)}",
        )


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=False)
