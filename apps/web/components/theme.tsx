"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark" | "system";
const KEY = "relo.theme";

export function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0A1424" : "#061B3A");
}

export function readTheme(): Theme {
  try { const v = localStorage.getItem(KEY); if (v === "light" || v === "dark" || v === "system") return v; } catch { /* storage blocked */ }
  return "system";
}

/** Inline script run before paint so the page never flashes the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => { setTheme(readTheme()); }, []);
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);
  const choose = (t: Theme) => {
    setTheme(t);
    try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ }
    applyTheme(t);
  };
  return { theme, choose };
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Compact three-way switch: Light, Dark, or follow the device. */
export function ThemeSwitch({ labels = false }: { labels?: boolean }) {
  const { theme, choose } = useTheme();
  return (
    <div role="radiogroup" aria-label="Colour theme" className="inline-flex items-center gap-0.5 rounded-full border border-line bg-white p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button key={value} role="radio" aria-checked={theme === value} aria-label={`${label} theme`} title={`${label} theme`} onClick={() => choose(value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${theme === value ? "bg-navy text-white" : "text-mute hover:text-ink"}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />{labels && label}
        </button>
      ))}
    </div>
  );
}
