from collections import Counter
from datetime import date, timedelta
from fastapi import HTTPException
from .goal import AREA_EPS, as_goal, panel_area

CAPACITY_STRATEGY = "daily_capacity_priority_v1"


def validate_day(value, start):
    """Any day from the start date is valid. Sundays are never auto-planned but can be filled by hand."""
    first = date.fromisoformat(start)
    if value < first:
        raise HTTPException(422, "La fecha no puede ser anterior al inicio del cronograma.")
    if value > first + timedelta(days=3650):
        raise HTTPException(422, "La fecha supera el horizonte de planificación de 10 años.")


def validate_resources(panels, entries, start, capacity, mold_copies=None):
    goal = as_goal(capacity)
    names = set()
    counts, areas, biggest, mold_counts = Counter(), Counter(), {}, Counter()
    mold_copies = mold_copies or {}
    for entry in entries:
        panel = panels.get(entry["object_name"])
        if not panel or panel["molde"] != entry["molde"]:
            raise HTTPException(409, "Una pieza ha cambiado de molde. Actualiza el cronograma.")
        if entry["object_name"] in names:
            raise HTTPException(409, "Un panel no puede programarse más de una vez.")
        try:
            day = date.fromisoformat(entry["date"])
        except (ValueError, TypeError):
            raise HTTPException(422, "El cronograma contiene una fecha no válida.")
        validate_day(day, start)
        key = day.isoformat()
        mold_key = (key, entry["molde"])
        mold_counts[mold_key] += 1
        if mold_counts[mold_key] > mold_copies.get(entry["molde"], 1):
            raise HTTPException(409, f"El molde {entry['molde']} ya alcanzó su capacidad ese día.")
        names.add(entry["object_name"])
        counts[key] += 1
        area = panel_area(panels, entry["object_name"])
        areas[key] += area
        biggest[key] = max(biggest.get(key, 0.0), area)
        if not goal.is_area and counts[key] > goal.panels:
            raise HTTPException(409, f"Ese día supera el objetivo de {goal.panels} paneles. Recalcula para aplicar la nueva cantidad.")
    if goal.is_area:
        # A day may overshoot the m² goal only through its last (largest) panel.
        for key in sorted(counts):
            if areas[key] - biggest[key] >= goal.area + AREA_EPS:
                raise HTTPException(409, f"El día {key} supera el objetivo de {goal.area:g} m². Recalcula para aplicar el nuevo objetivo.")
