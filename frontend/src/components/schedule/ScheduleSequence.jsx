import React, { useState } from "react";
import { ChevronDown, Compass } from "lucide-react";
import { dateLabel } from "./dates";

export const ScheduleSequence = ({ data, onSelect }) => {
  const [open, setOpen] = useState(false);
  return <section className="mb-5 border-y border-[#E5E5EA] py-4" data-testid="schedule-sequence">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="flex items-center gap-2 text-base font-bold" data-testid="schedule-priority-title"><Compass size={17} className="shrink-0 text-[#007AFF]" />Prioridad: completar la cantidad diaria</h2>
        <p className="mt-2 break-words text-sm font-semibold text-[#3A3A3C]" data-testid="schedule-facade-order">Oeste → Norte → Este → Sur</p>
        <p className="mt-1 text-xs text-[#636366]" data-testid="schedule-floor-order">Preferencia desde planta baja · Se adelantan otros moldes para completar el objetivo diario</p>
      </div>
      <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition-colors hover:bg-[#F2F2F7]" data-testid="schedule-sequence-toggle" aria-expanded={open} aria-controls="schedule-sequence-content" onClick={() => setOpen(!open)}>{data.floors.length} niveles · {data.stages.length} tramos<ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} /></button>
    </div>
    <p className="mt-3 text-xs text-[#636366]" data-testid="schedule-floor-method">Plantas inferidas de la cota inferior de los paneles del modelo 3D; sin nombres de nivel BIM explícitos.</p>
    {open && <div id="schedule-sequence-content" className="mt-4 max-h-80 overflow-y-auto" data-testid="schedule-sequence-content">
      <table className="w-full table-fixed text-xs" data-testid="schedule-sequence-table">
        <thead className="sticky top-0 bg-[#F2F2F7] text-[#636366]"><tr><th className="w-[36%] py-3 pl-2 text-left sm:w-[40%]">Planta · Fachada</th><th className="w-[16%] text-right">Paneles</th><th className="w-[24%] text-right sm:w-[22%]">Inicio</th><th className="w-[24%] pr-2 text-right sm:w-[22%]">Fin</th></tr></thead>
        <tbody>{data.stages.map((stage) => <tr key={stage.index} className="border-b border-[#E5E5EA]" data-testid={`schedule-stage-${stage.index}`}>
          <th className="py-3 pl-2 pr-2 text-left font-semibold"><button type="button" disabled={!stage.first_date} onClick={() => onSelect(stage.first_date)} className="max-w-full break-words text-left hover:text-[#007AFF] disabled:cursor-default" data-testid={`schedule-stage-jump-${stage.index}`}>{stage.floor_label} · {stage.facade_label}</button></th>
          <td className="text-right tabular-nums" data-testid={`schedule-stage-count-${stage.index}`}>{stage.scheduled}/{stage.total}</td><td className="pl-1 text-right" data-testid={`schedule-stage-start-${stage.index}`}>{dateLabel(stage.first_date, "dd/MM/yy")}</td><td className="pl-1 pr-2 text-right" data-testid={`schedule-stage-end-${stage.index}`}>{dateLabel(stage.finish_date, "dd/MM/yy")}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
};