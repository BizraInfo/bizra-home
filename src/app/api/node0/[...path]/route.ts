/**
 * BIZRA Node0 — the FIXED same-origin transport (LOCAL-SOVEREIGN-BOUNDARY-1A §2.3).
 *
 *   browser -> same-origin /api/node0/* -> this server-side proxy -> http://127.0.0.1:7421/*
 *
 * No request parameter, header, body field, cookie, or path segment may select
 * an arbitrary localhost port or host: the target is a compiled-in constant.
 * Requests carrying the caller-selected-port query param are refused here as
 * well (defense in depth — the runtime refuses them too).
 */

import { node0ContractFailure, validateNode0StateEnvelope } from "@/lib/runtime-contract";
import { hasInviteAccess } from "@/lib/invite";

const NODE0_TARGET = "http://127.0.0.1:7421";
const CALLER_PORT_PARAM = ["X", "Transform", "Port"].join("");

function sanitizeSegments(segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const s of segments) {
    if (!/^[a-zA-Z0-9._-]{1,64}$/.test(s)) return null;
  }
  return segments.join("/");
}

async function forward(req: Request, segments: string[]): Promise<Response> {
  if (req.method !== "GET") {
    return Response.json(
      { ok: false, refused: true, reason: "NODE0_READ_ONLY: writes are not available through this workbench" },
      { status: 405, headers: { allow: "GET" } },
    );
  }
  if (!(await hasInviteAccess())) {
    return Response.json(
      { ok: false, refused: true, reason: "NODE0_INVITE_REQUIRED" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  if (url.searchParams.has(CALLER_PORT_PARAM)) {
    return Response.json(
      {
        ok: false,
        refused: true,
        reason: `CALLER_SELECTED_TRANSPORT_REFUSED: requests carrying ${CALLER_PORT_PARAM} are refused — the Node0 transport is this fixed proxy, never a caller-chosen port`,
      },
      { status: 400 },
    );
  }
  const path = sanitizeSegments(segments);
  if (path === null) {
    return Response.json({ ok: false, reason: "PATH_REFUSED: malformed node0 path" }, { status: 400 });
  }
  try {
    const init: RequestInit = {
      method: "GET",
      headers: { "content-type": req.headers.get("content-type") ?? "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    };
    const res = await fetch(`${NODE0_TARGET}/api/${path}`, init);
    const body = await res.arrayBuffer();
    if (path === "state") {
      if (!res.ok) {
        return Response.json(node0ContractFailure(res.status, "HTTP_STATUS"), { status: 502 });
      }
      const text = new TextDecoder().decode(body);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return Response.json(node0ContractFailure(res.status, "INVALID_JSON"), { status: 502 });
      }
      if (!validateNode0StateEnvelope(parsed)) {
        return Response.json(node0ContractFailure(res.status, "INVALID_STATE_SHAPE"), { status: 502 });
      }
    }
    return new Response(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    // honest unreachable — never invented values
    return Response.json(
      { ok: false, reason: "NODE0_UNREACHABLE: the runtime on 127.0.0.1:7421 did not answer — nothing invented" },
      { status: 502 },
    );
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}
