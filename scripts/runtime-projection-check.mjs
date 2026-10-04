#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROUTE = join(ROOT, "src/app/api/node0/[...path]/route.ts");
const RUNTIME_URL = process.env.BIZRA_RUNTIME_PROJECTION_URL ?? "http://127.0.0.1:3000/api/node0/state";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function sourceObservation() {
  try {
    const bytes = readFileSync(SOURCE_ROUTE);
    return {
      present: statSync(SOURCE_ROUTE).isFile(),
      sha256: sha256(bytes),
    };
  } catch {
    return { present: false, sha256: null };
  }
}

export function classifyObservation(sourcePresent, response) {
  if (!sourcePresent) return "SOURCE_ROUTE_MISSING";
  if (!response.reachable) return "RUNTIME_UNREACHABLE";
  if (response.status === 404) {
    return response.content_type?.includes("text/html")
      ? "SOURCE_PRESENT_RUNTIME_ROUTE_MISSING"
      : "PROXY_PRESENT_GATEWAY_ROUTE_MISSING";
  }
  if (response.status !== 200) return "RUNTIME_ROUTE_REFUSED";
  if (response.json?.ok !== true) return "RUNTIME_RESPONSE_NOT_VERIFIED";
  return "RUNTIME_ROUTE_VERIFIED";
}

async function observeRuntime() {
  try {
    const response = await fetch(RUNTIME_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    const body = await response.text();
    let json = null;
    try {
      json = JSON.parse(body);
    } catch {
      // A 404 HTML page is useful evidence of a stale or wrong projection.
    }
    return {
      reachable: true,
      status: response.status,
      content_type: response.headers.get("content-type"),
      body_sha256: sha256(body),
      json,
    };
  } catch (error) {
    return {
      reachable: false,
      status: null,
      content_type: null,
      body_sha256: null,
      error: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      json: null,
    };
  }
}

function selfTest() {
  assert.equal(classifyObservation(false, { reachable: true, status: 200, json: { ok: true } }), "SOURCE_ROUTE_MISSING");
  assert.equal(classifyObservation(true, { reachable: false, status: null, json: null }), "RUNTIME_UNREACHABLE");
  assert.equal(classifyObservation(true, { reachable: true, status: 404, content_type: "text/html", json: null }), "SOURCE_PRESENT_RUNTIME_ROUTE_MISSING");
  assert.equal(classifyObservation(true, { reachable: true, status: 404, content_type: "application/json", json: null }), "PROXY_PRESENT_GATEWAY_ROUTE_MISSING");
  assert.equal(classifyObservation(true, { reachable: true, status: 200, json: { ok: false } }), "RUNTIME_RESPONSE_NOT_VERIFIED");
  assert.equal(classifyObservation(true, { reachable: true, status: 200, json: { ok: true } }), "RUNTIME_ROUTE_VERIFIED");
  console.log(JSON.stringify({ schema: "bizra.runtime_projection_check.v1", self_test: "PASS", authority_delta: 0 }, null, 2));
}

async function main() {
  const source = sourceObservation();
  const runtime = await observeRuntime();
  const classification = classifyObservation(source.present, runtime);
  const report = {
    schema: "bizra.runtime_projection_check.v1",
    observed_at: new Date().toISOString(),
    subject: {
      source_route: "src/app/api/node0/[...path]/route.ts",
      runtime_url: RUNTIME_URL,
    },
    source,
    runtime,
    classification,
    authority_delta: 0,
    effect_executed: false,
    services_touched: 0,
    proof_ceiling: "Read-only source/runtime projection correspondence; no deployment, restart, or Node0 closure claim.",
  };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = classification === "RUNTIME_ROUTE_VERIFIED" ? 0 : 2;
}

if (process.argv.includes("--self-test")) selfTest();
else await main();
