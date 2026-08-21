/**
 * @module
 *
 * The transformer, checked by what it emits rather than by what it counts.
 *
 * Every case asserts on the output text and on the statistics, because either alone passes
 * while the other is wrong: a stat is a number the transformer chose, and output that
 * happens to look right can come from a visitor that never ran.
 */

import { assert, assertEquals, assertFalse, assertStringIncludes, assertThrows } from "@std/assert";
import { featureId } from "@hiisi/ft-flags";
import type { FeatureId } from "@hiisi/ft-flags";
import { targetId } from "@hiisi/tgts";
import ts from "typescript";
import { transformSource } from "../src/transform/mod.ts";
import { findCfgDecorators } from "../src/transform/detector.ts";
import type { TransformerOptions } from "../src/types.ts";
import { InvalidCfgUsageError } from "../src/errors.ts";

function options(
  target: string,
  features: string[] = [],
  rest: Partial<TransformerOptions> = {},
): TransformerOptions {
  return {
    target: targetId(target),
    enabledFeatures: new Set<FeatureId>(features.map(featureId)),
    ...rest,
  };
}

/** Whether text parses as TypeScript with no syntax errors. */
function parses(code: string): boolean {
  const file = ts.createSourceFile("t.ts", code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  return ((file as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics ?? []).length === 0;
}

Deno.test("TS1206 is a grammar check, not a parse error", () => {
  // The finding the whole non-class half of this package rests on. If the parser rejected a
  // decorator on a function declaration, no transformer could read one, and the comment form
  // would be the only option. It does not: the decorator is attached and no parse diagnostic
  // is produced. The checker raises TS1206 later, which is what the plugin suppresses.
  const source = '@cfg(feature("a"))\nexport function f() { return 1; }\n';
  assert(parses(source));
  const file = ts.createSourceFile("t.ts", source, ts.ScriptTarget.ESNext, true);
  const statement = file.statements[0]!;
  const modifiers = (statement as unknown as { modifiers?: readonly ts.Node[] }).modifiers ?? [];
  assertEquals(modifiers.filter((m) => ts.isDecorator(m as ts.Decorator)).length, 1);
});

Deno.test("a false predicate strips the declaration", () => {
  const source = `@cfg(target("node"))
export function nodeOnly() { return 1; }

export function always() { return 2; }
`;
  const { code, stats } = transformSource(source, "m.ts", options("deno"));
  assertFalse(code.includes("nodeOnly"));
  assertStringIncludes(code, "always");
  assertEquals(stats.elementsStripped, 1);
  assertEquals(stats.decoratorsFound, 1);
  assert(parses(code));
});

Deno.test("a true predicate keeps the declaration and removes the decorator", () => {
  // The decorator has to go: left in, the output calls a runtime no-op and drags an import
  // of this package into a build that no longer needs it.
  const source = `@cfg(target("deno"))
export function denoOnly() { return 1; }
`;
  const { code, stats } = transformSource(source, "m.ts", options("deno"));
  assertStringIncludes(code, "denoOnly");
  assertFalse(code.includes("@cfg"));
  assertEquals(stats.elementsKept, 1);
  assertEquals(stats.elementsStripped, 0);
  assert(parses(code));
});

Deno.test("a file with no cfg comes back byte-identical", () => {
  // The control for every test above. Without it, a transformer that reprinted everything
  // would satisfy them all while reformatting every file it touched.
  const source =
    "export const x = 1;\n\n\n//    a comment with odd    spacing\nexport const y = 2;\n";
  const { code, stats } = transformSource(source, "m.ts", options("deno"));
  assertEquals(code, source);
  assertEquals(stats.decoratorsFound, 0);
});

Deno.test("the comment form works where a decorator is not valid syntax", () => {
  const source = `//@cfg(target("node"))
export const nodeValue = 1;

//@cfg(target("deno"))
export const denoValue = 2;
`;
  const { code, stats } = transformSource(source, "m.ts", options("deno"));
  assertFalse(code.includes("nodeValue"));
  assertStringIncludes(code, "denoValue");
  assertFalse(code.includes("@cfg"));
  assertEquals(stats.elementsStripped, 1);
  assertEquals(stats.elementsKept, 1);
  assert(parses(code));
});

Deno.test("both forms are the same grammar", () => {
  // So a consumer learns one vocabulary. If they diverged, one of these would strip and the
  // other would not.
  const predicate = 'all(feature("net"), target("deno"))';
  const decorated = `@cfg(${predicate})\nexport function f() { return 1; }\n`;
  const commented = `//@cfg(${predicate})\nexport function f() { return 1; }\n`;
  for (const opts of [options("deno", ["net"]), options("deno", []), options("node", ["net"])]) {
    const a = transformSource(decorated, "m.ts", opts);
    const b = transformSource(commented, "m.ts", opts);
    assertEquals(
      a.code.includes("function f"),
      b.code.includes("function f"),
      `the two forms disagreed for ${opts.target}`,
    );
  }
});

Deno.test("classes and methods strip, which is the natively decoratable half", () => {
  const source = `export class K {
  @cfg(target("node"))
  nodeMethod() { return 1; }

  @cfg(target("deno"))
  denoMethod() { return 2; }
}
`;
  const { code, stats } = transformSource(source, "m.ts", options("deno"));
  assertFalse(code.includes("nodeMethod"));
  assertStringIncludes(code, "denoMethod");
  assertEquals(stats.elementsStripped, 1);
  assert(parses(code));
});

Deno.test("two cfg on one node are a conjunction", () => {
  const source = `@cfg(target("deno"))
@cfg(feature("net"))
export function both() { return 1; }
`;
  assertFalse(
    transformSource(source, "m.ts", options("deno", [])).code.includes("both"),
    "one false should be enough",
  );
  assertFalse(
    transformSource(source, "m.ts", options("node", ["net"])).code.includes("both"),
    "the other false should also be enough",
  );
  assertStringIncludes(
    transformSource(source, "m.ts", options("deno", ["net"])).code,
    "both",
  );
});

Deno.test("stub keeps the name and throws with the predicate in the message", () => {
  const source = `@cfg(target("node"))
export function nodeOnly(): number { return 1; }
`;
  const { code, stats } = transformSource(
    source,
    "m.ts",
    options("deno", [], { falseAction: "stub" }),
  );
  assertStringIncludes(code, "nodeOnly");
  assertStringIncludes(code, "throw new Error");
  assertStringIncludes(code, "was excluded from this build");
  // The printed literal escapes its inner quotes, so the predicate reads as target(\"node\").
  assertStringIncludes(code, "target(");
  assertStringIncludes(code, "node");
  assertFalse(code.includes("return 1"));
  assertEquals(stats.elementsStubbed, 1);
  assertEquals(stats.elementsStripped, 0);
  assert(parses(code));
});

Deno.test("stub on a declaration with no body is refused rather than silently stripped", () => {
  // The caller asked for a name that still resolves, and a variable has nowhere to put the
  // throw. Quietly stripping it would give them the opposite of what they asked for.
  const source = `//@cfg(target("node"))
export const nodeValue = 1;
`;
  assertThrows(
    () => transformSource(source, "m.ts", options("deno", [], { falseAction: "stub" })),
    InvalidCfgUsageError,
    "nowhere to put the throw",
  );
});

Deno.test("keep leaves a false declaration in, and warn reports it", () => {
  const source = `@cfg(target("node"))
export function nodeOnly() { return 1; }
`;
  const kept = transformSource(source, "m.ts", options("deno", [], { falseAction: "keep" }));
  assertStringIncludes(kept.code, "return 1");
  assertEquals(kept.diagnostics.length, 0);

  const warned = transformSource(source, "m.ts", options("deno", [], { falseAction: "warn" }));
  assertStringIncludes(warned.code, "return 1");
  assertEquals(warned.diagnostics.length, 1);
  assertEquals(warned.diagnostics[0]!.severity, "warning");
});

Deno.test("preserveDecorators keeps the marker, as a comment where a decorator cannot print", () => {
  // TypeScript's printer emits a decorator on a class and silently drops one on a function
  // declaration, because the grammar says it cannot be there. So preserving outside the
  // class forms has to use the comment form, which prints everywhere and is the same
  // grammar. Measured against the printer, not assumed.
  const onFunction = transformSource(
    '@cfg(target("deno"))\nexport function f() { return 1; }\n',
    "m.ts",
    options("deno", [], { preserveDecorators: true }),
  );
  assertStringIncludes(onFunction.code, "@cfg");
  assertStringIncludes(onFunction.code, "//");

  const onClass = transformSource(
    '@cfg(target("deno"))\nexport class K {}\n',
    "m.ts",
    options("deno", [], { preserveDecorators: true }),
  );
  assertStringIncludes(onClass.code, "@cfg");
});

Deno.test("a preserved file transformed again makes the same decisions", () => {
  // What preserving is for: the marker has to survive as something the grammar still reads,
  // or it is a comment in the decorative sense rather than in the directive one.
  const source = '@cfg(target("node"))\nexport function nodeOnly() { return 1; }\n';
  const preserved = transformSource(
    source,
    "m.ts",
    options("deno", [], {
      preserveDecorators: true,
      falseAction: "keep",
    }),
  );
  assertStringIncludes(preserved.code, "nodeOnly");

  const again = transformSource(preserved.code, "m.ts", options("deno"));
  assertFalse(again.code.includes("nodeOnly"), "the preserved marker was not read back");
  assertEquals(again.stats.elementsStripped, 1);
});

Deno.test("a predicate that cannot answer is an error and the code is kept", () => {
  // Stripping on a failure would remove code for a reason nobody stated, and the error would
  // surface as a missing name in a file nobody was editing.
  const source = `@cfg(unregistered())
export function f() { return 1; }
`;
  const { code, diagnostics } = transformSource(source, "m.ts", options("deno"));
  assertStringIncludes(code, "function f");
  assertEquals(diagnostics.length, 1);
  assertEquals(diagnostics[0]!.severity, "error");
  assertStringIncludes(diagnostics[0]!.message, "no evaluator is registered");
});

Deno.test("a custom predicate the build registered decides", () => {
  const source = `@cfg(release())
export function f() { return 1; }
`;
  const on = transformSource(
    source,
    "m.ts",
    options("deno", [], {
      customPredicates: { release: () => true },
    }),
  );
  const off = transformSource(
    source,
    "m.ts",
    options("deno", [], {
      customPredicates: { release: () => false },
    }),
  );
  assertStringIncludes(on.code, "function f");
  assertFalse(off.code.includes("function f"));
});

Deno.test("a diagnostic carries the position the cfg was written at", () => {
  const source = `export const a = 1;
export const b = 2;
@cfg(unregistered())
export function f() { return 1; }
`;
  const { diagnostics } = transformSource(source, "m.ts", options("deno"));
  assertEquals(diagnostics[0]!.line, 3);
  assertEquals(diagnostics[0]!.file, "m.ts");
});

Deno.test("the detector reports both forms in source order", () => {
  const source = `//@cfg(target("deno"))
export const a = 1;

@cfg(target("node"))
export function b() { return 2; }
`;
  const found = findCfgDecorators(
    ts.createSourceFile("m.ts", source, ts.ScriptTarget.ESNext, true),
  );
  assertEquals(found.length, 2);
  assertEquals(found[0]!.form, "comment");
  assertEquals(found[1]!.form, "decorator");
  assertEquals(found[0]!.predicate.describe(), 'target("deno")');
});

Deno.test("stripping a declaration leaves the rest of a real file intact", () => {
  const source = `import { readFile } from "./io.ts";

export interface Config { readonly name: string; }

//@cfg(target("node"))
export const runtimeName = "node";

//@cfg(target("deno"))
export const runtimeName2 = "deno";

export function load(path: string): Promise<string> {
  return readFile(path);
}

export class Loader {
  constructor(private readonly config: Config) {}

  @cfg(capabilities("webgpu"))
  gpu(): string { return "gpu"; }

  name(): string { return this.config.name; }
}
`;
  const { code } = transformSource(source, "m.ts", options("deno"));
  assert(parses(code));
  assertFalse(code.includes("runtimeName ="));
  assertStringIncludes(code, "runtimeName2");
  assertStringIncludes(code, "import { readFile }");
  assertStringIncludes(code, "interface Config");
  assertStringIncludes(code, "class Loader");
  // deno has webgpu, so the method stays.
  assertStringIncludes(code, "gpu()");

  const onNode = transformSource(source, "m.ts", options("node"));
  assert(parses(onNode.code));
  assertFalse(onNode.code.includes("gpu()"));
  assertStringIncludes(onNode.code, 'runtimeName = "node"');
});
