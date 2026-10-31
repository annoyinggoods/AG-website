import type { Deal } from "../engine/types.js";

export function formatSeconds(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatPreciseSeconds(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((clamped % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export function formatSignedSeconds(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  return `${sign}${formatPreciseSeconds(Math.abs(ms))}`;
}

export function unitFaceLabel(deal: Deal, unitId: number): string {
  const unit = deal.units[unitId];
  if (unit === undefined) {
    return "";
  }
  return [...new Set(unit.faces)].join("/");
}
