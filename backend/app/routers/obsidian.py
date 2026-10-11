"""Obsidian 笔记同步：插件用 API 密钥推送 Markdown，网页端按富文本展示。

两类认证：
- 插件接口（/api/obsidian/sync/*）用 X-Obsidian-Key（API 密钥，仅存哈希）
- 网页接口（/api/obsidian/notes*、settings）用网站登录会话（Bearer token）
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import ObsidianNote, ObsidianSettings, now_utc
from ..services.obsidian_sync import render_markdown
from ..services.security import hash_token, new_token

router = APIRouter(prefix="/api/obsidian", tags=["obsidian"])


def _normalize_root(root: str) -> str:
    root = (root or "").strip().strip("/")
    if root in (".", ".."):
        raise HTTPException(status_code=400, detail="同步根目录无效")
    return root


def _get_or_create_settings(db: Session, user_id: int) -> ObsidianSettings:
    row = db.scalar(select(ObsidianSettings).where(ObsidianSettings.user_id == user_id))
    if row is None:
        row = ObsidianSettings(user_id=user_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _user_by_api_key(db: Session, api_key: str):
    key_hash = hash_token(api_key)
    row = db.scalar(select(ObsidianSettings).where(ObsidianSettings.api_key_hash == key_hash))
    if not row:
        raise HTTPException(status_code=401, detail="API 密钥无效")
    return row


def _validate_path(path: str, root: str) -> str:
    p = path.replace("\\", "/").strip("/")
    if not p or p.startswith("../") or "/../" in p or p == "..":
        raise HTTPException(status_code=400, detail=f"路径无效: {path}")
    if not p.lower().endswith(".md"):
        raise HTTPException(status_code=400, detail=f"仅支持 Markdown 文件: {path}")
    if root and not (p == root or p.startswith(root + "/")):
        raise HTTPException(status_code=403, detail=f"路径不在同步根目录内: {path}")
    return p


def _title_of(path: str) -> str:
    name = path.rsplit("/", 1)[-1]
    return name[:-3] if name.lower().endswith(".md") else name


def _upsert_note(db: Session, user_id: int, path: str, content: str) -> str:
    """返回 updated / skipped。"""
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    note = db.scalar(
        select(ObsidianNote).where(ObsidianNote.user_id == user_id, ObsidianNote.path == path)
    )
    if note and note.content_hash == digest and not note.deleted:
        return "skipped"
    html = render_markdown(content)
    if note is None:
        note = ObsidianNote(user_id=user_id, path=path)
        db.add(note)
    note.title = _title_of(path)
    note.content_md = content
    note.content_html = html
    note.content_hash = digest
    note.deleted = False
    note.updated_at = now_utc()
    db.commit()
    return "updated"


# ---------------- 插件接口（API 密钥） ----------------

@router.post("/sync/note", response_model=schemas.ObsidianSyncResult)
def sync_note(
    data: schemas.ObsidianNoteUpsertIn,
    db: Session = Depends(get_db),
    x_obsidian_key: Optional[str] = Header(default=None),
):
    if not x_obsidian_key:
        raise HTTPException(status_code=401, detail="缺少 API 密钥")
    settings = _user_by_api_key(db, x_obsidian_key)
    path = _validate_path(data.path, settings.sync_root)
    status = _upsert_note(db, settings.user_id, path, data.content)
    return schemas.ObsidianSyncResult(ok=True, updated=1 if status == "updated" else 0, skipped=1 if status == "skipped" else 0)


@router.post("/sync/batch", response_model=schemas.ObsidianSyncResult)
def sync_batch(
    data: schemas.ObsidianNoteBatchIn,
    db: Session = Depends(get_db),
    x_obsidian_key: Optional[str] = Header(default=None),
):
    if not x_obsidian_key:
        raise HTTPException(status_code=401, detail="缺少 API 密钥")
    settings = _user_by_api_key(db, x_obsidian_key)
    updated = skipped = 0
    errors: list[str] = []
    for item in data.notes:
        try:
            path = _validate_path(item.path, settings.sync_root)
            if _upsert_note(db, settings.user_id, path, item.content) == "updated":
                updated += 1
            else:
                skipped += 1
        except HTTPException as exc:
            errors.append(f"{item.path}: {exc.detail}")
    return schemas.ObsidianSyncResult(ok=not errors, updated=updated, skipped=skipped, errors=errors)


@router.post("/sync/delete", response_model=schemas.ObsidianSyncResult)
def sync_delete(
    data: schemas.ObsidianNoteDeleteIn,
    db: Session = Depends(get_db),
    x_obsidian_key: Optional[str] = Header(default=None),
):
    if not x_obsidian_key:
        raise HTTPException(status_code=401, detail="缺少 API 密钥")
    settings = _user_by_api_key(db, x_obsidian_key)
    path = data.path.replace("\\", "/").strip("/")
    db.query(ObsidianNote).filter(
        ObsidianNote.user_id == settings.user_id, ObsidianNote.path == path
    ).update({"deleted": True, "updated_at": now_utc()})
    db.commit()
    return schemas.ObsidianSyncResult(ok=True)


@router.post("/sync/rename", response_model=schemas.ObsidianSyncResult)
def sync_rename(
    data: schemas.ObsidianNoteRenameIn,
    db: Session = Depends(get_db),
    x_obsidian_key: Optional[str] = Header(default=None),
):
    if not x_obsidian_key:
        raise HTTPException(status_code=401, detail="缺少 API 密钥")
    settings = _user_by_api_key(db, x_obsidian_key)
    old_path = data.old_path.replace("\\", "/").strip("/")
    new_path = _validate_path(data.new_path, settings.sync_root)
    note = db.scalar(
        select(ObsidianNote).where(
            ObsidianNote.user_id == settings.user_id, ObsidianNote.path == old_path
        )
    )
    if note:
        note.path = new_path
        note.title = _title_of(new_path)
        if data.content is not None:
            note.content_md = data.content
            note.content_html = render_markdown(data.content)
            note.content_hash = hashlib.sha256(data.content.encode("utf-8")).hexdigest()
        note.deleted = False
        note.updated_at = now_utc()
        db.commit()
    elif data.content is not None:
        _upsert_note(db, settings.user_id, new_path, data.content)
    return schemas.ObsidianSyncResult(ok=True)


@router.get("/sync/check", response_model=schemas.ObsidianSyncResult)
def sync_check(
    db: Session = Depends(get_db),
    x_obsidian_key: Optional[str] = Header(default=None),
):
    """插件自检：密钥是否有效。"""
    if not x_obsidian_key:
        raise HTTPException(status_code=401, detail="缺少 API 密钥")
    _user_by_api_key(db, x_obsidian_key)
    return schemas.ObsidianSyncResult(ok=True)


# ---------------- 网页接口（登录会话） ----------------

@router.get("/settings", response_model=schemas.ObsidianSettingsOut)
def get_settings(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = _get_or_create_settings(db, current_user.id)
    count = db.scalar(
        select(func.count(ObsidianNote.id)).where(
            ObsidianNote.user_id == current_user.id, ObsidianNote.deleted.is_(False)
        )
    ) or 0
    return schemas.ObsidianSettingsOut(
        has_api_key=bool(row.api_key_hash),
        api_key_created_at=row.api_key_created_at,
        sync_root=row.sync_root,
        note_count=count,
    )


@router.post("/settings/api-key", response_model=schemas.ObsidianApiKeyOut)
def regenerate_api_key(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = _get_or_create_settings(db, current_user.id)
    key = f"obsk_{new_token()}"
    row.api_key_hash = hash_token(key)
    row.api_key_created_at = now_utc()
    db.commit()
    return schemas.ObsidianApiKeyOut(api_key=key, created_at=row.api_key_created_at)


@router.put("/settings/root", response_model=schemas.ObsidianSettingsOut)
def set_sync_root(
    data: schemas.ObsidianSyncRootIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = _get_or_create_settings(db, current_user.id)
    row.sync_root = _normalize_root(data.sync_root)
    db.commit()
    return get_settings(db=db, current_user=current_user)


@router.get("/notes", response_model=list[schemas.ObsidianNoteListItem])
def list_notes(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows = db.scalars(
        select(ObsidianNote)
        .where(ObsidianNote.user_id == current_user.id, ObsidianNote.deleted.is_(False))
        .order_by(ObsidianNote.path)
    ).all()
    return rows


@router.get("/notes/content", response_model=schemas.ObsidianNoteOut)
def get_note(
    path: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    p = path.replace("\\", "/").strip("/")
    note = db.scalar(
        select(ObsidianNote).where(
            ObsidianNote.user_id == current_user.id,
            ObsidianNote.path == p,
            ObsidianNote.deleted.is_(False),
        )
    )
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在或尚未同步")
    return note
