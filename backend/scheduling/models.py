from datetime import date as CalendarDate
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class RevisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(strict=True, ge=0)


class GenerateRequest(RevisionRequest):
    start_date: CalendarDate
    # Daily goal: a number of panels (capacity_unit="panels") or square meters (capacity_unit="m2").
    capacity_unit: Literal["panels", "m2"] = "panels"
    daily_capacity: Optional[int] = Field(default=None, strict=True, ge=1, le=1000)
    daily_area: Optional[float] = Field(default=None, ge=0.01, le=100000)

    @model_validator(mode="after")
    def goal_is_present(self):
        if self.capacity_unit == "panels" and self.daily_capacity is None:
            raise ValueError("Indica los paneles por día.")
        if self.capacity_unit == "m2" and self.daily_area is None:
            raise ValueError("Indica los m² por día.")
        if self.daily_area is not None:
            self.daily_area = round(self.daily_area, 2)
        return self

    @field_validator("start_date")
    @classmethod
    def valid_year(cls, value):
        if not 2000 <= value.year <= 2090:
            raise ValueError("La fecha debe estar entre 2000 y 2090.")
        return value


class MoldCopyRequest(RevisionRequest):
    mold: str = Field(min_length=1)
    copies: int = Field(strict=True, ge=1, le=100)


class MoveRequest(RevisionRequest):
    object_name: str = Field(min_length=1)
    date: Optional[CalendarDate]


class SchedulePanel(BaseModel):
    object_name: str
    code: str
    molde: str
    tipo: Optional[str] = None
    color: str
    date: Optional[str] = None
    floor_index: int
    floor_label: str
    elevation: float
    facade: str
    facade_label: str
    stage_index: int
    sequence_index: int
    center: list[float]
    area: float = 0.0
    phase_order: Optional[int] = None
    week: Optional[str] = None
    front: Optional[str] = None
    front_color: Optional[str] = None


class ScheduleFloor(BaseModel):
    index: int
    label: str
    elevation: float
    model_panels: int


class ScheduleStage(BaseModel):
    index: int
    floor_index: int
    floor_label: str
    facade: str
    facade_label: str
    total: int
    scheduled: int
    first_date: Optional[str] = None
    finish_date: Optional[str] = None


class ScheduleMold(BaseModel):
    name: str
    tipo: Optional[str] = None
    color: str
    total: int
    scheduled: int
    copies: int = 1


class ProductionDay(BaseModel):
    date: str
    scheduled: int
    target: int
    scheduled_area: float = 0.0
    target_area: Optional[float] = None
    shortfall_area: float = 0.0
    available_molds: int
    remaining_panels: int
    shortfall: int
    status: str
    explanation: str


class ScheduleResponse(BaseModel):
    start_date: str
    daily_capacity: int
    capacity_unit: str = "panels"
    daily_area: Optional[float] = None
    revision: int
    saved: bool
    updated_at: Optional[str] = None
    working_days: list[int] = [0, 1, 2, 3, 4, 5]
    panels: list[SchedulePanel]
    molds: list[ScheduleMold]
    total_project: int
    schedulable: int
    scheduled: int
    unscheduled: int
    awaiting_mold: int
    stale_entries: int
    first_date: Optional[str] = None
    finish_date: Optional[str] = None
    working_day_span: int
    strategy: str
    needs_replan: bool
    order_warning: Optional[str] = None
    floors: list[ScheduleFloor]
    stages: list[ScheduleStage]
    awaiting_location: int
    production_days: list[ProductionDay]
    full_capacity_days: int
    limited_capacity_days: int
    manual_gap_days: int
    bottleneck_mold: Optional[str] = None
    phase_active: bool = False
    phase_unfit: int = 0
    phase_late: int = 0
    bottleneck_panels: int