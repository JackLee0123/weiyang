from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, repository, schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.post("/export")
def export_backup(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plans = repository.list_plans(db, current_user.id)
    records = repository.list_records(db, current_user.id)
    return {
        "version": 1,
        "exported_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "plans": [schemas.PlanOut.model_validate(p).model_dump(mode="json") for p in plans],
        "records": [schemas.RecordOut.model_validate(r).model_dump(mode="json") for r in records],
    }


@router.post("/import")
def import_backup(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if int(payload.get("version", 0)) != 1:
        raise HTTPException(status_code=400, detail="不支持的备份版本")
    plans = payload.get("plans") or []
    records = payload.get("records") or []
    if not isinstance(plans, list) or not isinstance(records, list):
        raise HTTPException(status_code=400, detail="备份文件格式错误")

    db.query(models.Record).filter(models.Record.user_id == current_user.id).delete()
    db.query(models.Plan).filter(models.Plan.user_id == current_user.id).delete()
    db.flush()

    for item in plans:
        plan = models.Plan(**{k: item.get(k) for k in ("date", "title", "description", "start_time", "end_time", "status", "priority", "category", "images")})
        plan.user_id = current_user.id
        plan.id = item.get("id")
        db.add(plan)
    db.flush()

    for item in records:
        record = models.Record(**{k: item.get(k) for k in ("date", "title", "content", "duration_minutes", "is_completed", "category", "images")})
        record.user_id = current_user.id
        record.id = item.get("id")
        linked = item.get("linked_plan_id")
        if linked:
            record.linked_plan_id = linked
        db.add(record)

    db.commit()
    return {"imported_plans": len(plans), "imported_records": len(records)}
