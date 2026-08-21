/**
 * @module
 *
 * The predicate layer: what each shape answers, and the cases that would pass without the
 * mechanism actually being there.
 */

import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { featureId } from "@hiisi/ft-flags";
import type { FeatureId } from "@hiisi/ft-flags";
import { targetId } from "@hiisi/tgts";
import type { EvaluationContext } from "../src/types.ts";
import {
  all,
  allFeatures,
  always,
  any,
  anyFeature,
  arch,
  capabilities,
  custom,
  evaluate,
  feature,
  formatEvaluationResult,
  never,
  not,
  notFeature,
  notTarget,
  platform,
  runtime,
  target,
  targetAll,
  targetAny,
} from "../src/predicates/mod.ts";
import { PredicateEvaluationError } from "../src/errors.ts";

/** A context, with the fiddly branding done once. */
function context(
  targetName: string,
  features: string[] = [],
  customPredicates: EvaluationContext["customPredicates"] = undefined,
): EvaluationContext {
  return {
    target: targetId(targetName),
    enabledFeatures: new Set<FeatureId>(features.map(featureId)),
    ...(customPredicates ? { customPredicates } : {}),
  };
}

Deno.test("feature is true exactly when the id is in the enabled set", () => {
  assert(feature("net").evaluate(context("deno", ["net"])));
  assertFalse(feature("net").evaluate(context("deno", [])));
  // A different feature being on is not this one being on. Without this, an implementation
  // that answered "is anything enabled" would satisfy the two assertions above.
  assertFalse(feature("net").evaluate(context("deno", ["fs"])));
});

Deno.test("a malformed feature id is refused when the predicate is built", () => {
  // Not when it is evaluated. A predicate that is quietly false strips the code it guards
  // and takes its references with it, so the error surfaces in a file nobody was editing.
  assertThrows(() => feature(""));
  assertThrows(() => feature("Not A Feature Id"));
});

Deno.test("notFeature inverts, and does not merely return false", () => {
  assert(notFeature("net").evaluate(context("deno", [])));
  assertFalse(notFeature("net").evaluate(context("deno", ["net"])));
});

Deno.test("allFeatures and anyFeature over several ids", () => {
  const both = context("deno", ["net", "fs"]);
  const one = context("deno", ["net"]);
  assert(allFeatures("net", "fs").evaluate(both));
  assertFalse(allFeatures("net", "fs").evaluate(one));
  assert(anyFeature("net", "fs").evaluate(one));
  assertFalse(anyFeature("net", "fs").evaluate(context("deno", [])));
});

Deno.test("the empty combinators are conjunction and disjunction over nothing", () => {
  // Both are what makes `all(...list)` behave when the list is empty, which is the case a
  // build hits when a target has no conditions rather than the case anybody writes by hand.
  assert(all().evaluate(context("deno")));
  assertFalse(any().evaluate(context("deno")));
  assert(allFeatures().evaluate(context("deno")));
  assertFalse(anyFeature().evaluate(context("deno")));
});

Deno.test("all short-circuits, so a later predicate that would throw is not reached", () => {
  const ctx = context("deno", []);
  // custom with no registered evaluator throws. If `all` did not stop at the first false,
  // this would throw instead of answering.
  assertFalse(all(feature("absent"), custom("unregistered")).evaluate(ctx));
});

Deno.test("any short-circuits on the first true", () => {
  const ctx = context("deno", ["net"]);
  assert(any(feature("net"), custom("unregistered")).evaluate(ctx));
});

Deno.test("not inverts its child", () => {
  assert(not(never()).evaluate(context("deno")));
  assertFalse(not(always()).evaluate(context("deno")));
});

Deno.test("always and never answer the same whatever they are asked", () => {
  for (const t of ["deno", "node", "bun", "browser"]) {
    assert(always().evaluate(context(t)));
    assertFalse(never().evaluate(context(t)));
  }
});

Deno.test("target matches an id, and the axes an id leaves out are free", () => {
  assert(target("deno").evaluate(context("deno")));
  assert(target("deno").evaluate(context("deno-linux-x64")));
  assertFalse(target("deno").evaluate(context("node")));
  // The reverse: a pattern naming three axes does not match a target naming one.
  assertFalse(target("deno-linux-x64").evaluate(context("deno")));
});

Deno.test("a malformed target id is refused when the predicate is built", () => {
  assertThrows(() => target("nonesuch"));
  assertThrows(() => target("deno-linux-x64-extra"));
});

Deno.test("the axis shorthands constrain one axis each", () => {
  assert(runtime("node").evaluate(context("node-linux-x64")));
  assertFalse(runtime("node").evaluate(context("deno-linux-x64")));
  assert(platform("linux").evaluate(context("node-linux-x64")));
  assertFalse(platform("linux").evaluate(context("node-darwin-x64")));
  assert(arch("x64").evaluate(context("node-linux-x64")));
  assertFalse(arch("x64").evaluate(context("node-linux-arm64")));
});

Deno.test("capabilities matches on what a runtime can do rather than which one it is", () => {
  // The case the predicate exists for: deno has webgpu and node does not, and a build that
  // gates on the capability keeps working when a fourth runtime arrives with it.
  assert(capabilities("webgpu").evaluate(context("deno")));
  assertFalse(capabilities("webgpu").evaluate(context("node")));
  // And both have ffi, so this is not just "deno yes, node no" wearing another name.
  assert(capabilities("ffi").evaluate(context("deno")));
  assert(capabilities("ffi").evaluate(context("node")));
});

Deno.test("an object pattern constrains only the axes it names", () => {
  assert(target({ runtime: "node" }).evaluate(context("node-darwin-arm64")));
  assert(target({ platform: "darwin" }).evaluate(context("node-darwin-arm64")));
  assertFalse(target({ platform: "linux" }).evaluate(context("node-darwin-arm64")));
});

Deno.test("targetAll, targetAny and notTarget", () => {
  assert(targetAny("node", "bun").evaluate(context("bun")));
  assertFalse(targetAny("node", "bun").evaluate(context("deno")));
  assert(targetAll({ runtime: "deno" }, { platform: "linux" }).evaluate(context("deno-linux")));
  assert(notTarget("browser").evaluate(context("deno")));
  assertFalse(notTarget("deno").evaluate(context("deno")));
});

Deno.test("a custom predicate resolves from the build's table", () => {
  const ctx = context("deno", [], { release: () => true, debug: () => false });
  assert(custom("release").evaluate(ctx));
  assertFalse(custom("debug").evaluate(ctx));
});

Deno.test("a custom predicate is handed its arguments", () => {
  const seen: unknown[][] = [];
  const ctx = context("deno", [], {
    atLeast: (args) => {
      seen.push([...args]);
      return (args[0] as number) <= 3;
    },
  });
  assert(custom("atLeast", 2).evaluate(ctx));
  assertFalse(custom("atLeast", 9).evaluate(ctx));
  assertEquals(seen, [[2], [9]]);
});

Deno.test("an unregistered custom predicate throws rather than answering false", () => {
  // The whole reason it throws. A false would strip the guarded code silently.
  assertThrows(
    () => custom("nobody").evaluate(context("deno")),
    PredicateEvaluationError,
    "no evaluator is registered",
  );
});

Deno.test("describe gives back the source form", () => {
  assertEquals(feature("net").describe(), 'feature("net")');
  assertEquals(target("deno").describe(), 'target("deno")');
  assertEquals(runtime("node").describe(), 'target({ runtime: "node" })');
  assertEquals(not(feature("net")).describe(), 'not(feature("net"))');
  assertEquals(
    all(feature("a"), any(target("node"), target("bun"))).describe(),
    'all(feature("a"), any(target("node"), target("bun")))',
  );
  assertEquals(always().describe(), "always()");
  assertEquals(never().describe(), "never()");
  assertEquals(custom("release").describe(), "release()");
  assertEquals(custom("atLeast", 3).describe(), "atLeast(3)");
});

Deno.test("evaluate reports every failing condition, not the first", () => {
  // The difference from the fast path, and the point of having a slow one. A reader asking
  // why their code was stripped wants all the reasons.
  const why = evaluate(all(feature("a"), feature("b"), feature("c")), context("deno", ["b"]));
  assertFalse(why.result);
  assertEquals(why.children?.length, 3);
  assert(why.reason.includes('feature("a")'));
  assert(why.reason.includes('feature("c")'));
  assertFalse(why.reason.includes('feature("b") is false'));
});

Deno.test("evaluate on a true all says so", () => {
  const why = evaluate(all(feature("a"), target("deno")), context("deno", ["a"]));
  assert(why.result);
  assert(why.reason.includes("every condition held"));
});

Deno.test("formatEvaluationResult nests the children under their parent", () => {
  const why = evaluate(all(feature("a"), target("node")), context("deno", ["a"]));
  const shown = formatEvaluationResult(why);
  const lines = shown.split("\n");
  assertEquals(lines.length, 3);
  assert(lines[0]!.startsWith("- all("));
  assert(lines[1]!.startsWith("  + "));
  assert(lines[2]!.startsWith("  - "));
});
