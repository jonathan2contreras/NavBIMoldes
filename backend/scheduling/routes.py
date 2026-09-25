from fastapi import APIRouter, Depends
from .models import GenerateRequest, MoldCopyRequest, MoveRequest, RevisionRequest, ScheduleResponse


def create_schedule_router(service, require_admin):
    router = APIRouter(prefix="/schedule", tags=["Cronograma"])

    @router.get("", response_model=ScheduleResponse)
    async def get_schedule():
        return await service.get()

    @router.post("/generate", response_model=ScheduleResponse)
    async def generate_schedule(payload: GenerateRequest, _admin=Depends(require_admin)):
        return await service.generate(payload)

    @router.post("/save", response_model=ScheduleResponse)
    async def save_schedule(payload: RevisionRequest, _admin=Depends(require_admin)):
        return await service.save(payload)

    @router.post("/fill", response_model=ScheduleResponse)
    async def fill_schedule(payload: RevisionRequest, _admin=Depends(require_admin)):
        return await service.save(payload, fill=True)

    @router.patch("/mold-copies", response_model=ScheduleResponse)
    async def set_mold_copies(payload: MoldCopyRequest, _admin=Depends(require_admin)):
        return await service.set_mold_copies(payload)

    @router.patch("/panel", response_model=ScheduleResponse)
    async def move_schedule_panel(payload: MoveRequest, _admin=Depends(require_admin)):
        return await service.move_panel(payload)

    return router