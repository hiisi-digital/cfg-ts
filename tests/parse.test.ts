/**
 * @module
 *
 * Reading a predicate out of source text. Every case here goes through the same grammar the
 * transformer uses on a decorator node, so a divergence between the two is a failure here.
 */

import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { parsePredicate, PREDICATE_NAMES } from "../src/parse.ts";
import { PredicateParseError } from "../src/errors.ts";
import { context } from "./helpers.ts";

Deno.test("a parsed predicate round-trips through describe", () => {
  // The strongest cheap check available: parsing and describing are written independently,
  // so a source form that survives both is one the grammar and the printer agree on.
  const sources = [
    'feature("net")',
    'not(feature("net"))',
    'all(feature("a"), feature("b"))',
    'any(target("node"), target("bun"))',
    'target("deno-linux-x64")',
    'target({ runtime: "node", platform: "linux" })',
    'target({ capabilities: ["fs.read", "fs.write"] })',
    "always()",
    "never()",
  ];
  for (const source of sources) {
    assertEquals(parsePredicate(source).describe(), source);
  }
});

Deno.test("the parsed predicate evaluates the same as the written one", () => {
  const ctx = context("deno-linux-x64", ["net"]);
  assert(parsePredicate('feature("net")').evaluate(ctx));
  assertFalse(parsePredicate('feature("fs")').evaluate(ctx));
  assert(parsePredicate('all(feature("net"), target("deno"))').evaluate(ctx));
  assertFalse(parsePredicate('all(feature("net"), target("node"))').evaluate(ctx));
  assert(parsePredicate('any(target("node"), target("deno"))').evaluate(ctx));
  assert(parsePredicate('target({ capabilities: ["webgpu"] })').evaluate(ctx));
});

Deno.test("the axis shorthands and the feature helpers parse", () => {
  const ctx = context("node-linux-x64", ["a", "b"]);
  assert(parsePredicate('runtime("node")').evaluate(ctx));
  assert(parsePredicate('platform("linux")').evaluate(ctx));
  assert(parsePredicate('arch("x64")').evaluate(ctx));
  assert(parsePredicate('allFeatures("a", "b")').evaluate(ctx));
  assert(parsePredicate('anyFeature("a", "z")').evaluate(ctx));
  assert(parsePredicate('notFeature("z")').evaluate(ctx));
  assert(parsePredicate('notTarget("deno")').evaluate(ctx));
  assert(parsePredicate('targetAny("node", "bun")').evaluate(ctx));
  assert(parsePredicate('capabilities("ffi")').evaluate(ctx));
});

Deno.test("a namespaced call is read by its last segment", () => {
  // `import * as cfg` is a normal way to bring the API in, and `cfg.feature("net")` names
  // the same predicate as `feature("net")`.
  assert(parsePredicate('cfg.feature("net")').evaluate(context("deno", ["net"])));
  assert(parsePredicate('predicates.all(cfg.target("deno"))').evaluate(context("deno")));
});

Deno.test("an unrecognised call is read as a custom predicate", () => {
  // So `@cfg(release())` works without the ceremony of `custom("release")`. Whether the name
  // is registered is settled at evaluation, where the build's table is in hand.
  const ctx = context("deno", [], { release: () => true });
  assert(parsePredicate("release()").evaluate(ctx));
  assertEquals(parsePredicate("release()").type, "custom");
});

Deno.test("custom arguments come through as values", () => {
  let seen: readonly unknown[] = [];
  const ctx = context("deno", [], {
    check: (args) => {
      seen = args;
      return true;
    },
  });
  parsePredicate('check("a", 2, -3, true, false, null, ["x", 1])').evaluate(ctx);
  assertEquals(seen, ["a", 2, -3, true, false, null, ["x", 1]]);
});

Deno.test("a non-literal argument is refused rather than evaluated", () => {
  // The line the whole module is drawn along. A build reads a predicate without running the
  // module it came from, so anything that would have to be computed cannot be resolved.
  assertThrows(() => parsePredicate("feature(name)"), PredicateParseError);
  assertThrows(() => parsePredicate('feature("a" + "b")'), PredicateParseError);
  assertThrows(() => parsePredicate("check(compute())"), PredicateParseError);
});

Deno.test("a predicate that is not a call is refused", () => {
  assertThrows(() => parsePredicate('"deno"'), PredicateParseError);
  assertThrows(() => parsePredicate("true"), PredicateParseError);
  assertThrows(() => parsePredicate("someIdentifier"), PredicateParseError);
});

Deno.test("the wrong number of arguments is refused, with the count in the message", () => {
  assertThrows(
    () => parsePredicate("feature()"),
    PredicateParseError,
    "exactly one argument, and 0 were given",
  );
  assertThrows(
    () => parsePredicate('feature("a", "b")'),
    PredicateParseError,
    "exactly one argument, and 2 were given",
  );
  assertThrows(() => parsePredicate("not()"), PredicateParseError);
});

Deno.test("an unknown key in a target pattern is refused rather than ignored", () => {
  // Ignoring it would produce a pattern that matches more than it was written to, so code
  // that should have been stripped ships. That failure is invisible until something breaks
  // on a runtime nobody meant to support.
  assertThrows(
    () => parsePredicate('target({ runtim: "node" })'),
    PredicateParseError,
    "runtime, platform, architecture and capabilities",
  );
  assertThrows(() => parsePredicate('target({ os: "linux" })'), PredicateParseError);
});

Deno.test("capabilities must be an array of strings", () => {
  assertThrows(
    () => parsePredicate('target({ capabilities: "webgpu" })'),
    PredicateParseError,
    "array of strings",
  );
});

Deno.test("a parse error quotes the source it choked on", () => {
  try {
    parsePredicate("feature(name)");
    throw new Error("expected a throw");
  } catch (error) {
    assert(error instanceof PredicateParseError);
    assertEquals(error.predicateSource, "name");
    assert(error.message.includes("name"));
  }
});

Deno.test("every name the grammar handles is listed in PREDICATE_NAMES", () => {
  // The list drives completions and error messages, so a name the parser handles and the
  // list omits is a name the editor will not offer. Each is parsed with an argument shape it
  // accepts; the assertion is that none of them falls through to the custom branch.
  const witnesses: Record<string, string> = {
    all: 'all(feature("a"))',
    allFeatures: 'allFeatures("a")',
    always: "always()",
    any: 'any(feature("a"))',
    anyFeature: 'anyFeature("a")',
    arch: 'arch("x64")',
    capabilities: 'capabilities("ffi")',
    custom: 'custom("x")',
    feature: 'feature("a")',
    never: "never()",
    not: 'not(feature("a"))',
    notFeature: 'notFeature("a")',
    notTarget: 'notTarget("deno")',
    platform: 'platform("linux")',
    runtime: 'runtime("deno")',
    target: 'target("deno")',
    targetAll: 'targetAll("deno")',
    targetAny: 'targetAny("deno")',
  };
  assertEquals(
    Object.keys(witnesses).sort(),
    [...PREDICATE_NAMES].sort(),
    "PREDICATE_NAMES and the cases this test knows about have diverged",
  );
  for (const [name, source] of Object.entries(witnesses)) {
    const parsed = parsePredicate(source);
    if (name === "custom") {
      assertEquals(parsed.type, "custom");
      continue;
    }
    assertFalse(
      parsed.type === "custom",
      `${name} fell through to the custom branch, so the parser does not handle it`,
    );
  }
});
