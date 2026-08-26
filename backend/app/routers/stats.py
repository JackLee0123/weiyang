from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview", response_model=schemas.StatsOverview)
def overview(start: str, end: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return repository.stats_overview(db, current_user.id, start, end)


@router.get("/heatmap", response_model=list[schemas.HeatmapDay])
def heatmap(start: str, end: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return repository.heatmap_points(db, current_user.id, start, end)
