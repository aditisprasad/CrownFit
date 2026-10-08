// Minimal typings so `bun test` files typecheck without pulling global Bun types.
declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(v: unknown): { toBe(x: unknown): void; toBeNull(): void };
}
