/**
 * Feature predicate for @cfg decorator
 *
 * Creates predicates that evaluate to true when a feature flag is enabled.
 * Integrates with @hiisi/ft-flags for feature state lookup.
 *
 * @module
 */

import type { Predicate, PredicateContext } from "../types.ts";

/**
 * Creates a predicate that checks if a feature is enabled.
 *
 * @param featureId - The feature ID to check (e.g., "shimp.fs")
 * @returns A predicate that evaluates to true if the feature is enabled
 *
 * TODO: Implement integration with @hiisi/ft-flags
 * - Look up feature in the context's feature registry
 * - Handle hierarchical features (parent.child notation)
 * - Return false if feature is not registered (with optional warning)
 *
 * @example
 * ```ts
 * @cfg(feature("shimp.fs"))
 * export function readFile() { ... }
 * ```
 */
export function feature(featureId: string): Predicate {
  return {
    type: "feature",
    id: featureId,
    evaluate: (_context: PredicateContext): boolean => {
      // TODO: Get feature registry from context
      // TODO: Call isEnabled(featureId, registry) from @hiisi/ft-flags
      // TODO: Return evaluation result
      throw new Error(`Not implemented: feature predicate for "${featureId}"`);
    },
    toString: (): string => `feature("${featureId}")`,
  };
}

/**
 * Creates a predicate that checks if a feature is NOT enabled.
 *
 * @param featureId - The feature ID to check
 * @returns A predicate that evaluates to true if the feature is disabled
 *
 * TODO: Implement as negation of feature()
 *
 * @example
 * ```ts
 * @cfg(notFeature("deprecated.oldApi"))
 * export function newApi() { ... }
 * ```
 */
export function notFeature(featureId: string): Predicate {
  const inner = feature(featureId);
  return {
    type: "not-feature",
    id: featureId,
    evaluate: (context: PredicateContext): boolean => {
      // TODO: Negate the inner predicate result
      return !inner.evaluate(context);
    },
    toString: (): string => `not(feature("${featureId}"))`,
  };
}

/**
 * Creates a predicate that checks if any of the specified features are enabled.
 *
 * @param featureIds - The feature IDs to check
 * @returns A predicate that evaluates to true if ANY feature is enabled
 *
 * TODO: Implement as disjunction of feature predicates
 *
 * @example
 * ```ts
 * @cfg(anyFeature("shimp.fs", "shimp.env"))
 * export function readConfig() { ... }
 * ```
 */
export function anyFeature(...featureIds: string[]): Predicate {
  const predicates = featureIds.map(feature);
  return {
    type: "any-feature",
    ids: featureIds,
    evaluate: (context: PredicateContext): boolean => {
      // TODO: Check each predicate, return true if any is true
      return predicates.some((p) => p.evaluate(context));
    },
    toString: (): string => `anyFeature(${featureIds.map((id) => `"${id}"`).join(", ")})`,
  };
}

/**
 * Creates a predicate that checks if all of the specified features are enabled.
 *
 * @param featureIds - The feature IDs to check
 * @returns A predicate that evaluates to true if ALL features are enabled
 *
 * TODO: Implement as conjunction of feature predicates
 *
 * @example
 * ```ts
 * @cfg(allFeatures("shimp.fs", "shimp.env"))
 * export function fullSystemAccess() { ... }
 * ```
 */
export function allFeatures(...featureIds: string[]): Predicate {
  const predicates = featureIds.map(feature);
  return {
    type: "all-features",
    ids: featureIds,
    evaluate: (context: PredicateContext): boolean => {
      // TODO: Check each predicate, return true only if all are true
      return predicates.every((p) => p.evaluate(context));
    },
    toString: (): string => `allFeatures(${featureIds.map((id) => `"${id}"`).join(", ")})`,
  };
}
