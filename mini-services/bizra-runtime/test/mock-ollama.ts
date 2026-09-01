/**
 * BIZRA Node0 — TEST-ONLY deterministic mock Ollama (LOCAL-MODEL-PROVIDER-1A §12).
 *
 * Because this environment has NO real Ollama installation, the protocol is
 * proven against this tiny LOOPBACK mock. The mock:
 *   - binds 127.0.0.1 only, and only a caller-chosen test port;
 *   - is fully deterministic (fixed models, fixed responses, fixed digests);
 *   - makes ZERO external requests;
 *   - contains NO actual language model — only fixture strings;
 *   - labels every response `x-bizra-provider: TEST_PROVIDER`;
 *   - lives in test/ and is NEVER imported by any src/ module, so it can
 *     never be reachable in a production configuration.
 *
 * The model names below (test-gemma, test-qwen, …) are TEST FIXTURES with
 * SYNTHETIC digests. They are not installed real models and are never
 * presented as such.
 *
 * Emulated protocol surface (exactly what the provider uses):
 *   GET  /api/tags   → { models: [{ name, digest, modified_at, size, details }] }
 *   POST /api/show   → model details (identity metadata)
 *   POST /api/generate (stream=false) → { model, created_at, response, done }
 */
import { createHash } from "node:crypto";

export const TEST_PROVIDER_LABEL = "TEST_PROVIDER";

export interface MockModelSpec {
  name: string;
  digest: string;
  family: string;
  parameter_size: string;
  quantization_level: string;
  size: number;
  modified_at: string;
  /** Deterministic generate response body (fixture text — no LLM). */
  responseText?: string;
  /** Delay before /api/generate answers (timeout drills). */
  delayMs?: number;
  /** Non-200 HTTP status for /api/generate (failure drills). */
  generateStatus?: number;
  /** Raw malformed body override for /api/generate (protocol-error drills). */
  rawBody?: string;
}

export interface MockRequestLog {
  method: string;
  path: string;
  model?: string;
  at: number;
}

export interface MockOllama {
  port: number;
  url: string;
  requests: MockRequestLog[];
  stop(): Promise<void>;
}

/** Synthetic fixture digest — derived from a fixture seed, clearly not a real model blob hash. */
export function syntheticDigest(seed: string): string {
  return "sha256-" + createHash("sha256").update(`mock-fixture:${seed}`).digest("hex");
}

export const TEST_GEMMA = "test-gemma:latest";
export const TEST_QWEN = "test-qwen:latest";
export const TEST_GEMMA_DIGEST = syntheticDigest("test-gemma");
export const TEST_QWEN_DIGEST = syntheticDigest("test-qwen");

/** Allocate a free loopback port by binding to 0, reading the assigned port, then closing.
 * This is the only honest way to claim "nothing listening" — we control allocation. */
export async function getFreePort(): Promise<number> {
  const tmp = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { open() {}, data() {} } });
  const port = (tmp as any).port;
  tmp.stop();
  await new Promise((r) => setTimeout(r, 10));
  return port;
}

/** A well-formed deterministic morning-brief fixture (SAT-shaped, but inert). */
export function validBriefFixture(mission: string, date: string): string {
  return (
    `# BIZRA NODE0 morning delta brief\n\n` +
    `Mission ${mission} for ${date}. Node0 is LIVE under the sealed constitution. ` +
    `Drift prevented at its cause. The measured contract set is stable; the chain walks from genesis. ` +
    `What is measured: ${mission} signals; what is verified: chain integrity; what remains unknown: ` +
    `long-horizon drift. This fixture brief is deterministic test text produced by the TEST_PROVIDER mock. ` +
    `It contains no authority, no commands, and no hidden channels. Honest tone: state what is measured, ` +
    `what is verified, what remains unknown.`
  );
}

/**
 * Start the mock. `redirect` emulates a loopback server redirecting a path to a
 * NON-loopback destination (refusal drills) — the mock never actually contacts
 * that destination; it only emits the 3xx + Location header.
 */
export function startMockOllama(opts: {
  port: number;
  models: MockModelSpec[];
  redirect?: { paths: string[]; to: string };
}): Promise<MockOllama> {
  const requests: MockRequestLog[] = [];
  const headers = { "content-type": "application/json", "x-bizra-provider": TEST_PROVIDER_LABEL };
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: opts.port,
    async fetch(req): Promise<Response> {
      const url = new URL(req.url);
      const path = url.pathname;
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        /* non-JSON body — recorded, answered 400 below */
      }
      requests.push({ method: req.method, path, model: typeof body?.model === "string" ? body.model : undefined, at: Date.now() });

      if (opts.redirect && opts.redirect.paths.includes(path)) {
        return new Response(null, { status: 302, headers: { location: opts.redirect.to } });
      }

      if (req.method === "GET" && path === "/api/tags") {
        return Response.json(
          {
            models: opts.models.map((m) => ({
              name: m.name,
              model: m.name,
              digest: m.digest,
              modified_at: m.modified_at,
              size: m.size,
              details: {
                family: m.family,
                parameter_size: m.parameter_size,
                quantization_level: m.quantization_level,
              },
            })),
          },
          { headers },
        );
      }

      if (req.method === "POST" && path === "/api/show") {
        const m = opts.models.find((x) => x.name === body?.model);
        if (!m) return Response.json({ error: `model '${body?.model}' not found` }, { status: 404, headers });
        return Response.json(
          {
            model: m.name,
            digest: m.digest,
            modified_at: m.modified_at,
            details: { family: m.family, parameter_size: m.parameter_size, quantization_level: m.quantization_level },
          },
          { headers },
        );
      }

      if (req.method === "POST" && path === "/api/generate") {
        const m = opts.models.find((x) => x.name === body?.model);
        if (!m) return Response.json({ error: `model '${body?.model}' not found` }, { status: 404, headers });
        if (m.delayMs) await new Promise((r) => setTimeout(r, m.delayMs));
        const status = m.generateStatus ?? 200;
        if (m.rawBody !== undefined) return new Response(m.rawBody, { status, headers });
        if (status !== 200) return Response.json({ error: `mock generate failure for ${m.name}` }, { status, headers });
        return Response.json(
          {
            model: m.name,
            created_at: new Date().toISOString(),
            response: m.responseText ?? "ok",
            done: true,
            done_reason: "stop",
          },
          { headers },
        );
      }

      return Response.json({ error: `mock: no such route ${path}` }, { status: 404, headers });
    },
  });
  return Promise.resolve({
    port: opts.port,
    url: `http://127.0.0.1:${opts.port}`,
    requests,
    stop: async () => {
      server.stop(true);
      await new Promise((r) => setTimeout(r, 60));
    },
  });
}

/** A raw loopback TCP connection counter — used to prove PUBLIC mode never touches a port.
 * The port must be a free port obtained via getFreePort() — never assume a
 * well-known port like 11434 is free when real Ollama occupies it. If the
 * port is unexpectedly occupied, we fail closed with a clear error rather than
 * inventing a zero. */
export function loopbackProbeCounter(port: number): { count: number; stop(): void } {
  const state = { count: 0 };
  const listener = Bun.listen({
    hostname: "127.0.0.1",
    port,
    socket: {
      open() {
        state.count++;
      },
      data() {
        /* swallow bytes — we only count connections */
      },
    },
  });
  return { get count() { return state.count; }, stop() { listener.stop(); } };
}
