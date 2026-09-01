/**
 * BIZRA Node0 — runtime mode resolution (LOCAL-SOVEREIGN-BOUNDARY-1A).
 *
 * Two modes, resolved BEFORE any store is opened:
 *   PUBLIC_REFERENCE — the safe default. Read-only presentation of sealed
 *     state. No model invocation, no mission effect, no trace ingestion,
 *     no cycle application, no transition revert. The archive is snapshotted;
 *     original bytes are never opened for write.
 *   LOCAL_FOUNDER — only when every local preflight passes: an explicit
 *     state root OUTSIDE the source tree and an EXPLICIT loopback bind.
 *
 * R1 policy: LOCAL mode may bind only 127.0.0.1 or ::1, and only when the
 * operator said so explicitly. A configured 0.0.0.0, ::, LAN address, or an
 * absent host refuses LOCAL execution. PUBLIC mode defaults to 127.0.0.1 and
 * also refuses any non-loopback host.
 */
import { resolve, sep } from "node:path";

export type RuntimeMode = "PUBLIC_REFERENCE" | "LOCAL_FOUNDER";

export const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);

export interface ModeResolution {
  mode: RuntimeMode;
  bindHost: string;
  port: number;
  stateRoot: string | null; // null = default archive location (service state dir)
}

export class BoundaryRefusal extends Error {
  constructor(public readonly red: string, message: string) {
    super(`[BOUNDARY-1A][RED] ${red}: ${message}`);
    this.name = "BoundaryRefusal";
  }
}

function isInside(child: string, parent: string): boolean {
  const c = resolve(child) + sep;
  const p = resolve(parent) + sep;
  return c === p || c.startsWith(p);
}

/** Resolve the runtime mode. Pure — no store, no db, no listener. Throws named RED on policy violation. */
export function resolveMode(serviceDir: string): ModeResolution {
  const mode: RuntimeMode =
    process.env.BIZRA_RUNTIME_MODE === "LOCAL_FOUNDER" ? "LOCAL_FOUNDER" : "PUBLIC_REFERENCE";

  const explicitHost = process.env.BIZRA_BIND_HOST;
  const port = Number(process.env.BIZRA_PORT ?? 7421);

  if (mode === "LOCAL_FOUNDER") {
    if (!explicitHost) {
      throw new BoundaryRefusal(
        "LOCAL_BIND_HOST_REQUIRED",
        "LOCAL_FOUNDER mode requires an explicit BIZRA_BIND_HOST of 127.0.0.1 or ::1 — an absent host is a refusal, not a default",
      );
    }
    if (!LOOPBACK_HOSTS.has(explicitHost)) {
      throw new BoundaryRefusal(
        "LOOPBACK_POLICY_REFUSED",
        `LOCAL_FOUNDER mode may bind only 127.0.0.1 or ::1 by explicit policy — refusing '${explicitHost}'`,
      );
    }
    const root = process.env.BIZRA_STATE_ROOT;
    if (!root) {
      throw new BoundaryRefusal(
        "LOCAL_STATE_ROOT_REQUIRED",
        "LOCAL_FOUNDER mode requires BIZRA_STATE_ROOT — an explicit state root outside the source tree",
      );
    }
    if (isInside(root, serviceDir)) {
      throw new BoundaryRefusal(
        "LOCAL_STATE_ROOT_INSIDE_SOURCE_TREE",
        "LOCAL_FOUNDER state root must live outside the source tree — the tree is not portable runtime authority",
      );
    }
    return { mode, bindHost: explicitHost, port, stateRoot: resolve(root) };
  }

  // PUBLIC_REFERENCE: loopback by default; any explicit non-loopback host is also refused.
  if (explicitHost && !LOOPBACK_HOSTS.has(explicitHost)) {
    throw new BoundaryRefusal(
      "LOOPBACK_POLICY_REFUSED",
      `PUBLIC_REFERENCE binds loopback only — refusing explicit host '${explicitHost}'`,
    );
  }
  const root = process.env.BIZRA_STATE_ROOT ? resolve(process.env.BIZRA_STATE_ROOT) : null;
  return { mode, bindHost: explicitHost ?? "127.0.0.1", port, stateRoot: root };
}
