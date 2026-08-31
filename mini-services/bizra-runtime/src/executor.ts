/**
 * BIZRA Node0 — Executor (the bounded effect) and Observer (the independent eye).
 * The executor can write EXACTLY ONE class of effect: a local file inside
 * state/outbox/. No network code path exists in this file at all. Lateral
 * movement is not forbidden by policy — it is absent from the machine.
 * The observer re-reads the bytes from disk AFTER the write and hashes them
 * independently. The runtime is never trusted to grade its own homework.
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { sha256hex } from "./hash";
import { OUTBOX_DIR } from "./store";

export interface Effect {
  path: string;
  bytes: number;
  effect_sha256: string;
  write_count: number;
}

let writes = 0;

export function boundedWrite(fileName: string, content: string): Effect {
  const safe = basename(fileName);
  if (safe !== fileName || safe.includes("..") || !/^[A-Za-z0-9._-]+$/.test(safe)) {
    throw new Error(`EFFECT_SCOPE: '${fileName}' is outside the outbox membrane`);
  }
  if (!safe.endsWith(".md")) {
    throw new Error("EFFECT_CLASS: only .md briefs are writable in BOUNDED_LOCAL_WRITE");
  }
  mkdirSync(OUTBOX_DIR, { recursive: true });
  const path = join(OUTBOX_DIR, safe);
  const resolved = resolve(path);
  if (!resolved.startsWith(resolve(OUTBOX_DIR))) {
    throw new Error("EFFECT_SCOPE: path traversal refused");
  }
  writeFileSync(path, content, "utf8");
  writes++;
  const bytes = Buffer.byteLength(content, "utf8");
  return { path: resolved, bytes, effect_sha256: sha256hex(content), write_count: writes };
}

export interface Observation {
  path: string;
  bytes: number;
  observer_sha256: string;
  exists: boolean;
}

export function observe(path: string): Observation {
  const exists = existsSync(path);
  if (!exists) return { path, bytes: 0, observer_sha256: "", exists: false };
  const content = readFileSync(path, "utf8");
  return {
    path,
    bytes: Buffer.byteLength(content, "utf8"),
    observer_sha256: sha256hex(content),
    exists: true,
  };
}

export function outboxListings(): { name: string; bytes: number; sha256: string }[] {
  if (!existsSync(OUTBOX_DIR)) return [];
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  return readdirSync(OUTBOX_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const p = join(OUTBOX_DIR, f);
      const content = readFileSync(p, "utf8");
      return { name: f, bytes: statSync(p).size, sha256: sha256hex(content) };
    });
}

export function readOutboxFile(name: string): string | null {
  const safe = basename(name);
  if (!safe.endsWith(".md") || !/^[A-Za-z0-9._-]+$/.test(safe)) return null;
  const p = join(OUTBOX_DIR, safe);
  if (!resolve(p).startsWith(resolve(OUTBOX_DIR)) || !existsSync(p)) return null;
  return readFileSync(p, "utf8");
}
