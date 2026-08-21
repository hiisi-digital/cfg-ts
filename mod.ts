/**
 * @module @hiisi/cfg-ts
 *
 * Rust-style conditional compilation for TypeScript.
 *
 * A `@cfg(...)` marks a declaration with the condition under which it belongs in the build.
 * When the condition holds the declaration is kept and the marker is removed; when it does
 * not, the declaration is stripped, so the output for a target contains only the code that
 * target needs and nothing that was written for another one.
 *
 * ## Two forms, one grammar
 *
 * TypeScript permits a decorator on a class and a class element and nowhere else. On a
 * function or a variable the checker raises TS1206, "Decorators are not valid here".
 *
 * That is a grammar check rather than a parse error, so the parser attaches the decorator
 * anyway and the transformer reads it perfectly. The language service plugin suppresses the
 * diagnostic for `@cfg` and only for `@cfg`, so an editor stops underlining it.
 *
 * Where installing a plugin is not wanted, the same condition is written as a leading
 * comment, which is legal everywhere and needs nothing:
 *
 * ```ts
 * //@cfg(target("node"))
 * export const runtimeName = "node";
 * ```
 *
 * Both forms go through the same grammar, so a project can use either or both.
 *
 * ## Example
 *
 * ```ts
 * import { all, capabilities, cfg, feature, target } from "@hiisi/cfg-ts";
 *
 * //@cfg(target("deno"))
 * export const openFile = (path: string) => Deno.open(path);
 *
 * //@cfg(any(target("node"), target("bun")))
 * export const openFile = (path: string) => import("node:fs").then((fs) => fs.open(path));
 *
 * @cfg(all(feature("gpu"), capabilities("webgpu")))
 * export class GpuRenderer {}
 * ```
 *
 * ## What it builds on
 *
 * Feature state comes from `@hiisi/ft-flags` and targets from `@hiisi/tgts`, so a `@cfg`
 * asks the same questions the rest of a build already answers rather than inventing a second
 * vocabulary for them.
 */

// =============================================================================
// The decorator
// =============================================================================

import type { DecoratorFunction, Predicate } from "./src/types.ts";

/**
 * Mark a declaration with the condition under which it belongs in the build.
 *
 * At runtime this returns its argument unchanged. Every decision happens at build time, in
 * the transformer, which reads the decorator off the syntax tree without running anything.
 * The runtime identity is what makes an untransformed file still work: a project that has
 * not wired the transformer in yet gets every declaration, which is wrong output but is not
 * a crash, and is the right failure for a build step somebody forgot to add.
 *
 * @param predicate - The condition. Built from the predicate functions this module exports.
 *
 * @example
 * ```ts
 * @cfg(target("deno"))
 * export class DenoOnly {}
 * ```
 */
export function cfg(_predicate: Predicate): DecoratorFunction {
  return <T>(value: T): T => value;
}

// =============================================================================
// Predicates
// =============================================================================

export {
  all,
  allFeatures,
  always,
  any,
  anyFeature,
  arch,
  capabilities,
  constant,
  custom,
  evaluate,
  feature,
  formatEvaluationResult,
  isCustomPredicate,
  isFeaturePredicate,
  isTargetPredicate,
  never,
  not,
  notFeature,
  notTarget,
  platform,
  runtime,
  target,
  targetAll,
  targetAny,
} from "./src/predicates/mod.ts";

// =============================================================================
// Reading a predicate out of source
// =============================================================================

export { parsePredicate, parsePredicateExpression, PREDICATE_NAMES } from "./src/parse.ts";

// =============================================================================
// The transformer
// =============================================================================

export {
  CFG_NAME,
  createEmptyStats,
  createEvaluationContext,
  createTransformer,
  evaluatePredicate,
  extractPredicateExpression,
  findCfgDecorators,
  getDecoratedNodeKind,
  getDecorators,
  isCfgDecorator,
  isNativelyDecoratable,
  programTransformer,
  transformSource,
} from "./src/transform/mod.ts";

export { contextFromStrings } from "./src/transform/evaluator.ts";

export type { CfgForm, DetectedCfgDecorator, DetectorOptions } from "./src/transform/detector.ts";

// =============================================================================
// The language service plugin
// =============================================================================

export {
  createLanguageService,
  DECORATORS_NOT_VALID_HERE,
  init as initPlugin,
} from "./src/plugin/mod.ts";

export type { PluginCreateInfo } from "./src/plugin/mod.ts";

// =============================================================================
// Errors
// =============================================================================

export {
  CfgError,
  InvalidCfgUsageError,
  PluginError,
  PredicateEvaluationError,
  PredicateParseError,
  TransformError,
  UndefinedFeatureError,
  UndefinedTargetError,
} from "./src/errors.ts";

// =============================================================================
// Types
// =============================================================================

export type {
  AllPredicate,
  AnyPredicate,
  AnyPredicateShape,
  CfgAction,
  CfgDecorator,
  ConstantPredicate,
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
  TransformStats,
} from "./src/types.ts";
