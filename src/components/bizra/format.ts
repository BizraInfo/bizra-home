/**
 * BIZRA — shared format helpers for live runtime data.
 * Honest formatting only: no rounding that hides, no truncation that lies.
 */

export function truncHash(hash: string | null | undefined, head = 8, tail = 0): string {
  if (!hash) return "—";
  if (hash.length <= head + tail + 1) return hash;
  return tail > 0 ? `${hash.slice(0, head)}…${hash.slice(-tail)}` : `${hash.slice(0, head)}…`;
}

export function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Uptime from a started_at epoch string — "2h 14m 09s" style, ticking. */
export function fmtUptime(startedAt: string | null | undefined, now = Date.now()): string {
  if (!startedAt) return "—";
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return "—";
  let ms = Math.max(0, now - start);
  const d = Math.floor(ms / 86_400_000);
  ms -= d * 86_400_000;
  const h = Math.floor(ms / 3_600_000);
  ms -= h * 3_600_000;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms - m * 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

/** Timestamp → "31 Aug · 21:17 GST" in the runtime's Dubai timezone voice. */
export function fmtStamp(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
