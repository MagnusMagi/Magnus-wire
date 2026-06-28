"use client";
import { useEffect, useState, useCallback } from "react";

const KEY = "mw_watchlist";
const EVT = "mw-watch";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function useWatchlist() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const toggle = useCallback((sym: string) => {
    const cur = read();
    const next = cur.includes(sym) ? cur.filter((s) => s !== sym) : [...cur, sym];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVT));
  }, []);
  return { ids, has: (s: string) => ids.includes(s), toggle };
}
