import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDateTime(date: string | number | Date): string {
  const d = new Date(date);
  return d.toLocaleString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

export function formatRelative(date: string | number | Date): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) {
    return "только что";
  }
  if (diff < 3_600_000) {
    const minutes = Math.round(diff / 60_000);
    return `${minutes} мин назад`;
  }
  if (diff < 86_400_000) {
    const hours = Math.round(diff / 3_600_000);
    return `${hours} ч назад`;
  }
  const days = Math.round(diff / 86_400_000);
  return `${days} дн назад`;
}

export function formatTimer(ms: number): string {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

