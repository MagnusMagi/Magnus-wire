"use client";
import { useEffect, useState, useCallback } from "react";

export type SavedCity = { id: string; name: string; lat: number; lon: number };
const KEY = "mw_cities";
const EVT = "mw-cities";

function read(): SavedCity[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: SavedCity[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function useCities() {
  const [cities, setCities] = useState<SavedCity[]>([]);
  useEffect(() => {
    setCities(read());
    const s = () => setCities(read());
    window.addEventListener(EVT, s);
    window.addEventListener("storage", s);
    return () => { window.removeEventListener(EVT, s); window.removeEventListener("storage", s); };
  }, []);
  const add = useCallback((c: SavedCity) => {
    const cur = read();
    if (cur.some((x) => x.id === c.id)) return;
    write([...cur, c].slice(0, 12));
  }, []);
  const remove = useCallback((id: string) => { write(read().filter((x) => x.id !== id)); }, []);
  return { cities, add, remove };
}
