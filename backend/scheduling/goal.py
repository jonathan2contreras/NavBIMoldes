"""Daily production goal: a number of panels per day, or square meters per day."""
from dataclasses import dataclass

AREA_EPS = 1e-9
PANELS, AREA = "panels", "m2"


@dataclass(frozen=True)
class Goal:
    unit: str = PANELS
    panels: int = 5
    area: float = 0.0

    @property
    def is_area(self):
        return self.unit == AREA

    def full(self, count, area):
        """True when a day already meets the goal. In m² mode the last panel may overshoot it."""
        if self.is_area:
            return area + AREA_EPS >= self.area
        return count >= self.panels

    def text(self):
        return f"{self.area:g} m²/día" if self.is_area else f"{self.panels} paneles/día"


def as_goal(value):
    """Accept a Goal or a plain int (the old panels-per-day capacity)."""
    return value if isinstance(value, Goal) else Goal(PANELS, int(value))


def goal_of(record):
    return Goal(record.get("capacity_unit") or PANELS, int(record.get("daily_capacity") or 1),
                float(record.get("daily_area") or 0.0))


def panel_area(panels, name):
    return float((panels.get(name) or {}).get("area") or 0.0)
