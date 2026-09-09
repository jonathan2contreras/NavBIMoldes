"""Persistent project panel target, separate from the physical model inventory."""
import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field


class ProjectPanelsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    total_panels: int = Field(strict=True, ge=0, le=2147483647)


class ProjectPanelsResponse(BaseModel):
    total_panels: int
    model_panels: int
    assigned_panels: int
    pending_panels: int
    is_manual: bool
    updated_at: Optional[str] = None


class ProjectPanelsService:
    def __init__(self, db, facade_names, fetch_tags):
        self.collection = db.project_settings
        self.facade_names = facade_names
        self.fetch_tags = fetch_tags
        # Serialize target changes and assignment increases in this server process.
        self.write_lock = asyncio.Lock()

    async def read(self, tags=None) -> ProjectPanelsResponse:
        if tags is None:
            tags = await self.fetch_tags()
        names = self.facade_names()
        assigned = sum(1 for name in names if tags.get(name) and tags[name].molde)
        record = await self.collection.find_one({"_id": "panel_total"}, {"_id": 0})
        total = record["total_panels"] if record else len(names)
        return ProjectPanelsResponse(
            total_panels=total, model_panels=len(names), assigned_panels=assigned,
            pending_panels=total - assigned, is_manual=record is not None,
            updated_at=record.get("updated_at") if record else None,
        )

    async def save(self, payload: ProjectPanelsUpdate) -> ProjectPanelsResponse:
        async with self.write_lock:
            current = await self.read()
            if payload.total_panels < current.assigned_panels:
                raise HTTPException(status_code=422, detail=(
                    f"El total no puede ser inferior a los {current.assigned_panels} paneles ya asignados."
                ))
            updated_at = datetime.now(timezone.utc).isoformat()
            await self.collection.update_one(
                {"_id": "panel_total"},
                {"$set": {"total_panels": payload.total_panels, "updated_at": updated_at}},
                upsert=True,
            )
            return current.model_copy(update={
                "total_panels": payload.total_panels,
                "pending_panels": payload.total_panels - current.assigned_panels,
                "is_manual": True, "updated_at": updated_at,
            })

    async def check_assignment(self, names, molde):
        if not (molde or "").strip():
            return
        tags = await self.fetch_tags()
        current = await self.read(tags)
        if not current.is_manual:
            return
        additional = sum(1 for name in set(names) & self.facade_names()
                         if not tags.get(name) or not tags[name].molde)
        if current.assigned_panels + additional > current.total_panels:
            raise HTTPException(status_code=409, detail=(
                f"La asignación supera el total del proyecto ({current.total_panels}). "
                "Aumenta el total de paneles antes de asignar más piezas."
            ))