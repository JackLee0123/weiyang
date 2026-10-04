from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..database import get_db
from ..deps import require_admin
from ..services import schedule_import
from ..services.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])

# 批量导入的限制：文件大小、导入对象数量、单次生成的计划总数（行数 × 人数）。
MAX_SCHEDULE_FILE_BYTES = 5 * 1024 * 1024
MAX_IMPORT_TARGETS = 200
MAX_IMPORT_PLANS = 20000


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


@router.post("/schedule/preview", response_model=schemas.AdminSchedulePreviewOut)
async def preview_schedule_import(file: UploadFile = File(...), _admin=Depends(require_admin)):
    """解析上传的 .xlsx 日程表，返回预览（不写入数据库）。"""
    filename = (file.filename or "").lower()
    if not filename.endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="请上传 .xlsx 格式的日程表")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="上传的文件是空的")
    if len(data) > MAX_SCHEDULE_FILE_BYTES:
        raise HTTPException(status_code=400, detail="文件太大了，请控制在 5 MB 以内")
    try:
        parsed = schedule_import.parse_schedule_excel(data)
    except schedule_import.ScheduleImportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return schemas.AdminSchedulePreviewOut(**parsed)


@router.get("/schedule/template")
def download_schedule_template(_admin=Depends(require_admin)):
    """下载一份可直接填写的日程导入模板。"""
    content = schedule_import.build_template_workbook()
    filename = quote("日程导入模板.xlsx")
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=schedule-template.xlsx; filename*=UTF-8''{filename}"},
    )


def _resolve_targets(db: Session, admin, data: schemas.AdminScheduleImportIn) -> list[int]:
    targets: list[int] = []
    if data.all_users:
        targets.extend(user.id for user in repository.list_users(db) if user.is_active)
    else:
        for user_id in data.user_ids:
            if repository.get_user(db, user_id) is None:
                raise HTTPException(status_code=400, detail=f"用户 {user_id} 不存在")
            targets.append(user_id)
    if data.include_self:
        targets.append(admin.id)

    unique: list[int] = []
    for user_id in targets:
        if user_id not in unique:
            unique.append(user_id)
    return unique


@router.post("/schedule/import", response_model=schemas.AdminScheduleImportOut)
def import_schedule(
    data: schemas.AdminScheduleImportIn,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """把预览通过的日程批量写入自己 / 指定用户 / 全部用户的日程。"""
    targets = _resolve_targets(db, admin, data)
    if not targets:
        raise HTTPException(status_code=400, detail="请至少选择一个导入对象（你自己或指定用户）")
    if len(targets) > MAX_IMPORT_TARGETS:
        raise HTTPException(status_code=400, detail=f"单次最多导入给 {MAX_IMPORT_TARGETS} 个用户，请分批进行")
    if len(data.rows) * len(targets) > MAX_IMPORT_PLANS:
        raise HTTPException(status_code=400, detail="单次生成的日程条数过多，请减少行数或分批导入")

    result = repository.bulk_create_plans(
        db,
        targets,
        [row.model_dump() for row in data.rows],
        skip_duplicates=data.skip_duplicates,
    )
    return schemas.AdminScheduleImportOut(**result)


@router.post("/schedule/rollback", response_model=schemas.AdminScheduleRollbackOut)
def rollback_schedule_import(
    data: schemas.AdminScheduleRollbackIn,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """撤销上一次批量导入（只删除由导入生成的日程）。"""
    deleted = repository.delete_imported_plans(db, data.plan_ids)
    return schemas.AdminScheduleRollbackOut(deleted=deleted)
