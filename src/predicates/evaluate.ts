/**
 * @module cfg-ts/predicates/evaluate
 *
 * Evaluation with the working shown.
 */

import type { EvaluationContext, EvaluationResult, Predicate } from "../types.ts";
import type { AllPredicate, AnyPredicate, NotPredicate } from "../types.ts";

/**
 * Evaluate `predicate` and report why it came out that way.
 *
 * `predicate.evaluate(context)` is the fast path and is what the transformer calls. This is
 * the slow one, and it differs in more than bookkeeping: it does not short-circuit, so every
 * child of an `all(...)` is evaluated even after one has answered false. That is the point.
 * A reader asking why their code was stripped wants to know which conditions failed, not the
 * first one the evaluator happened to reach.
 *
 * The cost of not short-circuiting is that a child which throws will throw here when the
 * fast path would have skipped it. That is the same information arriving louder, and this
 * function is only ever called when somebody is already asking what went wrong.
 *
 * @example
 * ```ts
 * const why = evaluate(all(feature("a"), target("node")), context);
 * why.result;   // false
 * why.reason;   // 'all(...) is false: feature("a") is false'
 * ```
 */
export function evaluate(
  predicate: Predicate,
  context: EvaluationContext,
): EvaluationResult {
  switch (predicate.type) {
    case "all": {
      const children = (predicate as AllPredicate).predicates.map((p) => evaluate(p, context));
      const failed = children.filter((c) => !c.result);
      return {
        result: failed.length === 0,
        predicate,
        children,
        reason: failed.length === 0
          ? `${predicate.describe()} is true: every condition held`
          : `${predicate.describe()} is false: ${failed.map((f) => f.reason).join("; ")}`,
      };
    }
    case "any": {
      const children = (predicate as AnyPredicate).predicates.map((p) => evaluate(p, context));
      const held = children.filter((c) => c.result);
      return {
        result: held.length > 0,
        predicate,
        children,
        reason: held.length > 0
          ? `${predicate.describe()} is true: ${held.map((h) => h.reason).join("; ")}`
          : `${predicate.describe()} is false: no condition held`,
      };
    }
    case "not": {
      const child = evaluate((predicate as NotPredicate).predicate, context);
      return {
        result: !child.result,
        predicate,
        children: [child],
        reason: `${predicate.describe()} is ${!child.result}: ${child.reason}`,
      };
    }
    default: {
      const result = predicate.evaluate(context);
      return {
        result,
        predicate,
        reason: `${predicate.describe()} is ${result}`,
      };
    }
  }
}

/**
 * An {@link EvaluationResult} as an indented tree.
 *
 * For a diagnostic or a hover, where the nesting is what makes a long `all(any(...))`
 * readable at all.
 */
export function formatEvaluationResult(result: EvaluationResult, indent = 0): string {
  const pad = "  ".repeat(indent);
  const mark = result.result ? "+" : "-";
  const head = `${pad}${mark} ${result.predicate.describe()} => ${result.result}`;
  if (result.children === undefined || result.children.length === 0) return head;
  const rest = result.children
    .map((child) => formatEvaluationResult(child, indent + 1))
    .join("\n");
  return `${head}\n${rest}`;
}
