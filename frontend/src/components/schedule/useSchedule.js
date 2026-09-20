import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

export const useSchedule = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sequence = useRef(0);
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    const id = ++sequence.current;
    setLoading(true);
    try { const result = await api.getSchedule(); if (id === sequence.current) { setData(result); setError(""); } }
    catch (err) { if (id === sequence.current) setError(err.message); }
    finally { if (id === sequence.current) setLoading(false); }
  }, []);
  const invalidate = useCallback(() => { ++sequence.current; }, []);
  useEffect(() => {
    refresh();
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", visible);
    return () => { invalidate(); window.removeEventListener("focus", visible); };
  }, [refresh, invalidate]);
  const mutate = async (request, message) => {
    if (busy.current) return null;
    busy.current = true;
    invalidate(); setLoading(false); setSaving(true); setError(""); setNotice("");
    try {
      const result = await request();
      setData(result); setNotice(message); return result;
    } catch (err) { setError(err.message); return null; }
    finally { busy.current = false; setSaving(false); }
  };
  return { data, loading, saving, error, notice, refresh, mutate };
};