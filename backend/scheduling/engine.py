"""Daily resource-constrained scheduling using heapq and calendar dates (no times/timezones)."""
import heapq
from collections import Counter, defaultdict, deque
from datetime import date, timedelta
from fastapi import HTTPException


def validate_day(value, start):
    if value < date.fromisoformat(start):
        raise HTTPException(422, "La fecha no puede ser anterior al inicio del cronograma.")
    if value.weekday() == 6:
        raise HTTPException(422, "Los domingos no se fabrica. Elige un día de lunes a sábado.")
    if value > date.fromisoformat(start) + timedelta(days=3650):
        raise HTTPException(422, "La fecha supera el horizonte de planificación de 10 años.")


def plan(panels, start, capacity, fixed=None):
    """Keep fixed dates intact; prioritize molds with the longest remaining queues."""
    entries = list(fixed or [])
    scheduled = {e["object_name"] for e in entries}
    occupied = {(e["date"], e["molde"]) for e in entries}
    counts = Counter(e["date"] for e in entries)
    queues = defaultdict(deque)
    for name, panel in sorted(panels.items()):
        if name not in scheduled:
            queues[panel["molde"]].append(name)
    heap = [(-len(q), mold) for mold, q in queues.items() if q]
    heapq.heapify(heap)
    day = date.fromisoformat(start)
    limit = day + timedelta(days=3650)
    while heap:
        if day > limit:
            raise HTTPException(422, "La producción supera 10 años. Aumenta la capacidad diaria.")
        if day.weekday() != 6:
            key, used = day.isoformat(), []
            remaining = capacity - counts[key]
            while heap and remaining > 0:
                _, mold = heapq.heappop(heap)
                if (key, mold) not in occupied:
                    name = queues[mold].popleft()
                    entries.append({"object_name": name, "molde": mold, "date": key})
                    occupied.add((key, mold))
                    remaining -= 1
                if queues[mold]:
                    used.append((-len(queues[mold]), mold))
            for item in used:
                heapq.heappush(heap, item)
        day += timedelta(days=1)
    return entries


def move(entries, panel, target, start, capacity):
    rest = [e for e in entries if e["object_name"] != panel["object_name"]]
    if target is None:
        return rest
    validate_day(target, start)
    key = target.isoformat()
    same_day = [e for e in rest if e["date"] == key]
    if any(e["molde"] == panel["molde"] for e in same_day):
        raise HTTPException(409, f"El molde {panel['molde']} ya tiene un panel ese día. Solo se permite uno por molde y día.")
    if len(same_day) >= capacity:
        raise HTTPException(409, f"Ese día ya tiene {capacity} paneles. Se ha alcanzado la capacidad diaria.")
    return rest + [{"object_name": panel["object_name"], "molde": panel["molde"], "date": key}]