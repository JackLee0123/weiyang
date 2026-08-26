from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/memory", response_model=schemas.MemoryReport)
def memory_report(
    start: str,
    end: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.memory_report(db, current_user.id, start, end)
