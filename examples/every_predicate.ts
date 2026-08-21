/**
 * Every predicate the grammar has, and what each one asks.
 *
 * The interesting one is `capabilities`. Gating on a runtime says which implementation you
 * had in mind; gating on a capability says what the code needs, and it keeps working when a
 * fourth runtime turns up with the same capability.
 *
 * ```bash
 * deno run --allow-env examples/every_predicate.ts
 * ```
 */

import {
  all,
  allFeatures,
  always,
  any,
  anyFeature,
  arch,
  capabilities,
  contextFromStrings,
  custom,
  feature,
  never,
  not,
  notFeature,
  notTarget,
  platform,
  runtime,
  target,
  targetAll,
  targetAny,
} from "../mod.ts";
import type { Predicate } from "../mod.ts";

const context = contextFromStrings("deno-linux-x64", ["net", "fs"]);
const withCustom = {
  ...context,
  customPredicates: { release: () => true },
};

const cases: Predicate[] = [
  feature("net"),
  notFeature("gpu"),
  allFeatures("net", "fs"),
  anyFeature("gpu", "net"),

  target("deno"),
  target("deno-linux-x64"),
  target({ runtime: "deno", platform: "linux" }),
  notTarget("browser"),
  targetAll({ runtime: "deno" }, { platform: "linux" }),
  targetAny("node", "deno"),

  runtime("deno"),
  platform("linux"),
  arch("x64"),

  // deno has webgpu and node does not, so this is the axis that a build actually branches on
  capabilities("webgpu"),
  capabilities("ffi", "net"),

  all(feature("net"), target("deno")),
  any(target("node"), target("bun")),
  not(target("browser")),

  always(),
  never(),

  // an unrecognised call is read as a custom predicate, so `release()` needs no ceremony
  custom("release"),
];

for (const predicate of cases) {
  const answer = predicate.evaluate(withCustom);
  console.log(`${answer ? "yes" : "no "}  ${predicate.describe()}`);
}
