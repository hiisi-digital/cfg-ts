/**
 * @module cfg-ts/predicates/combinators
 *
 * The three ways predicates compose, and the two that answer without asking.
 */

import type {
  AllPredicate,
  AnyPredicate,
  ConstantPredicate,
  EvaluationContext,
  NotPredicate,
  Predicate,
} from "../types.ts";

/**
 * Build one of the two quantifiers.
 *
 * `all` and `any` differ in exactly one thing: which answer lets them stop
 * early. `all` stops at the first false and is otherwise true; `any` stops at
 * the first true and is otherwise false. Spelling the loop out twice made two
 * places where the short-circuit could be got wrong, and they were 98 per cent
 * identical for the reason that they are the same fold with one bit flipped.
 *
 * @param type Which quantifier this is, which is also how it describes itself.
 * @param stopAt The result that ends the loop, and the answer when it does.
 */
function quantifier<T extends "all" | "any">(
  type: T,
  stopAt: boolean,
  predicates: readonly Predicate[],
): { readonly type: T; readonly predicates: readonly Predicate[] } & Predicate {
  const frozen = Object.freeze([...predicates]);
  return {
    type,
    predicates: frozen,
    evaluate(context: EvaluationContext): boolean {
      for (const predicate of frozen) {
        if (predicate.evaluate(context) === stopAt) return stopAt;
      }
      return !stopAt;
    },
    describe(): string {
      return `${type}(${frozen.map((p) => p.describe()).join(", ")})`;
    },
  };
}

/**
 * True when every argument is true.
 *
 * Short-circuits on the first false, so a predicate that would be expensive or would throw
 * is not reached once the answer is settled. `all()` with no arguments is true, which is
 * conjunction over an empty set and is what makes `all(...list)` behave when `list` is
 * empty.
 *
 * @example
 * ```ts
 * all(feature("net"), target("deno"))
 * ```
 */
export function all(...predicates: Predicate[]): AllPredicate {
  return quantifier("all", false, predicates);
}

/**
 * True when some argument is true.
 *
 * Short-circuits on the first true. `any()` with no arguments is false, which is
 * disjunction over an empty set.
 *
 * @example
 * ```ts
 * any(target("node"), target("bun"))
 * ```
 */
export function any(...predicates: Predicate[]): AnyPredicate {
  return quantifier("any", true, predicates);
}

/**
 * True when its argument is false.
 *
 * @example
 * ```ts
 * not(target("browser"))
 * ```
 */
export function not(predicate: Predicate): NotPredicate {
  return {
    type: "not",
    predicate,
    evaluate(context: EvaluationContext): boolean {
      return !predicate.evaluate(context);
    },
    describe(): string {
      return `not(${predicate.describe()})`;
    },
  };
}

/**
 * The same answer whatever it is asked.
 *
 * Both `always()` and `never()` build this. It exists as a shape rather than as two special
 * cases because a predicate whose answer is already known collapses to it, which is what
 * lets a caller substitute one for a subtree without the rest of the code learning a
 * second form.
 */
export function constant(value: boolean): ConstantPredicate {
  return {
    type: "constant",
    value,
    evaluate(): boolean {
      return value;
    },
    describe(): string {
      return value ? "always()" : "never()";
    },
  };
}

/** Always true. Keeps the code it decorates under every configuration. */
export function always(): ConstantPredicate {
  return constant(true);
}

/**
 * Always false.
 *
 * Worth having as more than a curiosity: it is how a piece of code is taken out of every
 * build without deleting it, which is what a bisect wants.
 */
export function never(): ConstantPredicate {
  return constant(false);
}
