export function getFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getTrimmedFirst(value: string | string[] | undefined, fallback = ""): string {
  return (getFirst(value) ?? fallback).trim();
}

export function parseNonNegativeIntParam(value: string | undefined, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return fallback;
  return n;
}
