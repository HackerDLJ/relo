"use client";
import { useSyncExternalStore } from "react";

/** Items a person has saved (hearted). Per-device, per-user, kept in localStorage. */
const listeners = new Set<() => void>();
const key = (uid: string) => `relo.saved.${uid}`;
const cache = new Map<string, string[]>();

function read(uid: string): string[] {
  if (cache.has(uid)) return cache.get(uid)!;
  let v: string[] = [];
  try { const raw = localStorage.getItem(key(uid)); if (raw) v = (JSON.parse(raw) as unknown[]).filter((x): x is string => typeof x === "string"); } catch { /* storage blocked */ }
  cache.set(uid, v);
  return v;
}
export function toggleSaved(uid: string, itemId: string) {
  const cur = read(uid);
  const next = cur.includes(itemId) ? cur.filter((x) => x !== itemId) : [...cur, itemId];
  cache.set(uid, next);
  try { localStorage.setItem(key(uid), JSON.stringify(next)); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}
const EMPTY: string[] = [];
export function useSaved(uid: string): string[] {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => read(uid), () => EMPTY);
}
