from collections import Counter
from datetime import date, timedelta
from fastapi import HTTPException

CAPACITY_STRATEGY = "daily_capacity_priority_v1"


def validate_day(value, start):
    first = date.fromisoformat(start)
    if value < first:
        raise HTTPException(422, "La fecha no puede ser anterior al inicio del cronograma.")
    if value.weekday() == 6:
        raise HTTPException(422, "Los domingos no se fabrica. Elige un día de lunes a sábado.")
    if value > first + timedelta(days=3650):
        raise HTTPException(422, "La fecha supera el horizonte de planificación de 10 años.")


def validate_resources(panels, entries, start, capacity, mold_copies=None):
    names = set()
    counts, mold_counts = Counter(), Counter()
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
        if counts[key] > capacity:
            raise HTTPException(409, f"Ese día supera el objetivo de {capacity} paneles. Recalcula para aplicar la nueva cantidad.")