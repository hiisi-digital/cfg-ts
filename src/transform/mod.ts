/**
 * @module cfg-ts/transform
 *
 * The transformer: read every `@cfg` in a file, evaluate it, and act on the answer.
 *
 * Usable two ways. {@link transformSource} takes source text and gives source text back,
 * which is what a build step wants. {@link programTransformer} is a `ts.TransformerFactory`
 * for a compiler that is already running, which is what ts-patch and a bundler plugin want.
 */

import ts from "typescript";
import type {
  CfgAction,
  EvaluationContext,
  TransformDiagnostic,
  TransformerOptions,
  TransformResult,
  TransformStats,
} from "../types.ts";
import { evaluate } from "../predicates/evaluate.ts";
import { findCfgDecorators, isNativelyDecoratable } from "./detector.ts";
import type { DetectedCfgDecorator } from "./detector.ts";
import { applyAction, checkAction, withoutCfg } from "./stripper.ts";
import { createEvaluationContext } from "./evaluator.ts";

/** A zeroed {@link TransformStats}, so a caller can accumulate across files. */
export function createEmptyStats(): TransformStats {
  return {
    decoratorsFound: 0,
    elementsStripped: 0,
    elementsStubbed: 0,
    elementsKept: 0,
  };
}

/**
 * Transform one file's source text.
 *
 * @param code - The source.
 * @param fileName - What to call it in diagnostics.
 * @param options - The target, the features, and what to do with a false predicate.
 *
 * @example
 * ```ts
 * const { code, stats } = transformSource(source, "mod.ts", {
 *   target: targetId("node"),
 *   enabledFeatures: new Set(),
 * });
 * ```
 */
export function transformSource(
  code: string,
  fileName: string,
  options: TransformerOptions,
): TransformResult {
  const source = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.ESNext,
    true,
    scriptKindOf(fileName),
  );

  const diagnostics: TransformDiagnostic[] = [];
  const context = createEvaluationContext(options);
  const decisions = decide(source, context, options, diagnostics);

  // Nothing to do, so the input is returned unchanged rather than round-tripped through the
  // printer. A file with no @cfg in it should come out byte-identical, and a reprint would
  // reformat it.
  if (decisions.size === 0 && !options.preserveDecorators) {
    const found = findCfgDecorators(source);
    if (found.length === 0) {
      return { code, diagnostics, stats: createEmptyStats() };
    }
  }

  const stats = { ...createEmptyStats() };
  const transformed = ts.transform(source, [
    transformerFor(decisions, options, stats, diagnostics),
  ]);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printed = printer.printFile(transformed.transformed[0] as ts.SourceFile);
  transformed.dispose();

  return {
    code: stripCfgComments(printed, options),
    diagnostics,
    stats,
  };
}

/**
 * The transformer as a factory, for a compiler that is already running.
 *
 * This is the ts-patch entry point. Comment-form `@cfg` directives are not removed on this
 * path, because a `ts.TransformerFactory` works on nodes and the comments are attached text;
 * they are inert in the output either way.
 *
 * @example
 * ```ts
 * // tsconfig.json, via ts-patch
 * { "plugins": [{ "transform": "@hiisi/cfg-ts/transform", "target": "node" }] }
 * ```
 */
export function programTransformer(
  options: TransformerOptions,
): ts.TransformerFactory<ts.SourceFile> {
  const context = createEvaluationContext(options);
  return (transformContext) => (source) => {
    const diagnostics: TransformDiagnostic[] = [];
    const decisions = decide(source, context, options, diagnostics);
    const stats = { ...createEmptyStats() };
    return transformerFor(decisions, options, stats, diagnostics)(transformContext)(source);
  };
}

/** Alias for {@link programTransformer}, for callers that read it as a constructor. */
export const createTransformer = programTransformer;

/**
 * What every guarded node in a file comes to.
 *
 * Computed up front rather than during the walk, because a node carrying two `@cfg`s has to
 * see both before it can be acted on, and because a predicate that throws should fail before
 * anything has been rewritten.
 */
function decide(
  source: ts.SourceFile,
  context: EvaluationContext,
  options: TransformerOptions,
  diagnostics: TransformDiagnostic[],
): Map<ts.Node, Decision> {
  const decisions = new Map<ts.Node, Decision>();
  const action = options.falseAction ?? "strip";

  for (const found of findCfgDecorators(source)) {
    const existing = decisions.get(found.node);
    const answer = answerFor(found, context, source, diagnostics);

    // Two @cfg on one node are a conjunction, the way stacked attributes read in Rust. So
    // one false is enough, and the reason kept is the one that failed.
    if (existing === undefined) {
      decisions.set(found.node, answer);
    } else if (existing.result && !answer.result) {
      decisions.set(found.node, answer);
    }
  }

  for (const [node, decision] of decisions) {
    if (decision.result) continue;
    checkAction(node, action);
  }

  return decisions;
}

/** One node's answer, with the diagnostic if evaluation failed. */
function answerFor(
  found: DetectedCfgDecorator,
  context: EvaluationContext,
  source: ts.SourceFile,
  diagnostics: TransformDiagnostic[],
): Decision {
  try {
    const evaluated = evaluate(found.predicate, context);
    return { result: evaluated.result, reason: evaluated.reason, found };
  } catch (error) {
    // A predicate that cannot answer is an error, and the node is kept: stripping on a
    // failure would remove code for a reason nobody stated.
    diagnostics.push({
      severity: "error",
      message: error instanceof Error ? error.message : String(error),
      file: source.fileName,
      line: found.line,
      column: found.column,
      predicate: found.predicate,
    });
    return { result: true, reason: "the predicate could not be evaluated", found };
  }
}

/** A node, its answer, and why. */
interface Decision {
  readonly result: boolean;
  readonly reason: string;
  readonly found: DetectedCfgDecorator;
}

/** The visitor that rewrites the tree according to the decisions. */
function transformerFor(
  decisions: Map<ts.Node, Decision>,
  options: TransformerOptions,
  stats: TransformStats,
  diagnostics: TransformDiagnostic[],
): ts.TransformerFactory<ts.SourceFile> {
  const action = options.falseAction ?? "strip";
  const counts = stats as {
    decoratorsFound: number;
    elementsStripped: number;
    elementsStubbed: number;
    elementsKept: number;
  };

  return (context) => {
    const { factory } = context;

    const visit = (node: ts.Node): ts.VisitResult<ts.Node | undefined> => {
      const decision = decisions.get(node);

      if (decision === undefined) {
        return ts.visitEachChild(node, visit, context);
      }

      counts.decoratorsFound += 1;

      if (decision.result) {
        counts.elementsKept += 1;
        const inner = ts.visitEachChild(node, visit, context);
        if (!options.preserveDecorators) return stripDecorators(inner, factory);
        return preserveMarker(inner, decision, factory);
      }

      if (action === "warn") {
        diagnostics.push({
          severity: "warning",
          message: `kept despite a false predicate: ${decision.reason}`,
          file: decision.found.node.getSourceFile()?.fileName,
          line: decision.found.line,
          column: decision.found.column,
          predicate: decision.found.predicate,
        });
      }

      const replacement = applyAction(node, action, decision.reason, factory);
      if (replacement === undefined) {
        counts.elementsStripped += 1;
        return undefined;
      }
      if (action === "stub") {
        counts.elementsStubbed += 1;
      } else {
        counts.elementsKept += 1;
      }
      // The false branch is the one preserving is actually for: a build kept under `keep`
      // or `warn` is being read to find out what was excluded and why, and a marker that
      // survives only on the true branch answers the question nobody asked.
      return options.preserveDecorators
        ? preserveMarker(replacement, decision, factory)
        : replacement;
    };

    return (source) => ts.visitNode(source, visit) as ts.SourceFile;
  };
}

/**
 * A kept node with its `@cfg` preserved in a form the printer will actually emit.
 *
 * TypeScript's printer emits a decorator on a class and **silently drops one on a function
 * declaration or a variable statement**, because the grammar says it cannot be there. So
 * `preserveDecorators` cannot mean "leave the decorator alone" outside the class forms: the
 * decorator is gone from the output whatever this function does.
 *
 * What it does instead is attach the marker as a `//@cfg(...)` comment, which prints
 * everywhere and re-reads through the same grammar, so a preserved file transformed again
 * makes the same decisions. Behaviour verified against the printer rather than assumed.
 */
function preserveMarker(
  node: ts.Node,
  decision: Decision,
  factory: ts.NodeFactory,
): ts.Node {
  if (decision.found.form === "comment") return node;
  if (isNativelyDecoratable(node)) return node;

  const stripped = stripDecorators(node, factory);
  ts.addSyntheticLeadingComment(
    stripped,
    ts.SyntaxKind.SingleLineCommentTrivia,
    `@cfg(${decision.found.predicate.describe()})`,
    true,
  );
  return stripped;
}

/** A kept node with its `@cfg` decorators removed. */
function stripDecorators(node: ts.Node, factory: ts.NodeFactory): ts.Node {
  const modifiers = (node as { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;
  if (modifiers === undefined) return node;
  const kept = withoutCfg(modifiers, factory);
  if (kept !== undefined && kept.length === modifiers.length) return node;
  // The printer reads `modifiers` off whatever node it is given, and every `updateX` for the
  // dozen decoratable kinds would be a dozen near-identical branches. Replacing the array in
  // place on the cloned node is what the visitor already produced.
  return Object.assign(Object.create(Object.getPrototypeOf(node)), node, {
    modifiers: kept === undefined ? undefined : factory.createNodeArray(kept),
  }) as ts.Node;
}

/**
 * `//@cfg(...)` comment directives removed from printed output.
 *
 * The node transformer cannot: a comment is attached text rather than a node, and the
 * printer re-emits it with whatever it was attached to. So the text pass runs after
 * printing, over whole lines, which is safe because the detector only ever recognises a
 * directive that begins a comment.
 */
function stripCfgComments(code: string, options: TransformerOptions): string {
  if (options.preserveDecorators) return code;
  return code
    .split("\n")
    .filter((line) => !/^\s*\/\/\s*@cfg\s*\(/.test(line))
    .join("\n");
}

/** The script kind a file name implies, so `.tsx` keeps its JSX. */
function scriptKindOf(fileName: string): ts.ScriptKind {
  if (fileName.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (fileName.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (fileName.endsWith(".js") || fileName.endsWith(".mjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

export { createEvaluationContext, evaluatePredicate, formatEvaluationResult } from "./evaluator.ts";
export {
  CFG_NAME,
  extractPredicateExpression,
  findCfgDecorators,
  getDecoratedNodeKind,
  getDecorators,
  isCfgDecorator,
  isNativelyDecoratable,
} from "./detector.ts";
export type { CfgForm, DetectedCfgDecorator, DetectorOptions } from "./detector.ts";
export type { CfgAction, TransformerOptions, TransformResult, TransformStats };
