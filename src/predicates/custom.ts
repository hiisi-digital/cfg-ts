/**
 * @module cfg-ts/predicates/custom
 *
 * The escape hatch: a condition cfg-ts does not know how to ask.
 */

import type { CustomPredicate, EvaluationContext, Predicate } from "../types.ts";
import { PredicateEvaluationError } from "../errors.ts";

/**
 * A predicate resolved by name from the build's own table.
 *
 * Written in source exactly like the built-in ones, and resolved from
 * {@link EvaluationContext.customPredicates} when the transformer runs. This is what keeps
 * cfg-ts from growing a case for every project-specific condition somebody wants to gate
 * on: a build that knows about, say, whether it is a release, registers `release` and writes
 * `@cfg(release())`.
 *
 * An unregistered name throws rather than answering false. A false would strip the code and
 * take its references with it, and the error would surface somewhere else entirely, which is
 * the expensive failure. See {@link PredicateEvaluationError}.
 *
 * @example
 * ```ts
 * // in source
 * // @cfg(custom("release"))
 *
 * // in the build
 * { customPredicates: { release: () => Deno.env.get("PROFILE") === "release" } }
 * ```
 */
export function custom(name: string, ...args: unknown[]): CustomPredicate {
  const frozen = Object.freeze([...args]);
  const self: CustomPredicate = {
    type: "custom",
    name,
    args: frozen,
    evaluate(context: EvaluationContext): boolean {
      const evaluator = context.customPredicates?.[name];
      if (evaluator === undefined) {
        throw new PredicateEvaluationError(
          `no evaluator is registered for the custom predicate "${name}". Register one under ` +
            `that name in the transformer's customPredicates, or remove the @cfg that uses it.`,
          self,
        );
      }
      return evaluator(frozen, context);
    },
    describe(): string {
      const shown = frozen.map((a) => JSON.stringify(a)).join(", ");
      return shown === "" ? `${name}()` : `${name}(${shown})`;
    },
  };
  return self;
}

/** Whether `predicate` is the shape {@link custom} builds. */
export function isCustomPredicate(predicate: Predicate): predicate is CustomPredicate {
  return predicate.type === "custom";
}
