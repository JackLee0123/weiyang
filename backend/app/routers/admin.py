from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..database import get_db
from ..deps import require_admin
from ..services.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[schemas.AdminUserOut])
def list_users(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return repository.list_users(db)


@router.patch("/users/{user_id}", response_model=schemas.AdminUserOut)
def update_user(
    user_id: int,
    data: schemas.AdminUserUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    user = repository.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 自我保护：不允许取消自己的管理员权限或停用自己的账号。
    if user.id == admin.id and (data.is_admin is False or data.is_active is False):
        raise HTTPException(status_code=400, detail="不能停用或移除自己的管理员权限")

    if data.email and data.email.lower() != user.email.lower():
        existing = repository.get_user_by_email(db, data.email)
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="邮箱已被其他用户使用")

    fields = {}
    if data.name is not None:
        fields["name"] = data.name
    if data.email is not None:
        fields["email"] = data.email
    if data.is_admin is not None:
        fields["is_admin"] = data.is_admin
    if data.is_active is not None:
        fields["is_active"] = data.is_active
    if fields:
        repository.update_user(db, user, fields)

    if data.password:
        user.password_hash = hash_password(data.password)
        db.commit()
        db.refresh(user)
        repository.revoke_all_user_tokens(db, user.id)
    elif data.is_active is False:
        repository.revoke_all_user_tokens(db, user.id)

    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="不能删除自己的账号")
    user = repository.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    repository.delete_user(db, user)
