from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import repository, schemas
from ..database import get_db
from ..deps import get_current_user, require_admin

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


def _admin_view(db: Session, announcement) -> schemas.AnnouncementAdminOut:
    creator = repository.get_user(db, announcement.created_by) if announcement.created_by else None
    return schemas.AnnouncementAdminOut(
        id=announcement.id,
        title=announcement.title,
        body=announcement.body,
        level=announcement.level,
        created_at=announcement.created_at,
        created_by_name=creator.name if creator else None,
        read_count=repository.announcement_read_count(db, announcement.id),
        user_count=repository.count_users(db),
    )


@router.get("/latest", response_model=schemas.AnnouncementOut | None)
def latest_announcement(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """当前用户还没确认过的最新公告；没有就返回 null（前端据此决定要不要弹窗）。"""
    return repository.latest_unread_announcement(db, current_user.id)


@router.post("/{announcement_id}/read", status_code=204)
def mark_read(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not repository.get_announcement(db, announcement_id):
        raise HTTPException(status_code=404, detail="公告不存在")
    repository.mark_announcement_read(db, announcement_id, current_user.id)
    return Response(status_code=204)


@router.get("", response_model=list[schemas.AnnouncementAdminOut])
def list_announcements(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return [_admin_view(db, item) for item in repository.list_announcements(db)]


@router.post("", response_model=schemas.AnnouncementAdminOut, status_code=201)
def create_announcement(
    data: schemas.AnnouncementIn,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="请填写通知标题")
    announcement = repository.create_announcement(
        db,
        title=title,
        body=data.body.strip(),
        level=data.level,
        created_by=admin.id,
    )
    return _admin_view(db, announcement)


@router.delete("/{announcement_id}", status_code=204)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    announcement = repository.get_announcement(db, announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="公告不存在")
    repository.delete_announcement(db, announcement)
    return Response(status_code=204)
