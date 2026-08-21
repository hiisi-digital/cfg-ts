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
  const frozen = Object.freeze([...predicates]);
  return {
    type: "all",
    predicates: frozen,
    evaluate(context: EvaluationContext): boolean {
      for (const predicate of frozen) {
        if (!predicate.evaluate(context)) return false;
      }
      return true;
    },
    describe(): string {
      return `all(${frozen.map((p) => p.describe()).join(", ")})`;
    },
  };
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
  const frozen = Object.freeze([...predicates]);
  return {
    type: "any",
    predicates: frozen,
    evaluate(context: EvaluationContext): boolean {
      for (const predicate of frozen) {
        if (predicate.evaluate(context)) return true;
      }
      return false;
    },
    describe(): string {
      return `any(${frozen.map((p) => p.describe()).join(", ")})`;
    },
  };
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
