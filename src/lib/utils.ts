import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact number formatting (zh-CN style, no grouping for small numbers). */
export function fmt(n: number, digits = 1): string {
  if (!isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return n.toLocaleString("zh-CN", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    });
  }
  return n.toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

/** Deterministic id generator (no Math.random dependency for stable SSR/build). */
let _idCounter = 0;
export function uid(prefix = "id"): string {
  _idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}
