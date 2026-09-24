import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { BACKEND_URL } from "../../lib/api";
import { Button } from "../ui/button";

/** Downloads the saved schedule + installation plan as Excel or PDF. */
export const ScheduleExport = () => (
  <div className="flex items-center gap-2" data-testid="schedule-export">
    <Button asChild variant="outline" size="sm">
      <a href={`${BACKEND_URL}/api/schedule/export.xlsx`} download data-testid="schedule-export-xlsx"><FileSpreadsheet /> Excel</a>
    </Button>
    <Button asChild variant="outline" size="sm">
      <a href={`${BACKEND_URL}/api/schedule/export.pdf`} download data-testid="schedule-export-pdf"><FileText /> PDF</a>
    </Button>
  </div>
);
