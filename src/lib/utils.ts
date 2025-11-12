import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buildTransformationUrl(
  baseUrl: string,
  transformation: string
): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}tr=${transformation}`;
}
