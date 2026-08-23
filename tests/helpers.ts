/**
 * Helpers shared by the suites here.
 *
 * `context` existed byte for byte in two of them. A copied helper is one that
 * can drift, and two suites disagreeing about what an evaluation context looks
 * like would each be testing something slightly different while reading as if
 * they agreed.
 *
 * @module
 */

import { featureId } from "@hiisi/ft-flags";
import type { FeatureId } from "@hiisi/ft-flags";
import { targetId } from "@hiisi/tgts";
import type { EvaluationContext } from "../src/types.ts";

/** An evaluation context for one target, with the named features on. */
export function context(
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
