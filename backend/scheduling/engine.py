"""Fill daily output first; use the geometric floor/facade route as a preference."""
from collections import Counter, defaultdict, deque
from datetime import date, timedelta
from fastapi import HTTPException
from .order import ordered_panels
from .resources import validate_day, validate_resources


def plan(panels, start, capacity, fixed=None):
    entries = list(fixed or [])
    validate_resources(panels, entries, start, capacity)
    assigned = {entry["object_name"] for entry in entries}
    occupied = {(entry["date"], entry["molde"]) for entry in entries}
    counts = Counter(entry["date"] for entry in entries)
    queues = defaultdict(deque)
    for panel in ordered_panels(panels):
        if panel["object_name"] not in assigned:
            queues[panel["molde"]].append(panel)
    day = date.fromisoformat(start)
    limit = day + timedelta(days=3650)
    while queues:
        if day > limit:
            raise HTTPException(422, "La producción supera el horizonte de 10 años.")
        if day.weekday() != 6:
            key = day.isoformat()
            free_slots = max(0, capacity - counts[key])
            available = [queue[0] for mold, queue in queues.items() if (key, mold) not in occupied]
            # Every chosen panel uses a different mold. Never stop at a blocked facade/floor.
            candidates = sorted(available, key=lambda panel: (panel["sequence_index"], panel["object_name"]))[:free_slots]
            for panel in candidates:
                mold = panel["molde"]
                entries.append({"object_name": panel["object_name"], "molde": mold, "date": key})
                occupied.add((key, mold))
                counts[key] += 1
                queues[mold].popleft()
                if not queues[mold]:
                    del queues[mold]
        day += timedelta(days=1)
    validate_resources(panels, entries, start, capacity)
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