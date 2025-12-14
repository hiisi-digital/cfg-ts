/**
 * @module cfg-ts/predicates
 *
 * Predicate system for evaluating @cfg conditions.
 * Predicates can check feature flags, targets, or combine multiple conditions.
 */

export { all, any, not } from "./combinators.ts";
export { evaluate } from "./evaluate.ts";
export { feature, featureAll, featureAny } from "./feature.ts";
export { target, targetAll, targetAny } from "./target.ts";

export type { Predicate, PredicateContext, PredicateResult } from "./types.ts";
