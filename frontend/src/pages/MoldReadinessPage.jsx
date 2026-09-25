import React, { useMemo } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { useSchedule } from "../components/schedule/useSchedule";
import { MoldReadinessTimeline } from "../components/schedule/MoldReadinessTimeline";
import { buildReadiness } from "../components/schedule/moldReadiness";
import ReadinessExport from "../components/schedule/ReadinessExport";

export default function MoldReadinessPage() {
  const { data, loading, error, refresh } = useSchedule();
  const readiness = useMemo(() => (data ? buildReadiness(data) : null), [data]);

  return <div className="h-full overflow-y-auto bg-white text-[#111111]" data-testid="mold-readiness-screen">
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-6 sm:px-7 sm:pt-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl" data-testid="mold-readiness-title">Plazos de moldes</h1>
          <p className="mt-2 text-sm text-[#636366]">Fechas en que cada molde debe estar operativo para cumplir el cronograma de fabricación</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {readiness && <ReadinessExport readiness={readiness} disabled={loading} />}
          <Button variant="outline" size="icon" disabled={loading} onClick={refresh} title="Actualizar" aria-label="Actualizar" data-testid="mold-readiness-refresh"><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
        </div>
      </header>

      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800" data-testid="mold-readiness-error"><p>{error}</p><Button variant="outline" disabled={loading} onClick={refresh} data-testid="mold-readiness-retry">Actualizar</Button></div>}

      {!data && loading && <div role="status" className="flex justify-center py-20" data-testid="mold-readiness-loading"><Loader2 className="animate-spin" aria-label="Cargando plazos de moldes" /></div>}

      {data && readiness && <MoldReadinessTimeline readiness={readiness} />}
    </div>
  </div>;
}
