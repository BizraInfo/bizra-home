/**
 * BIZRA Node0 — CONSTITUTION-PORTABILITY-1C focused adversarial suite.
 * Tests the logical-slot contract: historical path = provenance, current slot = location, hash = identity.
 * Each test physically manufactures the adversarial state and observes HALT or PASS.
 */
import { describe, test, expect } from "bun:test";
import { mkdtempSync, cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, symlinkSync, unlinkSync, existsSync, statSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

const SERVICE = import.meta.dir + "/..";
const STATE_SRC = join(SERVICE, "state");

function sha256hex(buf: Buffer | string) { return createHash("sha256").update(buf).digest("hex"); }

function seedRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "bizra-1c-focused-"));
  const state = join(root, "state");
  mkdirSync(state, { recursive: true });
  for (const f of ["bizra.db","bizra.db-wal","bizra.db-shm"]) if (existsSync(join(STATE_SRC,f))) cpSync(join(STATE_SRC,f), join(state,f));
  for (const d of ["vault","shoulder","outbox"]) try { cpSync(join(STATE_SRC,d), join(state,d), {recursive:true}); } catch {}
  mkdirSync(join(root,"keys"),{recursive:true});
  return root;
}

async function bootHealth(root: string, mode="LOCAL_FOUNDER"): Promise<any> {
  const port = 19600 + Math.floor(Math.random()*1000);
  const proc = spawn("bun",["index.ts"],{cwd:SERVICE, env:{...process.env, BIZRA_STATE_ROOT:root, BIZRA_RUNTIME_MODE:mode, BIZRA_BIND_HOST:"127.0.0.1", BIZRA_PORT:String(port)} as any, stdio:["ignore","pipe","pipe"]});
  let stderr=""; proc.stderr.on("data",(d:any)=>{stderr+=String(d);});
  const deadline=Date.now()+8000;
  let base="";
  while(Date.now()<deadline){
    try{ const r=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(700)}); if(r.ok){ base=`http://127.0.0.1:${port}`; break; } }catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  if(!base){ proc.kill(9); throw new Error("no boot "+stderr.slice(-500)); }
  const h=await (await fetch(base+"/api/health")).json();
  const v=await (await fetch(base+"/api/verify")).json();
  proc.kill(9);
  await new Promise(r=>setTimeout(r,100));
  return { health:h, verify:v, root };
}

describe("1C focused portability", () => {
  test("same bytes + different historical path → PASS (relocation)", async () => {
    const root=seedRoot();
    const {health}=await bootHealth(root);
    expect(health.status).toBe("LIVE");
    expect(health.node0_active).toBe(true);
    // DB still has /home/z/... provenance, but current slot has same bytes
    const dbPath=join(root,"state","bizra.db");
    const {Database}=require("bun:sqlite");
    const db=new Database(dbPath,{readonly:true});
    const row=db.query("SELECT path FROM constitution LIMIT 1").get() as any;
    db.close();
    expect(row.path).toContain("/home/z/");
    // But health is LIVE → historical path treated as provenance only
    rmSync(root,{recursive:true,force:true});
  });

  test("same bytes + trusted current logical slot → PASS", async () => {
    const root=seedRoot();
    // Verify that current vault files hash to sealed digests
    const {verify}=await bootHealth(root);
    expect(verify.constitution.verified).toBe(true);
    expect(verify.constitution.drift.length).toBe(0);
    rmSync(root,{recursive:true,force:true});
  });

  test("byte drift → HALT", async () => {
    const root=seedRoot();
    const vaultFile=join(root,"state","vault","themassage.pdf");
    const orig=readFileSync(vaultFile);
    writeFileSync(vaultFile, Buffer.concat([orig, Buffer.from("drift")]));
    const {health,verify}=await bootHealth(root);
    expect(health.status).toBe("HALTED");
    expect(verify.constitution.verified).toBe(false);
    expect(verify.constitution.drift.join(",")).toMatch(/themassage/);
    rmSync(root,{recursive:true,force:true});
  });

  test("symlink → HALT", async () => {
    const root=seedRoot();
    const vaultFile=join(root,"state","vault","themassage.pdf");
    const target=join(tmpdir(),"bizra-symlink-target-"+Math.random().toString(36).slice(2));
    writeFileSync(target, readFileSync(vaultFile));
    unlinkSync(vaultFile);
    symlinkSync(target, vaultFile);
    const {health,verify}=await bootHealth(root);
    expect(health.status).toBe("HALTED");
    expect(verify.constitution.drift.join(",")).toMatch(/symlink/);
    rmSync(root,{recursive:true,force:true});
    try{unlinkSync(target);}catch{}
  });

  test("non-regular file (directory) → HALT", async () => {
    const root=seedRoot();
    const vaultFile=join(root,"state","vault","bizra.pdf");
    const orig=readFileSync(vaultFile);
    unlinkSync(vaultFile);
    mkdirSync(vaultFile);
    const {health,verify}=await bootHealth(root);
    expect(health.status).toBe("HALTED");
    expect(verify.constitution.drift.join(",")).toMatch(/not a regular file|unreadable/);
    rmSync(root,{recursive:true,force:true});
  });

  test("state-root escape (traversal) → HALT", async () => {
    // Directly test the containment logic by checking that a name with .. would be rejected
    // Our fixed vault names are safe, but we verify the code rejects escape via lstat on a crafted path
    // For this test, we place a file outside the vault and try to verify via symlink escape
    const root=seedRoot();
    const vaultDir=join(root,"state","vault");
    const outside=join(root,"state","outside.pdf");
    writeFileSync(outside, Buffer.from("outside"));
    const vaultFile=join(vaultDir,"bizra.pdf");
    unlinkSync(vaultFile);
    // Create a symlink that points outside
    symlinkSync(outside, vaultFile);
    const {health}=await bootHealth(root);
    expect(health.status).toBe("HALTED");
    rmSync(root,{recursive:true,force:true});
  });

  test("missing artifact → HALT", async () => {
    const root=seedRoot();
    unlinkSync(join(root,"state","vault","BIZRA_Third_Fact_v0_1_FINAL.pdf"));
    const {health,verify}=await bootHealth(root);
    expect(health.status).toBe("HALTED");
    expect(verify.constitution.drift.length).toBeGreaterThan(0);
    rmSync(root,{recursive:true,force:true});
  });

  test("historical DB record not rewritten (provenance preserved)", async () => {
    const root=seedRoot();
    const dbPath=join(root,"state","bizra.db");
    const {Database}=require("bun:sqlite");
    const before=new Database(dbPath,{readonly:true}).query("SELECT path FROM constitution LIMIT 1").get() as any;
    const {health}=await bootHealth(root);
    expect(health.status).toBe("LIVE");
    const after=new Database(dbPath,{readonly:true}).query("SELECT path FROM constitution LIMIT 1").get() as any;
    expect(after.path).toBe(before.path);
    expect(after.path).toContain("/home/z/");
    rmSync(root,{recursive:true,force:true});
  });

  test("physical immutability NOT CLAIMED (law is hash-sealed)", async () => {
    const root=seedRoot();
    const {health}=await bootHealth(root);
    expect(health.status).toBe("LIVE");
    // Check the constitution law via health or verify
    const {verify}=await bootHealth(root);
    // The law is in the constitution sealing receipt, but we can check the vault law via state
    // Instead, directly check the source file law
    const src=readFileSync(join(SERVICE,"src","constitution.ts"),"utf8");
    expect(src).toContain("hash-sealed");
    expect(src).not.toMatch(/unchangeable even by its author/);
    rmSync(root,{recursive:true,force:true});
  });
});
