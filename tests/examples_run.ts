/**
 * @module
 *
 * Every example runs, and produces the output its own prose says it does.
 *
 * An example that does not run is worse than no example: a reader copies it, it fails, and
 * the failure reads as their mistake. So each one is executed here rather than only
 * type-checked, and the assertions are on what it printed.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";

const ROOT = dirname(dirname(fromFileUrl(import.meta.url)));
const EXAMPLES = join(ROOT, "examples");
const CONFIG = join(ROOT, "deno.local.json");

async function run(name: string): Promise<string> {
  const { success, stdout, stderr } = await new Deno.Command(Deno.execPath(), {
    args: ["run", "--config", CONFIG, "--allow-env", join(EXAMPLES, name)],
    cwd: ROOT,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const out = new TextDecoder().decode(stdout);
  const err = new TextDecoder().decode(stderr);
  assert(success, `${name} failed:\n${err}`);
  return out;
}

Deno.test("every example in the directory is covered by a test here", async () => {
  // Without this, adding an example and forgetting to test it is invisible: the tests below
  // all still pass and the new file is never run.
  const covered = new Set([
    "one_predicate.ts",
    "every_predicate.ts",
    "strip_for_a_target.ts",
    "the_decorator_form.ts",
  ]);
  const present = new Set<string>();
  for await (const entry of Deno.readDir(EXAMPLES)) {
    if (entry.isFile && entry.name.endsWith(".ts")) present.add(entry.name);
  }
  assertEquals([...present].sort(), [...covered].sort());
});

Deno.test("one_predicate answers differently for the two builds", async () => {
  const out = await run("one_predicate.ts");
  assertStringIncludes(out, 'target("deno") against deno: true');
  assertStringIncludes(out, 'target("deno") against node: false');
  assertStringIncludes(out, 'feature("net") with net on: true');
  assertStringIncludes(out, 'feature("net") with net off: false');
});

Deno.test("every_predicate runs each one and none of them throws", async () => {
  const out = await run("every_predicate.ts");
  const lines = out.trim().split("\n");
  assertEquals(lines.length, 21, "the example lists 21 predicates");
  // Both answers appear, so the example is showing a spread rather than a column of yes.
  assert(lines.some((line) => line.startsWith("yes")));
  assert(lines.some((line) => line.startsWith("no")));
  assertStringIncludes(out, 'yes  target({ capabilities: ["webgpu"] })');
});

Deno.test("strip_for_a_target gives each runtime its own half", async () => {
  const out = await run("strip_for_a_target.ts");
  const [, deno = "", node = "", bun = ""] = out.split(/^========== /m);

  assertStringIncludes(deno, "Deno.readTextFile");
  assert(!deno.includes("node:fs/promises"), "deno kept the node implementation");
  assertStringIncludes(deno, "gpuAdapter");

  assertStringIncludes(node, "node:fs/promises");
  assert(!node.includes("Deno.readTextFile"), "node kept the deno implementation");
  assert(!node.includes("gpuAdapter"), "node has no webgpu and kept the gpu function");

  assertStringIncludes(bun, "node:fs/promises");
  assert(!bun.includes("gpuAdapter"));

  // The shared declaration survives everywhere, which is what says the transformer removed
  // the guarded declarations rather than a region of the file.
  for (const output of [deno, node, bun]) {
    assertStringIncludes(output, "export function shared");
    assertStringIncludes(output, "import type { Handle }");
    assert(!output.includes("@cfg"), "a marker survived into the output");
  }
});

Deno.test("the_decorator_form runs untransformed and strips when transformed", async () => {
  const out = await run("the_decorator_form.ts");
  // cfg returns its argument at runtime, so an untransformed file keeps every method.
  assertStringIncludes(out, "untransformed, every method is present: webgpu cpu");
  const [, deno = "", node = ""] = out.split(/^========== /m);
  assertStringIncludes(deno, "gpu()");
  assert(!node.includes("gpu()"), "node has no webgpu and kept the method");
  assertStringIncludes(node, "cpu()");
});
