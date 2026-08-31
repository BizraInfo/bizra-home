/**
 * BIZRA Node0 — hash primitives.
 * SHA-256 over canonical JSON. Canonical form: sorted keys, no whitespace.
 * The chain and every organ receipt use these — no other hashing exists.
 */
import { createHash } from "node:crypto";

export function sha256hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input as never).digest("hex");
}

export function canonical(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") {
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return (
      "{" +
      keys
        .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
        .map(
          (k) =>
            JSON.stringify(k) + ":" + canonical((value as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

export function sha256obj(value: unknown): string {
  return sha256hex(canonical(value));
}

/** Dubai-time date stamp (the operator's timezone). */
export function dubaiDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function nowIso(): string {
  return new Date().toISOString();
}
