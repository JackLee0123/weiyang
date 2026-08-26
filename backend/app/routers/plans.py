from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/api/plans", tags=["plans"])


@router.get("", response_model=list[schemas.PlanOut])
def list_plans(
    start: Optional[str] = None,
    end: Optional[str] = None,
    status: Optional[str] = Query(default=None),
    category: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.list_plans(db, current_user.id, start=start, end=end, status=status, category=category, q=q)


@router.post("", response_model=schemas.PlanOut, status_code=201)
def create_plan(data: schemas.PlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.date < repository.today_iso():
        raise HTTPException(status_code=403, detail="过去的日期已封存为永久回忆，无法添加计划")
    return repository.create_plan(db, current_user.id, data)


@router.get("/unfinished", response_model=list[schemas.PlanOut])
def list_unfinished_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """返回「未央」计划：今天及以前仍未完成（待办/进行中）的计划。"""
    return repository.list_unfinished_plans(db, current_user.id)


@router.get("/{plan_id}", response_model=schemas.PlanOut)
def get_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = repository.get_plan(db, current_user.id, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")
    return plan


@router.patch("/{plan_id}", response_model=schemas.PlanOut)
def update_plan(plan_id: int, data: schemas.PlanUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = repository.get_plan(db, current_user.id, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")
    effective_date = data.date if data.date is not None else plan.date
    if plan.date < repository.today_iso() or effective_date < repository.today_iso():
        raise HTTPException(status_code=403, detail="过去的日期已封存为永久回忆，无法修改计划")
    return repository.update_plan(db, plan, data)


@router.delete("/{plan_id}", status_code=204)
def delete_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = repository.get_plan(db, current_user.id, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")
    if plan.date < repository.today_iso():
        raise HTTPException(status_code=403, detail="过去的日期已封存为永久回忆，无法删除计划")
    repository.delete_plan(db, plan)
    return None
