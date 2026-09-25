"""Fabrication phases: panels grouped by front and calendar week, kept in selection order."""
import uuid
from datetime import date as CalendarDate, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

FRONT_COLORS = ["#E4572E", "#17BEBB", "#FFC914", "#76B041", "#8E44AD", "#2E86DE", "#D35400", "#C2185B"]


def monday(value: CalendarDate) -> CalendarDate:
    return value - timedelta(days=value.weekday())


class FrontRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=60)


class AssignRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    object_names: list[str] = Field(min_length=1)
    front_id: str
    week: CalendarDate


class MoveWeekRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    front_id: str
    week: CalendarDate
    new_week: CalendarDate


class UnassignRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    object_names: list[str] = Field(min_length=1)


class PhaseStore:
    def __init__(self, db):
        self.collection = db.fabrication_phases

    async def read(self):
        doc = await self.collection.find_one({"_id": "plan"}, {"_id": 0}) or {}
        return {"fronts": doc.get("fronts", []), "items": doc.get("items", [])}

    async def write(self, plan):
        await self.collection.update_one({"_id": "plan"}, {"$set": plan}, upsert=True)
        return plan

    async def by_panel(self):
        """{object_name: {order, week, front, front_color}} for the schedule."""
        plan = await self.read()
        fronts = {f["id"]: f for f in plan["fronts"]}
        return {item["object_name"]: {"phase_order": i, "week": item["week"],
                                      "front": fronts[item["front_id"]]["name"],
                                      "front_color": fronts[item["front_id"]]["color"]}
                for i, item in enumerate(plan["items"]) if item["front_id"] in fronts}


def create_phase_router(store, valid_names, require_admin):
    router = APIRouter(prefix="/phases", tags=["Fases"])

    @router.get("")
    async def get_phases():
        return await store.read()

    @router.patch("/week")
    async def move_week(payload: MoveWeekRequest, _admin=Depends(require_admin)):
        week = monday(payload.week).isoformat()
        new_week = monday(payload.new_week).isoformat()
        plan = await store.read()
        source = {"front_id": payload.front_id, "week": week}
        destination = {"front_id": payload.front_id, "week": new_week}
        if not any(all(i[k] == v for k, v in source.items()) for i in plan["items"]):
            raise HTTPException(404, "La semana ya no existe. Actualiza el plan.")
        if week == new_week:
            return plan
        # Move only this front/week, preserving panel order and all other assignments.
        # Reject occupied destinations rather than silently merging two groups.
        result = await store.collection.update_one(
            {"_id": "plan", "$and": [
                {"items": {"$elemMatch": source}},
                {"items": {"$not": {"$elemMatch": destination}}},
            ]},
            {"$set": {"items.$[item].week": new_week}},
            array_filters=[{"item.front_id": payload.front_id, "item.week": week}],
        )
        if not result.modified_count:
            raise HTTPException(409, "La semana destino está ocupada en este frente o el plan cambió. Actualiza e intenta otra fecha.")
        return await store.read()

    @router.post("/fronts")
    async def create_front(payload: FrontRequest, _admin=Depends(require_admin)):
        plan = await store.read()
        name = payload.name.strip()
        if any(f["name"].lower() == name.lower() for f in plan["fronts"]):
            raise HTTPException(409, "Ya existe un frente con ese nombre.")
        color = FRONT_COLORS[len(plan["fronts"]) % len(FRONT_COLORS)]
        plan["fronts"].append({"id": uuid.uuid4().hex[:8], "name": name, "color": color})
        return await store.write(plan)

    @router.delete("/fronts/{front_id}")
    async def delete_front(front_id: str, _admin=Depends(require_admin)):
        plan = await store.read()
        plan["fronts"] = [f for f in plan["fronts"] if f["id"] != front_id]
        plan["items"] = [i for i in plan["items"] if i["front_id"] != front_id]
        return await store.write(plan)

    @router.post("/assign")
    async def assign(payload: AssignRequest, _admin=Depends(require_admin)):
        plan = await store.read()
        if not any(f["id"] == payload.front_id for f in plan["fronts"]):
            raise HTTPException(404, "Frente no encontrado.")
        names = list(dict.fromkeys(n for n in payload.object_names if n in valid_names()))
        if not names:
            raise HTTPException(422, "Ninguna de las piezas seleccionadas es un panel de fachada.")
        week = monday(payload.week).isoformat()
        # Re-selecting a panel moves it to the end of the list (latest selection order).
        plan["items"] = [i for i in plan["items"] if i["object_name"] not in names]
        plan["items"] += [{"object_name": n, "front_id": payload.front_id, "week": week} for n in names]
        return await store.write(plan)

    @router.post("/unassign")
    async def unassign(payload: UnassignRequest, _admin=Depends(require_admin)):
        plan = await store.read()
        drop = set(payload.object_names)
        plan["items"] = [i for i in plan["items"] if i["object_name"] not in drop]
        return await store.write(plan)

    return router
