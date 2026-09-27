from fastapi import APIRouter

from ..config import APP_VERSION
from ..schemas import HealthOut

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthOut)
def health_check() -> HealthOut:
    return HealthOut(status="ok", version=APP_VERSION)
