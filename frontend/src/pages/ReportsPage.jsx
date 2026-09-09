import React, { useMemo, useState } from "react";
import { BarChart3, LayoutGrid, ListTree, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useReportsData } from "../components/reports/useReportsData";
import { getMoldRows, groupByType } from "../components/reports/reportData";
import { ReportActions } from "../components/reports/ReportActions";
import { ReportFilters } from "../components/reports/ReportFilters";
import { ReportMetrics } from "../components/reports/ReportMetrics";
import { MoldBars, MoldCards } from "../components/reports/MoldViews";
import { TypeDistribution } from "../components/reports/TypeDistribution";
import { MoldDetailTable, TypeMatrix } from "../components/reports/MoldTables";
import { PanelDetail } from "../components/reports/PanelDetail";
import "../components/reports/reports.css";

const VIEWS = [{ key: "bars", label: "Barras", Icon: BarChart3 }, { key: "cards", label: "Tarjetas", Icon: LayoutGrid }, { key: "matrix", label: "Por tipo", Icon: ListTree }];

export default function ReportsPage() {
  const [filters, setFilters] = useState({ facade: "all", molde: "all", tipo: "all" });
  const [view, setView] = useState("bars");
  const [sort, setSort] = useState("count");
  const { data, molds, tipos, updated, loading, fetching, error, refresh } = useReportsData(filters.facade, filters.molde, filters.tipo);
  const rows = useMemo(() => data ? getMoldRows(data, molds, filters.molde, filters.tipo, sort) : [], [data, molds, filters.molde, filters.tipo, sort]);
  const groups = useMemo(() => groupByType(rows, tipos), [rows, tipos]);
  const selectMold = (molde) => setFilters((current) => ({ ...current, molde }));
  const selectType = (tipo) => setFilters((current) => ({ ...current, tipo, molde: "all" }));
  const selectUnassigned = () => setFilters((current) => ({ ...current, molde: "__none__", tipo: "all" }));

  return <div className="reports-dashboard h-full overflow-y-auto bg-white text-[#111111]" data-testid="reports-screen">
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div><h1 className="text-3xl font-extrabold sm:text-4xl" data-testid="report-title">Reportes</h1><p className="mt-2 text-sm text-[#636366]" data-testid="report-subtitle">Paneles de fachada · Moldes y tipos</p></div>
        <ReportActions filters={filters} disabled={!data || fetching || !!error} fetching={fetching} refresh={refresh} updated={updated} />
      </header>
      <ReportFilters filters={filters} setFilters={setFilters} molds={molds} tipos={tipos} />
      {error && <div role="alert" className="my-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-800" data-testid="report-error"><p>{error}{data && " Se muestran los últimos datos disponibles."}</p><Button variant="outline" data-testid="report-retry-button" onClick={refresh}>Reintentar</Button></div>}
      {loading ? <div className="flex justify-center py-20" data-testid="report-loading" role="status" aria-label="Cargando reportes"><Loader2 size={30} className="animate-spin" /></div> : data && <>
        <ReportMetrics data={data} rows={rows} />
        {data.total === 0 && <p role="status" className="mb-5 rounded-lg bg-[#F2F2F7] p-4 text-sm text-[#636366]" data-testid="report-empty">Sin paneles para los filtros seleccionados.</p>}
        <Tabs value={view} onValueChange={setView} className="border-t border-[#E5E5EA] pt-5">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <TabsList className="h-11 max-w-full" aria-label="Visualización del dashboard" data-testid="report-view-switcher">
              {VIEWS.map(({ key, label, Icon }) => <TabsTrigger key={key} value={key} data-testid={`report-view-${key}`} className="h-9 gap-1.5 px-2.5 text-xs transition-[background-color,box-shadow] sm:px-4 sm:text-sm"><Icon size={15} />{label}</TabsTrigger>)}
            </TabsList>
            <label className="flex min-w-0 items-center gap-2 text-xs text-[#636366]" htmlFor="report-sort">Ordenar<select id="report-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="report-select !h-9 !w-auto !text-xs" data-testid="report-sort"><option value="count">Mayor cantidad</option><option value="name">Nombre A–Z</option></select></label>
          </div>
          <TabsContent value="bars" className="report-view-enter" data-testid="report-bars-panel">
            <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
              <section className="min-w-0"><h2 className="mb-4 text-base font-bold md:text-lg">Paneles por molde</h2><MoldBars rows={rows} onSelect={selectMold} /></section>
              <TypeDistribution groups={groups} data={data} onType={selectType} onUnassigned={selectUnassigned} />
            </div>
            <MoldDetailTable rows={rows} data={data} onSelect={selectMold} />
          </TabsContent>
          <TabsContent value="cards" className="report-view-enter" data-testid="report-cards-panel"><MoldCards rows={rows} total={data.total} onSelect={selectMold} /></TabsContent>
          <TabsContent value="matrix" className="report-view-enter" data-testid="report-matrix-panel"><TypeMatrix groups={groups} data={data} onSelect={selectMold} /></TabsContent>
        </Tabs>
        <PanelDetail key={JSON.stringify(filters)} items={data.items || []} />
      </>}
    </div>
  </div>;
}