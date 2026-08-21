/**
 * The decorator form, on the declarations TypeScript actually permits one on.
 *
 * A class and its members take `@cfg(...)` natively: this file typechecks with no plugin and
 * no transformer, because a decorator is legal there. Everywhere else, `@cfg` is legal to
 * the parser and rejected by the checker's grammar pass, which is what the language service
 * plugin suppresses and what the comment form sidesteps entirely.
 *
 * At runtime `cfg` returns its argument, so this file runs untransformed and every method is
 * present. Running it under the transformer is what removes the ones this target does not
 * want, and the second half of the file shows that.
 *
 * ```bash
 * deno run --allow-env examples/the_decorator_form.ts
 * ```
 */

import { capabilities, cfg, contextFromStrings, target, transformSource } from "../mod.ts";

@cfg(target("deno"))
export class DenoRenderer {
  @cfg(capabilities("webgpu"))
  gpu(): string {
    return "webgpu";
  }

  cpu(): string {
    return "cpu";
  }
}

const renderer = new DenoRenderer();
console.log("untransformed, every method is present:", renderer.gpu(), renderer.cpu());

// The same source, put through the transformer for a target without webgpu.
const source = `export class Renderer {
  @cfg(capabilities("webgpu"))
  gpu(): string { return "webgpu"; }

  cpu(): string { return "cpu"; }
}
`;

for (const name of ["deno", "node"]) {
  const { code } = transformSource(source, "renderer.ts", contextFromStrings(name));
  console.log(`\n========== ${name}`);
  console.log(code.trim());
}
