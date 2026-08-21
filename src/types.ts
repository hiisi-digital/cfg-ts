/**
 * @module cfg-ts/types
 *
 * The type vocabulary the rest of the package is written against: what a
 * predicate is, what it is evaluated against, and what the transformer does
 * with the answer.
 */

import type { FeatureId } from "@hiisi/ft-flags";
import type { TargetId, TargetPattern } from "@hiisi/tgts";

// =============================================================================
// Predicates
// =============================================================================

/**
 * A compile-time condition.
 *
 * Every predicate answers one question about an {@link EvaluationContext} and
 * can say what it asked. Nothing here is async: a predicate is evaluated while
 * a build is deciding whether to keep a piece of code, and a build that has to
 * wait on a predicate has the wrong kind of predicate.
 */
export interface Predicate {
  /** Which of the {@link PredicateType} shapes this is. */
  readonly type: PredicateType;
  /** Answer the question against `context`. */
  evaluate(context: EvaluationContext): boolean;
  /** The question, in the source form it was written in. */
  describe(): string;
}

/** The closed set of predicate shapes. */
export type PredicateType =
  | "feature"
  | "target"
  | "all"
  | "any"
  | "not"
  | "constant"
  | "custom";

/** True when a feature is enabled. */
export interface FeaturePredicate extends Predicate {
  readonly type: "feature";
  readonly featureId: FeatureId;
}

/** True when the target being built for matches a pattern. */
export interface TargetPredicate extends Predicate {
  readonly type: "target";
  readonly pattern: TargetPattern;
}

/** True when every child is true. Empty is true, as conjunction over nothing. */
export interface AllPredicate extends Predicate {
  readonly type: "all";
  readonly predicates: readonly Predicate[];
}

/** True when some child is true. Empty is false, as disjunction over nothing. */
export interface AnyPredicate extends Predicate {
  readonly type: "any";
  readonly predicates: readonly Predicate[];
}

/** True when its child is false. */
export interface NotPredicate extends Predicate {
  readonly type: "not";
  readonly predicate: Predicate;
}

/**
 * The same answer whatever it is asked.
 *
 * This is what `always()` and `never()` build, and it is also what an
 * unreachable branch collapses to once the surrounding predicates are known,
 * which is why it is a shape rather than a special case.
 */
export interface ConstantPredicate extends Predicate {
  readonly type: "constant";
  readonly value: boolean;
}

/**
 * A question the package does not know how to ask.
 *
 * Named at the call site and resolved from
 * {@link TransformerOptions.customPredicates} at build time, so a project can
 * gate on something only it knows about without cfg-ts growing a case for it.
 */
export interface CustomPredicate extends Predicate {
  readonly type: "custom";
  readonly name: string;
  readonly args: readonly unknown[];
}

/** Every predicate shape, as a union to switch on. */
export type AnyPredicateShape =
  | FeaturePredicate
  | TargetPredicate
  | AllPredicate
  | AnyPredicate
  | NotPredicate
  | ConstantPredicate
  | CustomPredicate;

// =============================================================================
// Evaluation
// =============================================================================

/**
 * What a predicate gets to look at.
 *
 * The target is a single id rather than a set, because a build produces one
 * output per target and each output is decided on its own. Building for two
 * targets is running this twice.
 */
export interface EvaluationContext {
  /** The target this output is being built for. */
  readonly target: TargetId;
  /** The features enabled for this build. */
  readonly enabledFeatures: ReadonlySet<FeatureId>;
  /** Evaluators for {@link CustomPredicate}, by name. */
  readonly customPredicates?: Readonly<
    Record<string, (args: readonly unknown[], context: EvaluationContext) => boolean>
  >;
  /** Anything a custom predicate needs and nothing else does. */
  readonly custom?: Readonly<Record<string, unknown>>;
}

/**
 * An evaluation with its working shown.
 *
 * The plain boolean is what the transformer acts on. This is what it reports
 * when asked why, and what the language service puts in a hover, so a reader
 * can see which half of an `all(...)` was the one that failed.
 */
export interface EvaluationResult {
  /** The answer. */
  readonly result: boolean;
  /** The predicate that gave it. */
  readonly predicate: Predicate;
  /** One entry per child, for the composite shapes. */
  readonly children?: readonly EvaluationResult[];
  /** The answer in words. */
  readonly reason: string;
}

// =============================================================================
// The decorator
// =============================================================================

/**
 * What `cfg(predicate)` returns.
 *
 * TypeScript permits a decorator on a class and on a class element and nowhere
 * else, so this is the only position where the returned function is ever
 * called. Everywhere else the transformer reads the decorator off the syntax
 * tree and the function is never reached. See {@link isNativelyDecoratable}.
 */
export type DecoratorFunction = <T>(value: T, context?: unknown) => T;

/** The type of the `cfg` export. */
export type CfgDecorator = (predicate: Predicate) => DecoratorFunction;

// =============================================================================
// Transformation
// =============================================================================

/**
 * What becomes of code whose predicate is false.
 *
 * `strip` is the default and the only one that removes the code from the
 * output. The other three exist because a stripped declaration takes its
 * references with it, and finding out which ones is easier when the
 * declaration is still there.
 */
export type CfgAction =
  /** Remove it. */
  | "strip"
  /** Keep the declaration, replace the body with a throw. */
  | "stub"
  /** Keep it, and report it. */
  | "warn"
  /** Keep it, silently. */
  | "keep";

/** How to transform one source file. */
export interface TransformerOptions {
  /** The target being built for. */
  readonly target: TargetId;
  /** The features enabled for this build. */
  readonly enabledFeatures: ReadonlySet<FeatureId>;
  /** What to do with false predicates. Defaults to `strip`. */
  readonly falseAction?: CfgAction;
  /** Keep the `@cfg` decorators in the output. Defaults to false. */
  readonly preserveDecorators?: boolean;
  /** Evaluators for {@link CustomPredicate}, by name. */
  readonly customPredicates?: Readonly<
    Record<string, (args: readonly unknown[], context: EvaluationContext) => boolean>
  >;
  /** Anything a custom predicate needs and nothing else does. */
  readonly custom?: Readonly<Record<string, unknown>>;
}

/** What one transformed file came to. */
export interface TransformResult {
  /** The output. */
  readonly code: string;
  /** Everything the transformer had to say about it. */
  readonly diagnostics: readonly TransformDiagnostic[];
  /** The counts. */
  readonly stats: TransformStats;
}

/** Something the transformer noticed, at a position in the input. */
export interface TransformDiagnostic {
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly file?: string;
  /** One-based, to match what an editor shows. */
  readonly line?: number;
  /** One-based, to match what an editor shows. */
  readonly column?: number;
  readonly predicate?: Predicate;
}

/**
 * What one transform did.
 *
 * `decoratorsFound` is the total and the other three partition it, which is
 * the invariant the counts are worth having at all for.
 */
export interface TransformStats {
  readonly decoratorsFound: number;
  readonly elementsStripped: number;
  readonly elementsStubbed: number;
  readonly elementsKept: number;
}

// =============================================================================
// Language service plugin
// =============================================================================

/** How the editor should evaluate `@cfg` while you are typing. */
export interface PluginConfig {
  /** The plugin name, as tsconfig.json spells it. */
  readonly name?: string;
  /** The target to assume. Defaults to the machine the editor is running on. */
  readonly defaultTarget?: string;
  /** The features to assume enabled. */
  readonly enabledFeatures?: readonly string[];
  /** Explain `@cfg` on hover. Defaults to true. */
  readonly showHoverInfo?: boolean;
  /** Complete predicate names. Defaults to true. */
  readonly provideCompletions?: boolean;
}
