import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";

export const useReportsData = (facade, molde, tipo) => {
  const [snapshot, setSnapshot] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([facade, molde, tipo]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      setFetching(true);
      setError("");
      try {
        const [report, molds, tipos] = await Promise.all([
          api.getMoldsReport(facade, molde, tipo), api.getMolds(), api.getTipos(),
        ]);
        if (active) setSnapshot({ key, report, molds: molds.items || [], tipos: tipos.items || [], updated: new Date() });
      } catch {
        if (active) setError("No se pudieron actualizar los reportes. Vuelve a intentarlo.");
      } finally {
        pending = false;
        if (active) setFetching(false);
      }
    };
    const refreshVisible = () => { if (document.visibilityState === "visible") load(); };
    load();
    const timer = window.setInterval(refreshVisible, 30000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [facade, molde, tipo, key, revision]);

  const data = snapshot?.key === key ? snapshot.report : null;
  return { data, molds: snapshot?.molds || [], tipos: snapshot?.tipos || [],
    updated: snapshot?.updated, fetching, loading: !data && (fetching || !error), error, refresh };
};