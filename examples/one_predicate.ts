/**
 * The smallest thing cfg-ts does: one condition, evaluated against one build.
 *
 * Run it with:
 *
 * ```bash
 * deno run --allow-env examples/one_predicate.ts
 * ```
 */

import { contextFromStrings, feature, target } from "../mod.ts";

const forDeno = contextFromStrings("deno", ["net"]);
const forNode = contextFromStrings("node", []);

const isDeno = target("deno");
const hasNet = feature("net");

console.log(isDeno.describe(), "against deno:", isDeno.evaluate(forDeno));
console.log(isDeno.describe(), "against node:", isDeno.evaluate(forNode));
console.log(hasNet.describe(), "with net on:", hasNet.evaluate(forDeno));
console.log(hasNet.describe(), "with net off:", hasNet.evaluate(forNode));
