from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/api/records", tags=["records"])


@router.get("", response_model=list[schemas.RecordOut])
def list_records(
    start: Optional[str] = None,
    end: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.list_records(db, current_user.id, start=start, end=end, category=category, q=q)


@router.post("", response_model=schemas.RecordOut, status_code=201)
def create_record(data: schemas.RecordCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.linked_plan_id and not repository.get_plan(db, current_user.id, data.linked_plan_id):
        raise HTTPException(status_code=404, detail="关联的计划不存在")
    if data.date < repository.today_iso():
        raise HTTPException(status_code=403, detail="过去的日期已封存为永久回忆，无法添加记录")
    return repository.create_record(db, current_user.id, data)


@router.get("/{record_id}", response_model=schemas.RecordOut)
def get_record(record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = repository.get_record(db, current_user.id, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.patch("/{record_id}", response_model=schemas.RecordOut)
def update_record(record_id: int, data: schemas.RecordUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = repository.get_record(db, current_user.id, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    effective_date = data.date if data.date is not None else record.date
    if record.date < repository.today_iso() or effective_date < repository.today_iso():
        raise HTTPException(status_code=403, detail="过去的日期已封存为永久回忆，无法修改记录")
    return repository.update_record(db, record, data)


@router.delete("/{record_id}", status_code=204)
def delete_record(record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = repository.get_record(db, current_user.id, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    if record.date < repository.today_iso():
        raise HTTPException(status_code=403, detail="过去的日期已封存为永久回忆，无法删除记录")
    repository.delete_record(db, record)
    return None
