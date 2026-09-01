/**
 * Minimal ambient Bun type context for the boundary-1A typecheck gate.
 * Zero dependencies (LOCAL-SOVEREIGN-BOUNDARY-1A: "No new dependency unless the
 * same result is physically impossible with what is present"). These are
 * narrowly-typed declarations for exactly the Bun surfaces this service uses;
 * they exist so `tsc --noEmit` can typecheck the touched runtime path. They are
 * NOT a full Bun SDK type definition — runtime behavior is Bun's; this file
 * only satisfies the typechecker for the constructs in use.
 */
interface ImportMeta {
  readonly dir: string;
}

declare const Bun: {
  serve(options: {
    port?: number;
    hostname?: string;
    fetch: (req: Request) => Response | Promise<Response>;
    [key: string]: unknown;
  }): {
    port: number;
    stop(force?: boolean): void;
    [key: string]: unknown;
  };
  listen(options: {
    port?: number;
    hostname?: string;
    socket: { open?(...args: unknown[]): void; data?(...args: unknown[]): void; [key: string]: unknown };
    [key: string]: unknown;
  }): { stop(force?: boolean): void; [key: string]: unknown };
};

declare module "bun:sqlite" {
  export class Database {
    constructor(path: string, options?: { create?: boolean; readonly?: boolean } | number);
    query(sql: string): {
      get(...params: unknown[]): any;
      all(...params: unknown[]): any[];
      run(...params: unknown[]): unknown;
    };
    exec(sql: string): void;
    close(): void;
  }
}

declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>, timeoutOrOpts?: number | { timeout?: number }): void;
  export function beforeAll(fn: () => void | Promise<void>, timeoutOrOpts?: number | { timeout?: number }): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export const expect: any;
}
