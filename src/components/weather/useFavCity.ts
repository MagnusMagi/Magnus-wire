"use client";
import { useEffect, useState, useCallback } from "react";

export type Fav = { name: string; lat: number; lon: number } | null;
const KEY = "mw_fav_city";
const EVT = "mw-fav";

function read(): Fav {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function useFavCity() {
  const [fav, setFav] = useState<Fav>(null);
  useEffect(() => {
    setFav(read());
    const s = () => setFav(read());
    window.addEventListener(EVT, s);
    window.addEventListener("storage", s);
    return () => { window.removeEventListener(EVT, s); window.removeEventListener("storage", s); };
  }, []);
  const set = useCallback((c: Fav) => {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVT));
  }, []);
  const isFav = useCallback((lat: number, lon: number) => {
    const f = read();
    return !!f && Math.abs(f.lat - lat) < 0.05 && Math.abs(f.lon - lon) < 0.05;
  }, [fav]);
  return { fav, set, isFav };
}
