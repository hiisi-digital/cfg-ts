/**
 * @module cfg-ts/predicates
 *
 * Everything that builds or evaluates a `@cfg` condition.
 */

export { all, always, any, constant, never, not } from "./combinators.ts";
export { allFeatures, anyFeature, feature, isFeaturePredicate, notFeature } from "./feature.ts";
export {
  arch,
  capabilities,
  isTargetPredicate,
  notTarget,
  platform,
  runtime,
  target,
  targetAll,
  targetAny,
} from "./target.ts";
export { custom, isCustomPredicate } from "./custom.ts";
export { evaluate, formatEvaluationResult } from "./evaluate.ts";

export type {
  AllPredicate,
  AnyPredicate,
  ConstantPredicate,
  CustomPredicate,
  EvaluationContext,
  EvaluationResult,
  FeaturePredicate,
  NotPredicate,
  Predicate,
  PredicateType,
  TargetPredicate,
} from "../types.ts";
