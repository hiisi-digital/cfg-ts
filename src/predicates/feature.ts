/**
 * @module cfg-ts/predicates/feature
 *
 * Predicates over the feature set a build was configured with.
 */

import { featureId } from "@hiisi/ft-flags";
import type { EvaluationContext, FeaturePredicate, Predicate } from "../types.ts";
import { all, any, not } from "./combinators.ts";

/**
 * True when `id` is one of the build's enabled features.
 *
 * The id is validated here rather than at evaluation, so a typo in a `@cfg` is a build
 * error at the point it was written instead of a silently false predicate that strips code
 * nobody meant to strip. That failure is the expensive one, because a stripped declaration
 * takes its references with it and the error surfaces somewhere else entirely.
 *
 * Resolution is against {@link EvaluationContext.enabledFeatures}, which the build fills
 * from ft-flags after it has resolved implications. A feature enabled only because another
 * feature implies it is in that set, so this sees it.
 *
 * @example
 * ```ts
 * feature("shimp.fs")
 * ```
 */
export function feature(id: string): FeaturePredicate {
  const validated = featureId(id);
  return {
    type: "feature",
    featureId: validated,
    evaluate(context: EvaluationContext): boolean {
      return context.enabledFeatures.has(validated);
    },
    describe(): string {
      return `feature("${id}")`;
    },
  };
}

/** True when `id` is not enabled. */
export function notFeature(id: string): Predicate {
  return not(feature(id));
}

/** True when every id is enabled. `allFeatures()` with no arguments is true. */
export function allFeatures(...ids: string[]): Predicate {
  return all(...ids.map(feature));
}

/** True when some id is enabled. `anyFeature()` with no arguments is false. */
export function anyFeature(...ids: string[]): Predicate {
  return any(...ids.map(feature));
}

/** Whether `predicate` is the shape {@link feature} builds. */
export function isFeaturePredicate(predicate: Predicate): predicate is FeaturePredicate {
  return predicate.type === "feature";
}
