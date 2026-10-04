/**
 * BIZRA Node0 — bounded executor and same-process disk readback.
 * The executor can write EXACTLY ONE class of effect: a local file inside
 * state/outbox/. No network code path exists in this file at all. Lateral
 * movement is not forbidden by policy — it is absent from the machine.
 * Readback hashes actual disk bytes; it does not establish independent custody.
 */
import { writeFileSync, readFileSync, openSync, closeSync, fstatSync, readdirSync, constants } from "node:fs";
import { join, resolve, basename, dirname } from "node:path";
import { sha256hex } from "./hash";
import { OUTBOX_DIR } from "./store";

export interface Effect {
  path: string;
  bytes: number;
  effect_sha256: string;
  write_count: number;
}

let writes = 0;

function validateName(name: string): void {
  if (basename(name) !== name || name.includes("..") || !/^[A-Za-z0-9._-]+$/.test(name)) {
    throw new Error("EFFECT_SCOPE: name is outside the outbox membrane");
  }
  if (!name.endsWith(".md")) {
    throw new Error("EFFECT_CLASS: only .md briefs are writable in BOUNDED_LOCAL_WRITE");
  }
}

function openOutboxDirectory(): number {
  // ponytail: Linux descriptor anchoring; other hosts need an equally strong dirfd API.
  if (process.platform !== "linux") throw new Error("OUTBOX_PLATFORM_REFUSED");
  const flags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  let fd = openSync("/", flags);
  try {
    for (const component of resolve(OUTBOX_DIR).split("/").filter(Boolean)) {
      const next = openSync(`/proc/self/fd/${fd}/${component}`, flags);
      closeSync(fd);
      fd = next;
    }
    return fd;
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

function withFile<T>(name: string, flags: number, operation: (fd: number) => T, directory?: number): T {
  validateName(name);
  const dir = directory ?? openOutboxDirectory();
  try {
    const fd = openSync(`/proc/self/fd/${dir}/${name}`, flags | constants.O_NOFOLLOW, 0o600);
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1) throw new Error("OUTBOX_FILE_REFUSED: not a single-link regular file");
      return operation(fd);
    } finally { closeSync(fd); }
  } finally { if (directory === undefined) closeSync(dir); }
}

function readBytes(name: string, directory?: number): Buffer {
  return withFile(name, constants.O_RDONLY | constants.O_NONBLOCK, fd => readFileSync(fd), directory);
}

export function boundedWrite(fileName: string, content: string): Effect {
  withFile(fileName, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
    fd => writeFileSync(fd, content, "utf8"));
  writes++;
  const bytes = Buffer.byteLength(content, "utf8");
  return { path: join(OUTBOX_DIR, fileName), bytes, effect_sha256: sha256hex(content), write_count: writes };
}

export interface Observation {
  path: string;
  bytes: number;
  observer_sha256: string;
  exists: boolean;
}

export function observe(path: string): Observation {
  if (dirname(path) !== OUTBOX_DIR || path !== join(OUTBOX_DIR, basename(path))) {
    throw new Error("EFFECT_SCOPE: observation is outside the outbox membrane");
  }
  try {
    const bytes = readBytes(basename(path));
    return { path, bytes: bytes.length, observer_sha256: sha256hex(bytes), exists: true };
  } catch (error: any) {
    if (error.code === "ENOENT") return { path, bytes: 0, observer_sha256: "", exists: false };
    throw error;
  }
}

export function outboxListings(): { name: string; bytes: number; sha256: string }[] {
  let dir: number;
  try { dir = openOutboxDirectory(); } catch (error: any) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  try {
    return readdirSync(`/proc/self/fd/${dir}`).filter(name => name.endsWith(".md")).map(name => {
      const bytes = readBytes(name, dir);
      return { name, bytes: bytes.length, sha256: sha256hex(bytes) };
    });
  } finally { closeSync(dir); }
}

export function readOutboxFile(name: string): string | null {
  try { return readBytes(name).toString("utf8"); } catch { return null; }
}
