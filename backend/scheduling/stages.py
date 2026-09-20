from collections import defaultdict


def stage_summaries(panels, entries):
    dates = {entry["object_name"]: entry["date"] for entry in entries}
    groups = defaultdict(list)
    for panel in panels.values():
        groups[panel["stage_index"]].append(panel)
    result = []
    for index, group in sorted(groups.items()):
        sample = group[0]
        days = [dates[p["object_name"]] for p in group if p["object_name"] in dates]
        result.append({"index": index, "floor_index": sample["floor_index"],
                       "floor_label": sample["floor_label"], "facade": sample["facade"],
                       "facade_label": sample["facade_label"], "total": len(group),
                       "scheduled": len(days), "first_date": min(days) if days else None,
                       "finish_date": max(days) if days else None})
    return result