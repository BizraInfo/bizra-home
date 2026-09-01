/**
 * BIZRA Node0 — bootstrap entry (LOCAL-SOVEREIGN-BOUNDARY-1A).
 *
 * Commission sequence: CONSTRUCTION -> SEAL the constitution -> SEALED -> LIVE.
 * Once LIVE, the engine serves the constitutional loop:
 *   PAT (proposer) · SAT (deterministic verifier) · FATE (membrane) ·
 *   bounded effects · independent observer · sealed receipts · Dema (status relay).
 *
 * Transport (post-boundary): the browser talks SAME-ORIGIN /api/node0/* to the
 * app's fixed server-side proxy, which forwards to 127.0.0.1:7421. No
 * caller-selected ports, no wildcard CORS. The constitution is verified on
 * every boot; drift => HALT, nothing proceeds.
 *
 * This entry resolves the runtime mode FIRST — the store and the listener open
 * only after the boundary policy passes. Bind failure exits with a named RED
 * and persists nothing (R11).
 */
async function main() {
  const server = await import("./src/server");
  server.start();
}

main().catch((e: any) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
