/**
 * @module cfg-ts/types
 * Core type definitions for the @cfg decorator system.
 */

import type { FeatureId } from "@hiisi/ft-flags";
import type { TargetId, TargetPattern } from "@hiisi/tgts";

// =============================================================================
// Predicate Types
// =============================================================================

/**
 * Base predicate type that all predicates implement.
 */
export interface Predicate {
  /** The type of predicate for discrimination */
  readonly type: PredicateType;
  /** Evaluate this predicate against a context */
  evaluate(context: EvaluationContext): boolean;
  /** Human-readable description of this predicate */
  describe(): string;
}

/**
 * All possible predicate types.
 */
export type PredicateType =
  | "feature"
  | "target"
  | "all"
  | "any"
  | "not"
  | "custom";

/**
 * A predicate that checks if a feature is enabled.
 */
export interface FeaturePredicate extends Predicate {
  readonly type: "feature";
  readonly featureId: FeatureId;
}

/**
 * A predicate that checks if compiling for a specific target.
 */
export interface TargetPredicate extends Predicate {
  readonly type: "target";
  readonly pattern: TargetPattern;
}

/**
 * A predicate that requires all sub-predicates to be true.
 */
export interface AllPredicate extends Predicate {
  readonly type: "all";
  readonly predicates: readonly Predicate[];
}

/**
 * A predicate that requires any sub-predicate to be true.
 */
export interface AnyPredicate extends Predicate {
  readonly type: "any";
  readonly predicates: readonly Predicate[];
}

/**
 * A predicate that inverts another predicate.
 */
export interface NotPredicate extends Predicate {
  readonly type: "not";
  readonly predicate: Predicate;
}

/**
 * A custom predicate with user-defined evaluation logic.
 */
export interface CustomPredicate extends Predicate {
  readonly type: "custom";
  readonly name: string;
  readonly evaluator: (context: EvaluationContext) => boolean;
}

/**
 * Union of all predicate types.
 */
export type AnyPredicate_ =
  | FeaturePredicate
  | TargetPredicate
  | AllPredicate
  | AnyPredicate
  | NotPredicate
  | CustomPredicate;

// =============================================================================
// Evaluation Context
// =============================================================================

/**
 * Context provided to predicates during evaluation.
 */
export interface EvaluationContext {
  /** The current target being compiled for */
  readonly target: TargetId;
  /** Set of enabled feature IDs */
  readonly enabledFeatures: ReadonlySet<FeatureId>;
  /** Additional context values for custom predicates */
  readonly custom?: Readonly<Record<string, unknown>>;
}

/**
 * Result of evaluating a predicate.
 */
export interface EvaluationResult {
  /** Whether the predicate evaluated to true */
  readonly result: boolean;
  /** The predicate that was evaluated */
  readonly predicate: Predicate;
  /** Child results for composite predicates */
  readonly children?: readonly EvaluationResult[];
  /** Reason for the result (for debugging) */
  readonly reason?: string;
}

// =============================================================================
// @cfg Decorator Types
// =============================================================================

/**
 * The @cfg decorator function signature.
 *
 * @example
 * ```ts
 * @cfg(feature("my.feature"))
 * function myFunction() { ... }
 *
 * @cfg(target("deno"))
 * export const denoOnlyValue = 42;
 *
 * @cfg(all(feature("shimp.fs"), target("node")))
 * class NodeFsHelper { ... }
 * ```
 */
export type CfgDecorator = (predicate: Predicate) => DecoratorFunction;

/**
 * A decorator function that can be applied to various code elements.
 *
 * Note: TypeScript natively only supports decorators on classes and class members.
 * For other elements (functions, variables, exports), this requires the cfg-ts
 * transformer to process at build time.
 */
export type DecoratorFunction = (
  target: unknown,
  context?: unknown,
) => unknown;

// =============================================================================
// Transformer Types
// =============================================================================

/**
 * Action to take when a @cfg predicate evaluates to false.
 */
export type CfgAction =
  | "strip" // Remove the code entirely
  | "stub" // Replace with a stub that throws
  | "warn" // Keep the code but emit a warning
  | "keep"; // Keep the code (for debugging)

/**
 * Options for the @cfg transformer.
 */
export interface TransformerOptions {
  /** The target being compiled for */
  readonly target: TargetId;
  /** Set of enabled feature IDs */
  readonly enabledFeatures: ReadonlySet<FeatureId>;
  /** Action to take for false predicates (default: "strip") */
  readonly falseAction?: CfgAction;
  /** Whether to emit source maps */
  readonly sourceMaps?: boolean;
  /** Whether to preserve @cfg decorators in output (for debugging) */
  readonly preserveDecorators?: boolean;
  /** Custom predicate evaluators */
  readonly customPredicates?: Readonly<Record<string, (ctx: EvaluationContext) => boolean>>;
}

/**
 * Result of transforming a source file.
 */
export interface TransformResult {
  /** The transformed source code */
  readonly code: string;
  /** Source map if requested */
  readonly map?: string;
  /** Diagnostics/warnings from transformation */
  readonly diagnostics: readonly TransformDiagnostic[];
  /** Statistics about what was transformed */
  readonly stats: TransformStats;
}

/**
 * A diagnostic message from the transformer.
 */
export interface TransformDiagnostic {
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;
  readonly predicate?: Predicate;
}

/**
 * Statistics about transformation.
 */
export interface TransformStats {
  /** Number of @cfg decorators found */
  readonly decoratorsFound: number;
  /** Number of elements stripped */
  readonly elementsStripped: number;
  /** Number of elements stubbed */
  readonly elementsStubbed: number;
  /** Number of elements kept */
  readonly elementsKept: number;
}

// =============================================================================
// Plugin Types
// =============================================================================

/**
 * Configuration for the TypeScript Language Service Plugin.
 */
export interface PluginConfig {
  /** Name of the plugin (for tsconfig.json) */
  readonly name: string;
  /** Default target for IDE evaluation */
  readonly defaultTarget?: TargetId;
  /** Features to consider enabled in IDE */
  readonly enabledFeatures?: readonly string[];
  /** Whether to show hover info for @cfg */
  readonly showHoverInfo?: boolean;
  /** Whether to provide completions for predicates */
  readonly provideCompletions?: boolean;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown when a predicate cannot be parsed.
 */
export class PredicateParseError extends Error {
  readonly source: string;

  constructor(message: string, source: string) {
    super(`Failed to parse predicate: ${message}`);
    this.name = "PredicateParseError";
    this.source = source;
  }
}

/**
 * Error thrown when evaluation fails.
 */
export class EvaluationError extends Error {
  readonly predicate: Predicate;
  readonly context: EvaluationContext;

  constructor(message: string, predicate: Predicate, context: EvaluationContext) {
    super(`Evaluation failed: ${message}`);
    this.name = "EvaluationError";
    this.predicate = predicate;
    this.context = context;
  }
}

/**
 * Error thrown when transformation fails.
 */
export class TransformError extends Error {
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;

  constructor(message: string, file?: string, line?: number, column?: number) {
    super(`Transform failed: ${message}`);
    this.name = "TransformError";
    this.file = file;
    this.line = line;
    this.column = column;
  }
}
