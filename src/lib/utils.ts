import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTokens(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return "0";
  if (n <= 9999) return n.toLocaleString();
  const k = Math.floor(n / 1000);
  const d = Math.floor((n % 1000) / 100);
  return d > 0 ? `${k}.${d}k` : `${k}k`;
}
