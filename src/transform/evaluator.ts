/**
 * @module cfg-ts/transform/evaluator
 *
 * Turning transformer options into the context a predicate is asked against.
 */

import { featureId } from "@hiisi/ft-flags";
import { targetId } from "@hiisi/tgts";
import type { EvaluationContext, Predicate, TransformerOptions } from "../types.ts";
import { evaluate, formatEvaluationResult } from "../predicates/evaluate.ts";

export { formatEvaluationResult };

/**
 * The context a build's options describe.
 *
 * @example
 * ```ts
 * const context = createEvaluationContext({
 *   target: targetId("deno"),
 *   enabledFeatures: new Set([featureId("net")]),
 * });
 * ```
 */
export function createEvaluationContext(options: TransformerOptions): EvaluationContext {
  return {
    target: options.target,
    enabledFeatures: options.enabledFeatures,
    ...(options.customPredicates ? { customPredicates: options.customPredicates } : {}),
    ...(options.custom ? { custom: options.custom } : {}),
  };
}

/**
 * A context from plain strings.
 *
 * For a caller holding configuration rather than branded values: a CLI, a config file, a
 * test. Both ids are validated here, so a malformed one fails while the build is still
 * reading its own configuration rather than at the first predicate that happens to use it.
 */
export function contextFromStrings(
  target: string,
  features: readonly string[] = [],
  rest: Omit<Partial<EvaluationContext>, "target" | "enabledFeatures"> = {},
): EvaluationContext {
  return {
    target: targetId(target),
    enabledFeatures: new Set(features.map(featureId)),
    ...rest,
  };
}

/**
 * Whether a predicate holds, and why.
 *
 * The fast path is `predicate.evaluate(context)` and is what the transformer uses when it
 * only needs the answer. This one does not short-circuit, so the reason names every
 * condition that failed rather than the first.
 */
export function evaluatePredicate(
  predicate: Predicate,
  context: EvaluationContext,
): { result: boolean; reason: string } {
  const evaluated = evaluate(predicate, context);
  return { result: evaluated.result, reason: evaluated.reason };
}
