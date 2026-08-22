/**
 * Every task this package declares can actually run.
 *
 * Deno does not check that a `deno task X` inside a task body names a task that
 * exists. It fails at the moment somebody runs it, and the task most likely to
 * carry the reference is `all`, which is the task somebody runs before a
 * release. So the person who finds it is the person least able to shrug it off.
 *
 * This was not hypothetical: removing two `:local` tasks left `all` calling
 * `deno task check:local`, and nothing would have said so.
 *
 * @module
 */

import { assert, assertEquals } from "@std/assert";

const MANIFEST = new URL("../deno.json", import.meta.url);

interface Manifest {
  readonly tasks?: Record<string, string>;
}

function tasks(): Record<string, string> {
  const doc = JSON.parse(Deno.readTextFileSync(MANIFEST)) as Manifest;
  assert(doc.tasks !== undefined, "the manifest declares no tasks at all");
  return doc.tasks;
}

Deno.test("no task calls a task that does not exist", () => {
  const declared = tasks();
  const names = new Set(Object.keys(declared));

  const dangling: string[] = [];
  for (const [name, body] of Object.entries(declared)) {
    for (const called of body.matchAll(/deno task ([\w:.-]+)/g)) {
      const target = called[1];
      if (target !== undefined && !names.has(target)) {
        dangling.push(`${name} calls ${target}`);
      }
    }
  }

  assertEquals(dangling, [], `tasks naming tasks that do not exist: ${dangling.join(", ")}`);
});

Deno.test("the check that finds a dangling reference can actually find one", () => {
  // the control, over the same matcher rather than over a description of it: a
  // law that only ever sees a correct manifest cannot say whether it discriminates.
  const declared = { ...tasks(), broken: "deno task no-such-task-exists" };
  const names = new Set(Object.keys(tasks()));

  const dangling = Object.entries(declared).flatMap(([name, body]) =>
    [...body.matchAll(/deno task ([\w:.-]+)/g)]
      .map((m) => m[1])
      .filter((t): t is string => t !== undefined && !names.has(t))
      .map((t) => `${name} calls ${t}`)
  );

  assertEquals(dangling, ["broken calls no-such-task-exists"]);
});
