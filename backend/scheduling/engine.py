"""Fill daily output first; use the geometric floor/facade route as a preference."""
from collections import Counter, defaultdict, deque
from datetime import date, timedelta
from fastapi import HTTPException
from .goal import as_goal, panel_area
from .order import ordered_panels
from .resources import validate_day, validate_resources


def installation_late(panel, fabrication_day):
    """True when a listed panel is fabricated on/after the Monday of its on-site installation week."""
    return bool(panel.get("week")) and fabrication_day >= panel["week"]


def phase_active(panels):
    return any(p.get("phase_order") is not None for p in panels.values())


def plan_order(panels):
    """With an installation list, only listed panels are fabricated: by installation week, then selection order."""
    if phase_active(panels):
        listed = [p for p in panels.values() if p.get("phase_order") is not None]
        return sorted(listed, key=lambda p: (p["week"], p["phase_order"]))
    return ordered_panels(panels)


def plan(panels, start, capacity, fixed=None, mold_copies=None):
    """Auto-plan Monday to Saturday up to the daily goal (panels or m²). Sundays are left for manual entries."""
    goal = as_goal(capacity)
    mold_copies = mold_copies or {}
    entries = list(fixed or [])
    validate_resources(panels, entries, start, goal, mold_copies)
    assigned = {entry["object_name"] for entry in entries}
    occupied = Counter((entry["date"], entry["molde"]) for entry in entries)
    counts = Counter(entry["date"] for entry in entries)
    areas = Counter()
    for entry in entries:
        areas[entry["date"]] += panel_area(panels, entry["object_name"])
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
            while not goal.full(counts[key], areas[key]):
                available = [queue[0] for mold, queue in queues.items()
                             if occupied[key, mold] < mold_copies.get(mold, 1)]
                if not available:
                    break
                panel = min(available, key=lambda item: rank[item["object_name"]])
                mold = panel["molde"]
                entries.append({"object_name": panel["object_name"], "molde": mold, "date": key})
                occupied[key, mold] += 1
                counts[key] += 1
                areas[key] += panel_area(panels, panel["object_name"])
                queues[mold].popleft()
                if not queues[mold]:
                    del queues[mold]
        day += timedelta(days=1)
    validate_resources(panels, entries, start, goal, mold_copies)
    return entries


def move(entries, panel, target, start, capacity, mold_copies=None, panels=None):
    """Move one panel to a day (Sundays included) while that day is still below the goal."""
    goal = as_goal(capacity)
    rest = [entry for entry in entries if entry["object_name"] != panel["object_name"]]
    if target is None:
        return rest
    validate_day(target, start)
    key = target.isoformat()
    same_day = [entry for entry in rest if entry["date"] == key]
    if sum(entry["molde"] == panel["molde"] for entry in same_day) >= (mold_copies or {}).get(panel["molde"], 1):
        raise HTTPException(409, f"El molde {panel['molde']} ya alcanzó su capacidad ese día.")
    day_area = sum(panel_area(panels or {}, entry["object_name"]) for entry in same_day)
    if goal.full(len(same_day), day_area):
        if goal.is_area:
            raise HTTPException(409, f"Ese día ya alcanzó el objetivo de {goal.area:g} m² ({day_area:.2f} m² programados).")
        raise HTTPException(409, f"Ese día ya tiene {goal.panels} paneles. Se ha alcanzado la capacidad diaria.")
    return rest + [{"object_name": panel["object_name"], "molde": panel["molde"], "date": key}]
