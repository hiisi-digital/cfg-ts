/**
 * @module @hiisi/cfg-ts
 *
 * The `@cfg` decorator system for Rust-like conditional compilation in TypeScript.
 * Enables compile-time code stripping/stubbing based on feature flags and targets.
 *
 * This package provides:
 * - `@cfg(predicate)` decorator for conditional compilation
 * - TypeScript Language Service Plugin for IDE support
 * - TypeScript Compiler Transformer for build-time processing
 * - Predicate system for feature flags and target matching
 *
 * @example
 * ```ts
 * import { cfg, feature, target, all } from "@hiisi/cfg-ts";
 *
 * // Conditional on feature flag
 * @cfg(feature("shimp.fs"))
 * export function readFile() { ... }
 *
 * // Conditional on target
 * @cfg(target("deno"))
 * export function denoSpecific() { ... }
 *
 * // Combined predicates
 * @cfg(all(feature("shimp.fs"), target("node")))
 * export function nodeFsHelper() { ... }
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
    AllPredicate,
    AnyPredicate_,
    CfgAction,
    CfgDecorator,
    CustomPredicate,
    DecoratorFunction,
    EvaluationContext,
    EvaluationResult,
    FeaturePredicate,
    NotPredicate,
    PluginConfig,
    Predicate,
    PredicateType,
    TargetPredicate,
    TransformDiagnostic,
    TransformerOptions,
    TransformResult,
    TransformStats
} from "./src/types.ts";

export {
    EvaluationError,
    PredicateParseError,
    TransformError
} from "./src/types.ts";

// =============================================================================
// Errors
// =============================================================================

export {
    CfgError,
    InvalidCfgUsageError,
    PluginError,
    PredicateEvaluationError,
    PredicateParseError as PredicateParseErr,
    TransformError as TransformErr,
    UndefinedFeatureError,
    UndefinedTargetError
} from "./src/errors.ts";

// =============================================================================
// Predicates
// =============================================================================

export { all, any, not } from "./src/predicates/combinators.ts";

export {
    allFeatures,
    anyFeature,
    feature,
    notFeature
} from "./src/predicates/feature.ts";

export {
    arch,
    platform,
    runtime,
    target
} from "./src/predicates/target.ts";

// =============================================================================
// Transformer
// =============================================================================

export {
    createEmptyStats,
    createTransformer,
    createVisitor,
    processNode,
    programTransformer,
    transformSource
} from "./src/transform/mod.ts";

export {
    extractPredicateExpression,
    findCfgDecorators,
    getDecoratedNodeKind,
    getDecorators,
    isCfgDecorator,
    isNativelyDecoratable
} from "./src/transform/detector.ts";

export {
    createEvaluationContext,
    evaluatePredicate,
    formatEvaluationResult
} from "./src/transform/evaluator.ts";

export type { DetectedCfgDecorator, DetectorOptions } from "./src/transform/detector.ts";

// =============================================================================
// Plugin (re-exported for convenience, main entry is ./plugin)
// =============================================================================

export { createLanguageService, init as initPlugin } from "./src/plugin/mod.ts";

// =============================================================================
// The @cfg decorator function
// =============================================================================

/**
 * The @cfg decorator for conditional compilation.
 *
 * Apply to functions, classes, methods, or variables to conditionally
 * include/exclude them based on feature flags and target configuration.
 *
 * Note: For non-class elements, this requires the cfg-ts transformer to
 * process at build time. The Language Service Plugin provides IDE support.
 *
 * @param predicate - The predicate to evaluate (feature, target, all, any, not)
 * @returns A decorator function
 *
 * @example
 * ```ts
 * @cfg(feature("my.feature"))
 * function myFunction() { ... }
 *
 * @cfg(all(feature("shimp.fs"), target("node")))
 * class NodeFsHelper { ... }
 * ```
 */
export function cfg(_predicate: Predicate): DecoratorFunction {
  // At runtime, this is a no-op. The actual processing happens at build time
  // via the transformer. This function exists for:
  // 1. Type checking (so @cfg is a valid decorator)
  // 2. Runtime fallback (keeps decorated code when not transformed)
  return function <T>(target: T): T {
    return target;
  };
}

// Import for cfg function signature
import type { DecoratorFunction, Predicate } from "./src/types.ts";
