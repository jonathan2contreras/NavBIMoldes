from collections import Counter
from datetime import date, datetime, timedelta, timezone
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError
from .engine import plan, move
from .models import ScheduleResponse
from .resources import CAPACITY_STRATEGY, validate_resources
from .productivity import production_summary
from .stages import stage_summaries


class ScheduleService:
    def __init__(self, db, source):
        self.collection = db.production_schedules
        self.source = source

    async def snapshot(self):
        source = await self.source()
        record = await self.collection.find_one({"_id": "production"}, {"_id": 0})
        if record is None:
            start = date(datetime.now(timezone.utc).year, 11, 1).isoformat()
            record = {"start_date": start, "daily_capacity": 5, "revision": 0,
                      "strategy": CAPACITY_STRATEGY, "entries": plan(source["panels"], start, 5)}
        entries = [e for e in record["entries"] if e["object_name"] in source["panels"]
                   and source["panels"][e["object_name"]]["molde"] == e["molde"]]
        return source, record, entries

    def response(self, source, record, entries):
        dates = {e["object_name"]: e["date"] for e in entries}
        totals = Counter(p["molde"] for p in source["panels"].values())
        scheduled = Counter(e["molde"] for e in entries)
        first = min(dates.values()) if dates else None
        finish = max(dates.values()) if dates else None
        span = 0
        if finish:
            day, last = date.fromisoformat(record["start_date"]), date.fromisoformat(finish)
            while day <= last:
                span += day.weekday() != 6
                day += timedelta(days=1)
        strategy = record.get("strategy", "legacy_capacity")
        conflict = None
        try:
            validate_resources(source["panels"], entries, record["start_date"], record["daily_capacity"])
        except HTTPException as error:
            conflict = str(error.detail)
        legacy = record["revision"] > 0 and strategy != CAPACITY_STRATEGY
        warning = "El cronograma guardado usa una planificación anterior. Aplica la prioridad de cantidad diaria para completar cada jornada con moldes distintos." if legacy else conflict
        return ScheduleResponse(
            start_date=record["start_date"], daily_capacity=record["daily_capacity"],
            revision=record["revision"], saved=record["revision"] > 0,
            updated_at=record.get("updated_at"),
            panels=[{**p, "date": dates.get(p["object_name"])} for p in sorted(source["panels"].values(), key=lambda p: p["sequence_index"])],
            molds=[{**m, "total": totals[m["name"]], "scheduled": scheduled[m["name"]]}
                   for m in sorted(source["molds"], key=lambda m: m["name"])],
            total_project=source["total"], schedulable=len(source["panels"]), scheduled=len(entries),
            unscheduled=len(source["panels"]) - len(entries),
            awaiting_mold=max(0, source["total"] - source["eligible_count"]),
            stale_entries=len(record["entries"]) - len(entries), first_date=first,
            finish_date=finish, working_day_span=span,
            strategy=strategy, needs_replan=legacy or bool(conflict), order_warning=warning,
            floors=source["floors"], stages=stage_summaries(source["panels"], entries),
            awaiting_location=source["awaiting_location"],
            **production_summary(source["panels"], entries, record["start_date"], record["daily_capacity"]),
        )

    def ensure_located(self, source):
        if source["awaiting_location"]:
            raise HTTPException(422, "Hay piezas con molde sin planta o fachada identificable en el modelo. Revisa su localización antes de guardar.")

    def ensure_current(self, source, record, entries):
        self.ensure_located(source)
        if record.get("strategy") != CAPACITY_STRATEGY:
            raise HTTPException(409, "Primero aplica la prioridad de cantidad diaria con confirmación. Las fechas guardadas no se han cambiado.")
        validate_resources(source["panels"], entries, record["start_date"], record["daily_capacity"])

    async def get(self):
        return self.response(*(await self.snapshot()))

    async def write(self, source, record, entries, expected):
        if record["revision"] != expected:
            raise HTTPException(409, "El cronograma cambió en otra sesión. Actualiza antes de guardar.")
        self.ensure_located(source)
        validate_resources(source["panels"], entries, record["start_date"], record["daily_capacity"])
        body = {"start_date": record["start_date"], "daily_capacity": record["daily_capacity"], "strategy": CAPACITY_STRATEGY,
                "revision": expected + 1, "entries": entries,
                "updated_at": datetime.now(timezone.utc).isoformat()}
        if expected == 0:
            try:
                await self.collection.insert_one({"_id": "production", **body})
            except DuplicateKeyError:
                raise HTTPException(409, "El cronograma ya se guardó en otra sesión. Actualiza antes de continuar.")
        else:
            result = await self.collection.update_one({"_id": "production", "revision": expected}, {"$set": body})
            if result.matched_count != 1:
                raise HTTPException(409, "El cronograma cambió en otra sesión. Actualiza antes de guardar.")
        return self.response(source, body, entries)

    async def generate(self, payload):
        source, record, _ = await self.snapshot()
        self.ensure_located(source)
        record = {**record, "start_date": payload.start_date.isoformat(), "daily_capacity": payload.daily_capacity}
        entries = plan(source["panels"], record["start_date"], record["daily_capacity"])
        return await self.write(source, record, entries, payload.revision)

    async def save(self, payload, fill=False):
        source, record, entries = await self.snapshot()
        self.ensure_current(source, record, entries)
        if fill:
            entries = plan(source["panels"], record["start_date"], record["daily_capacity"], entries)
        return await self.write(source, record, entries, payload.revision)

    async def move_panel(self, payload):
        source, record, entries = await self.snapshot()
        self.ensure_current(source, record, entries)
        panel = source["panels"].get(payload.object_name)
        if not panel:
            raise HTTPException(422, "Esta pieza no tiene un molde válido asignado. Actualiza el cronograma.")
        candidate = move(entries, panel, payload.date, record["start_date"], record["daily_capacity"])
        return await self.write(source, record, candidate, payload.revision)