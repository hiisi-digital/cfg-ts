/**
 * One source file, three targets, three different outputs.
 *
 * This is what cfg-ts is for. The source below is written once and carries the declarations
 * every runtime needs. What comes out for each target is only that target's half, with the
 * markers gone, which is the same thing Rust's `#[cfg]` does to a module.
 *
 * ```bash
 * deno run --allow-env examples/strip_for_a_target.ts
 * ```
 */

import { contextFromStrings, transformSource } from "../mod.ts";

const source = `import type { Handle } from "./handle.ts";

//@cfg(target("deno"))
export async function readText(path: string): Promise<string> {
  return await Deno.readTextFile(path);
}

//@cfg(any(target("node"), target("bun")))
export async function readText(path: string): Promise<string> {
  const fs = await import("node:fs/promises");
  return await fs.readFile(path, "utf8");
}

//@cfg(capabilities("webgpu"))
export function gpuAdapter(): Promise<GPUAdapter | null> {
  return navigator.gpu.requestAdapter();
}

export function shared(handle: Handle): string {
  return String(handle);
}
`;

for (const name of ["deno", "node", "bun"]) {
  const { code, stats } = transformSource(source, "io.ts", {
    ...contextFromStrings(name),
  });
  console.log(`========== ${name}`);
  console.log(code.trim());
  console.log(
    `---------- kept ${stats.elementsKept}, stripped ${stats.elementsStripped}\n`,
  );
}
