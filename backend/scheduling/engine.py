"""Calendar/resource scheduling with a strict, geometry-derived production sequence."""
from collections import Counter
from datetime import date, timedelta
from fastapi import HTTPException
from .order import ordered_panels, validate_order


def validate_day(value, start):
    if value < date.fromisoformat(start):
        raise HTTPException(422, "La fecha no puede ser anterior al inicio del cronograma.")
    if value.weekday() == 6:
        raise HTTPException(422, "Los domingos no se fabrica. Elige un día de lunes a sábado.")
    if value > date.fromisoformat(start) + timedelta(days=3650):
        raise HTTPException(422, "La fecha supera el horizonte de planificación de 10 años.")


def plan(panels, start, capacity, fixed=None):
    entries = list(fixed or [])
    validate_order(panels, entries)
    fixed_dates = {entry["object_name"]: entry["date"] for entry in entries}
    occupied = {(entry["date"], entry["molde"]) for entry in entries}
    counts = Counter(entry["date"] for entry in entries)
    stages = {entry["date"]: panels[entry["object_name"]]["stage_index"] for entry in entries}
    for entry in entries:
        validate_day(date.fromisoformat(entry["date"]), start)
    if len(occupied) != len(entries) or any(count > capacity for count in counts.values()):
        raise HTTPException(409, "Las fechas fijas exceden la capacidad del molde o del día. Recalcula el cronograma.")
    day = date.fromisoformat(start)
    limit = day + timedelta(days=3650)
    previous_stage = None
    for panel in ordered_panels(panels):
        stage = panel["stage_index"]
        if previous_stage is not None and stage != previous_stage:
            day += timedelta(days=1)
        while day.weekday() == 6:
            day += timedelta(days=1)
        fixed_day = fixed_dates.get(panel["object_name"])
        if fixed_day:
            if fixed_day < day.isoformat():
                raise HTTPException(409, "Los pendientes no caben antes de las fechas ya fijadas sin romper el orden estricto. Recalcula el cronograma con confirmación.")
            day = date.fromisoformat(fixed_day)
        else:
            while day <= limit:
                key = day.isoformat()
                if day.weekday() != 6 and counts[key] < capacity and (key, panel["molde"]) not in occupied and stages.get(key, stage) == stage:
                    break
                day += timedelta(days=1)
            if day > limit:
                raise HTTPException(422, "La producción supera el horizonte de 10 años.")
            key = day.isoformat()
            entries.append({"object_name": panel["object_name"], "molde": panel["molde"], "date": key})
            occupied.add((key, panel["molde"]))
            counts[key] += 1
            stages[key] = stage
        previous_stage = stage
    validate_order(panels, entries)
    return entries


def move(entries, panel, target, start, capacity):
    rest = [entry for entry in entries if entry["object_name"] != panel["object_name"]]
    if target is None:
        return rest
    validate_day(target, start)
    key = target.isoformat()
    same_day = [entry for entry in rest if entry["date"] == key]
    if any(entry["molde"] == panel["molde"] for entry in same_day):
        raise HTTPException(409, f"El molde {panel['molde']} ya tiene un panel ese día. Solo se permite uno por molde y día.")
    if len(same_day) >= capacity:
        raise HTTPException(409, f"Ese día ya tiene {capacity} paneles. Se ha alcanzado la capacidad diaria.")
    return rest + [{"object_name": panel["object_name"], "molde": panel["molde"], "date": key}]