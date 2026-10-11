from collections import Counter, defaultdict
from datetime import date, timedelta
from .goal import as_goal, panel_area


def production_summary(panels, entries, start, capacity, mold_copies=None):
    goal = as_goal(capacity)
    mold_copies = mold_copies or {}
    remaining = Counter(panel["molde"] for panel in panels.values())
    by_day = defaultdict(list)
    for entry in entries:
        by_day[entry["date"]].append(entry)
    days = []
    first = date.fromisoformat(start)
    last = date.fromisoformat(max(by_day)) if by_day else first
    day = first
    while day <= last:
        key = day.isoformat()
        scheduled = len(by_day[key])
        area = round(sum(panel_area(panels, e["object_name"]) for e in by_day[key]), 2)
        molds = sum(min(count, mold_copies.get(mold, 1)) for mold, count in remaining.items())
        sunday = day.weekday() == 6
        target = 0 if sunday or goal.is_area else goal.panels
        target_area = None if sunday or not goal.is_area else goal.area
        full = goal.full(scheduled, area)
        if sunday and scheduled:
            status, explanation = "sunday_manual", f"Domingo con fabricación manual: {scheduled} {'panel' if scheduled == 1 else 'paneles'}."
        elif sunday:
            status, explanation = "rest", "Domingo no laborable. Puedes programar paneles a mano."
        elif full:
            status, explanation = "full", "Objetivo diario completo."
        elif not sum(remaining.values()):
            status, explanation = "complete", "No quedan paneles con molde pendientes de fabricar."
        elif scheduled < (molds if goal.is_area else min(goal.panels, molds)):
            status, explanation = "manual_gap", "Hay huecos por fechas fijadas o paneles sin programar. Recalcular puede completar esta jornada."
        else:
            status = "mold_limit"
            explanation = (f"Solo quedan {molds} moldes disponibles con paneles pendientes. Máximo {molds} paneles hoy según las copias por molde."
                           if mold_copies else f"Solo quedan {molds} moldes distintos con paneles pendientes. Máximo {molds} paneles hoy: uno por molde.")
        if sunday:
            shortfall, shortfall_area = 0, 0.0
        elif goal.is_area:
            shortfall_area = round(max(0.0, goal.area - area), 2)
            shortfall = 0 if full else 1
        else:
            shortfall, shortfall_area = max(0, target - scheduled), 0.0
        days.append({"date": key, "scheduled": scheduled, "target": target,
                     "scheduled_area": area, "target_area": target_area, "shortfall_area": shortfall_area,
                     "available_molds": molds, "remaining_panels": sum(remaining.values()),
                     "shortfall": shortfall, "status": status, "explanation": explanation})
        for entry in by_day[key]:
            remaining[entry["molde"]] = max(0, remaining[entry["molde"]] - 1)
        day += timedelta(days=1)
    total_molds = Counter(panel["molde"] for panel in panels.values())
    limiting = sorted(total_molds, key=lambda name: (-total_molds[name], name))
    return {
        "production_days": days,
        "full_capacity_days": sum(d["status"] == "full" for d in days),
        "limited_capacity_days": sum(d["status"] == "mold_limit" for d in days),
        "manual_gap_days": sum(d["status"] == "manual_gap" for d in days),
        "bottleneck_mold": limiting[0] if limiting else None,
        "bottleneck_panels": total_molds[limiting[0]] if limiting else 0,
    }
