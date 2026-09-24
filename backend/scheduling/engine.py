"""Fill daily output first; use the geometric floor/facade route as a preference."""
from collections import Counter, defaultdict, deque
from datetime import date, timedelta
from fastapi import HTTPException
from .order import ordered_panels
from .resources import validate_day, validate_resources


def week_window(panel):
    """Mandatory Mon–Sat window of a phased panel, or None when it has no phase."""
    if not panel.get("week"):
        return None
    first = date.fromisoformat(panel["week"])
    return first, first + timedelta(days=5)


def phase_active(panels):
    return any(p.get("phase_order") is not None for p in panels.values())


def plan_order(panels):
    """With a fabrication list, only listed panels are planned: by week, then selection order."""
    if phase_active(panels):
        listed = [p for p in panels.values() if p.get("phase_order") is not None]
        return sorted(listed, key=lambda p: (p["week"], p["phase_order"]))
    return ordered_panels(panels)


def validate_week(panel, target):
    window = week_window(panel)
    if window and not window[0] <= target <= window[1]:
        raise HTTPException(409, f"{panel['code']} pertenece a la semana del {window[0].strftime('%d/%m')} al {window[1].strftime('%d/%m')} ({panel['front']}).")


def plan(panels, start, capacity, fixed=None):
    entries = list(fixed or [])
    validate_resources(panels, entries, start, capacity)
    assigned = {entry["object_name"] for entry in entries}
    occupied = {(entry["date"], entry["molde"]) for entry in entries}
    counts = Counter(entry["date"] for entry in entries)
    queues = defaultdict(deque)
    rank = {}
    for panel in plan_order(panels):
        rank[panel["object_name"]] = len(rank)
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
            for mold in list(queues):
                # A phased panel whose week already ended stays pending instead of leaving its week.
                while queues[mold] and week_window(queues[mold][0]) and week_window(queues[mold][0])[1] < day:
                    queues[mold].popleft()
                if not queues[mold]:
                    del queues[mold]
            available = [queue[0] for mold, queue in queues.items() if (key, mold) not in occupied
                         and not (week_window(queue[0]) and week_window(queue[0])[0] > day)]
            # Every chosen panel uses a different mold. Never stop at a blocked facade/floor.
            candidates = sorted(available, key=lambda panel: rank[panel["object_name"]])[:free_slots]
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
    validate_week(panel, target)
    key = target.isoformat()
    same_day = [entry for entry in rest if entry["date"] == key]
    if any(entry["molde"] == panel["molde"] for entry in same_day):
        raise HTTPException(409, f"El molde {panel['molde']} ya tiene un panel ese día. Solo se permite uno por molde y día.")
    if len(same_day) >= capacity:
        raise HTTPException(409, f"Ese día ya tiene {capacity} paneles. Se ha alcanzado la capacidad diaria.")
    return rest + [{"object_name": panel["object_name"], "molde": panel["molde"], "date": key}]