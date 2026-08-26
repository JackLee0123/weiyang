from fastapi import APIRouter

from ..schemas import HealthOut

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthOut)
def health_check() -> HealthOut:
    return HealthOut(status="ok", version="0.4.0")
