/**
 * @module cfg-ts/plugin
 *
 * The TypeScript language service plugin.
 *
 * One job above all the others: **suppress TS1206.** A `@cfg` on a function declaration or a
 * variable statement is read perfectly by the parser and rejected by the checker's grammar
 * pass, so without this the editor underlines every non-class `@cfg` in the project in red
 * while the build works. That single diagnostic is what makes the decorator form usable.
 *
 * Then two conveniences: completions for the predicate names, and a hover that says whether
 * a `@cfg` holds under the editor's assumed configuration and why.
 *
 * Configure it in tsconfig.json:
 *
 * ```json
 * {
 *   "compilerOptions": {
 *     "plugins": [{ "name": "@hiisi/cfg-ts/plugin", "defaultTarget": "deno" }]
 *   }
 * }
 * ```
 */

import type ts from "typescript";
import type { PluginConfig } from "../types.ts";
import { PREDICATE_NAMES } from "../parse.ts";
import { findCfgDecorators } from "../transform/detector.ts";
import { contextFromStrings } from "../transform/evaluator.ts";
import { evaluate, formatEvaluationResult } from "../predicates/evaluate.ts";

/**
 * The diagnostic the checker raises for a decorator the grammar does not allow.
 *
 * "Decorators are not valid here". Suppressed on `@cfg` and only on `@cfg`, so a decorator
 * that is genuinely misplaced still reports.
 */
export const DECORATORS_NOT_VALID_HERE = 1206;

/** What TypeScript hands a plugin when it loads one. */
export interface PluginCreateInfo {
  readonly project: unknown;
  readonly languageService: ts.LanguageService;
  readonly languageServiceHost: ts.LanguageServiceHost;
  readonly serverHost: unknown;
  readonly config: PluginConfig;
}

/**
 * The plugin entry point.
 *
 * @param modules - The `typescript` the editor is running, which is the one to use. Loading
 * a second copy gives two sets of `SyntaxKind` constants that compare unequal.
 */
export function init(modules: { typescript: typeof ts }): {
  create: (info: PluginCreateInfo) => ts.LanguageService;
} {
  return { create: (info) => createLanguageService(info, modules.typescript) };
}

/**
 * The editor's language service, with the `@cfg` behaviour layered over it.
 *
 * Every method is forwarded, and four are wrapped. Forwarding by enumeration rather than by
 * a hand-written list, because the interface has around eighty members and any one this
 * plugin failed to pass through would silently disable that editor feature.
 */
export function createLanguageService(
  info: PluginCreateInfo,
  typescript: typeof ts,
): ts.LanguageService {
  const original = info.languageService;
  const config = info.config ?? {};
  const proxy = Object.create(null) as ts.LanguageService;

  for (const key of Object.keys(original) as (keyof ts.LanguageService)[]) {
    const member = original[key];
    if (typeof member === "function") {
      // deno-lint-ignore no-explicit-any
      (proxy as any)[key] = (...args: unknown[]) => (member as any).apply(original, args);
    } else {
      // deno-lint-ignore no-explicit-any
      (proxy as any)[key] = member;
    }
  }

  proxy.getSemanticDiagnostics = (fileName) =>
    withoutCfgGrammarErrors(original.getSemanticDiagnostics(fileName), fileName, original);

  proxy.getSyntacticDiagnostics = (fileName) =>
    withoutCfgGrammarErrors(
      original.getSyntacticDiagnostics(fileName),
      fileName,
      original,
    ) as ts.DiagnosticWithLocation[];

  if (config.provideCompletions !== false) {
    proxy.getCompletionsAtPosition = (fileName, position, opts, formatting) => {
      const base = original.getCompletionsAtPosition(fileName, position, opts, formatting);
      return withPredicateCompletions(base, fileName, position, original, typescript);
    };
  }

  if (config.showHoverInfo !== false) {
    proxy.getQuickInfoAtPosition = (fileName, position) => {
      const own = cfgQuickInfo(fileName, position, original, typescript, config);
      return own ?? original.getQuickInfoAtPosition(fileName, position);
    };
  }

  return proxy;
}

/**
 * Diagnostics with TS1206 removed where it names a `@cfg` and nowhere else.
 *
 * The filter is positional: the diagnostic's span has to fall inside a `@cfg` decorator the
 * detector found in that file. A misplaced decorator that is not `@cfg` keeps its error,
 * which is the difference between suppressing one known false positive and turning the check
 * off.
 */
function withoutCfgGrammarErrors(
  diagnostics: readonly ts.Diagnostic[],
  fileName: string,
  service: ts.LanguageService,
): ts.Diagnostic[] {
  if (!diagnostics.some((d) => d.code === DECORATORS_NOT_VALID_HERE)) {
    return [...diagnostics];
  }
  const source = service.getProgram()?.getSourceFile(fileName);
  if (source === undefined) return [...diagnostics];

  const spans = cfgDecoratorSpans(source);
  return diagnostics.filter((diagnostic) => {
    if (diagnostic.code !== DECORATORS_NOT_VALID_HERE) return true;
    const start = diagnostic.start;
    if (start === undefined) return true;
    return !spans.some(([from, to]) => start >= from && start < to);
  });
}

/**
 * The extent of every `@cfg` in a file, as offsets the checker might report at.
 *
 * Two spans per decorator, because the checker reports TS1206 at the decorator on some node
 * kinds and at the start of the declaration on others. Covering both is what makes the
 * suppression reliable rather than kind-dependent.
 */
function cfgDecoratorSpans(source: ts.SourceFile): [number, number][] {
  const spans: [number, number][] = [];
  for (const found of findCfgDecorators(source, { comments: false })) {
    if (found.decorator !== undefined) {
      spans.push([found.decorator.getStart(source), found.decorator.getEnd()]);
    }
    const start = found.node.getStart(source);
    spans.push([start, start + 1]);
  }
  return spans;
}

/** Base completions plus the predicate names, when the cursor is inside a `@cfg(...)`. */
function withPredicateCompletions(
  base: ts.WithMetadata<ts.CompletionInfo> | undefined,
  fileName: string,
  position: number,
  service: ts.LanguageService,
  typescript: typeof ts,
): ts.WithMetadata<ts.CompletionInfo> | undefined {
  const source = service.getProgram()?.getSourceFile(fileName);
  if (source === undefined || !insideCfg(source, position, typescript)) return base;

  const entries: ts.CompletionEntry[] = PREDICATE_NAMES.map((name) => ({
    name,
    kind: typescript.ScriptElementKind.functionElement,
    kindModifiers: "",
    // Sorted ahead of everything the editor would otherwise offer, because inside a `@cfg`
    // the predicate names are the only things that can appear and every other suggestion is
    // noise.
    sortText: `0${name}`,
    insertText: `${name}(`,
  }));

  if (base === undefined) {
    return {
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
      entries,
    };
  }
  const known = new Set(base.entries.map((entry) => entry.name));
  return { ...base, entries: [...entries.filter((e) => !known.has(e.name)), ...base.entries] };
}

/** A hover saying whether the `@cfg` under the cursor holds, and why. */
function cfgQuickInfo(
  fileName: string,
  position: number,
  service: ts.LanguageService,
  typescript: typeof ts,
  config: PluginConfig,
): ts.QuickInfo | undefined {
  const source = service.getProgram()?.getSourceFile(fileName);
  if (source === undefined) return undefined;

  const found = findCfgDecorators(source).find((entry) => {
    const from = entry.decorator?.getStart(source) ?? entry.commentRange?.pos;
    const to = entry.decorator?.getEnd() ?? entry.commentRange?.end;
    return from !== undefined && to !== undefined && position >= from && position < to;
  });
  if (found === undefined) return undefined;

  // The editor has no build in front of it, so it evaluates against what the plugin was
  // configured to assume. Saying which assumption is part of the answer: a reader seeing
  // "false" without it will think the code is dead rather than that it is another target's.
  const target = config.defaultTarget ?? "deno";
  const context = contextFromStrings(target, config.enabledFeatures ?? []);

  let body: string;
  try {
    body = formatEvaluationResult(evaluate(found.predicate, context));
  } catch (error) {
    body = error instanceof Error ? error.message : String(error);
  }

  const from = found.decorator?.getStart(source) ?? found.commentRange?.pos ?? 0;
  const to = found.decorator?.getEnd() ?? found.commentRange?.end ?? 0;

  return {
    kind: typescript.ScriptElementKind.unknown,
    kindModifiers: "",
    textSpan: { start: from, length: to - from },
    displayParts: [{ text: found.predicate.describe(), kind: "text" }],
    documentation: [{
      text: `under target "${target}" with features [${
        (config.enabledFeatures ?? []).join(", ")
      }]\n\n${body}`,
      kind: "text",
    }],
  };
}

/** Whether a position falls inside the argument list of a `@cfg(...)`. */
function insideCfg(source: ts.SourceFile, position: number, typescript: typeof ts): boolean {
  let inside = false;
  const visit = (node: ts.Node): void => {
    if (inside) return;
    if (
      typescript.isDecorator(node) && typescript.isCallExpression(node.expression) &&
      position > node.expression.expression.getEnd() && position <= node.getEnd()
    ) {
      const callee = node.expression.expression;
      const name = typescript.isIdentifier(callee)
        ? callee.text
        : typescript.isPropertyAccessExpression(callee)
        ? callee.name.text
        : undefined;
      if (name === "cfg") {
        inside = true;
        return;
      }
    }
    typescript.forEachChild(node, visit);
  };
  typescript.forEachChild(source, visit);
  return inside;
}

export default init;
