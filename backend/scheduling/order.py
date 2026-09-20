"""Strict physical route: floor, clockwise facade, panel position along that facade."""
from fastapi import HTTPException


def ordered_panels(panels):
    return sorted(panels.values(), key=lambda p: p["sequence_index"])


def stage_label(panel):
    return f"{panel['floor_label']} · {panel['facade_label']}"


def order_conflict(panels, entries):
    dates = {entry["object_name"]: entry["date"] for entry in entries}
    previous = None
    for panel in ordered_panels(panels):
        day = dates.get(panel["object_name"])
        if day is None:
            continue
        if previous:
            prev, prev_day = previous
            if day < prev_day and panel["stage_index"] == prev["stage_index"]:
                return f"El recorrido horario exige programar {prev['code']} antes de {panel['code']} ({stage_label(panel)})."
            if day < prev_day or (panel["stage_index"] != prev["stage_index"] and day == prev_day):
                return f"El orden estricto exige terminar {stage_label(prev)} antes de {stage_label(panel)}. Recalcula el cronograma."
        previous = panel, day
    return None


def validate_order(panels, entries):
    conflict = order_conflict(panels, entries)
    if conflict:
        raise HTTPException(409, conflict)


def validate_move_order(panels, original, candidate, panel, target):
    if target is None:
        return
    dates = {entry["object_name"]: entry["date"] for entry in original}
    for previous in ordered_panels(panels):
        if previous["sequence_index"] >= panel["sequence_index"]:
            break
        if previous["object_name"] not in dates:
            raise HTTPException(409, f"Programa primero {previous['code']} ({stage_label(previous)}), pendiente en el recorrido.")
    validate_order(panels, candidate)