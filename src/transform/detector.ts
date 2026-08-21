/**
 * @module cfg-ts/transform/detector
 *
 * Finding `@cfg` in a syntax tree.
 *
 * Two forms, because TypeScript permits a decorator on a class and a class element and
 * nowhere else. On a function declaration or a variable statement, `@cfg(...)` raises TS1206,
 * "Decorators are not valid here".
 *
 * That is a **grammar check the checker raises, not a parse error**. The parser attaches the
 * decorator and reports no parse diagnostics at all, which is what makes the decorator form
 * readable here: a transformer running before type checking sees the node perfectly, and the
 * language service plugin suppresses the diagnostic so an editor stops complaining. Verified
 * rather than assumed, and pinned by a test.
 *
 * The comment form `//@cfg(...)` on the line before is legal everywhere and needs neither.
 * Both spell the same grammar, so a consumer learns one vocabulary.
 */

import ts from "typescript";
import { parsePredicateExpression } from "../parse.ts";
import type { Predicate } from "../types.ts";

/** The name a decorator or comment has to have to be one of ours. */
export const CFG_NAME = "cfg";

/** How a `@cfg` was written. */
export type CfgForm =
  /** `@cfg(...)`, as a decorator. */
  | "decorator"
  /** `//@cfg(...)`, as a leading comment. */
  | "comment";

/** One `@cfg` found on one node. */
export interface DetectedCfgDecorator {
  /** The declaration it guards. */
  readonly node: ts.Node;
  /** Which of the two forms it was written in. */
  readonly form: CfgForm;
  /** The condition. */
  readonly predicate: Predicate;
  /** The decorator node, when the form is `decorator`, so a stripper can remove it. */
  readonly decorator?: ts.Decorator;
  /** The comment's extent in the file, when the form is `comment`. */
  readonly commentRange?: ts.CommentRange;
  /** One-based, to match what an editor shows. */
  readonly line: number;
  /** One-based, to match what an editor shows. */
  readonly column: number;
}

/** What to accept as a `@cfg`. */
export interface DetectorOptions {
  /**
   * Read `//@cfg(...)` comments. Defaults to true.
   *
   * Worth turning off only for a codebase that writes such a comment meaning something else,
   * which would then be parsed as a predicate and fail.
   */
  readonly comments?: boolean;
  /** Read `@cfg(...)` decorators. Defaults to true. */
  readonly decorators?: boolean;
}

/**
 * Every `@cfg` in a file, in source order.
 *
 * @example
 * ```ts
 * const found = findCfgDecorators(sourceFile);
 * found[0].predicate.evaluate(context);
 * ```
 */
export function findCfgDecorators(
  source: ts.SourceFile,
  options: DetectorOptions = {},
): DetectedCfgDecorator[] {
  const found: DetectedCfgDecorator[] = [];
  const visit = (node: ts.Node): void => {
    found.push(...cfgOn(node, source, options));
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return found.sort((a, b) => a.node.pos - b.node.pos);
}

/**
 * The `@cfg` entries on one node, both forms.
 *
 * A node can carry several: `@cfg(a) @cfg(b)` is the same as `@cfg(all(a, b))` and is
 * accepted because it is the natural way to write two unrelated conditions on one
 * declaration, exactly as stacked attributes read in Rust.
 */
function cfgOn(
  node: ts.Node,
  source: ts.SourceFile,
  options: DetectorOptions,
): DetectedCfgDecorator[] {
  const found: DetectedCfgDecorator[] = [];

  if (options.decorators !== false) {
    for (const decorator of getDecorators(node)) {
      if (!isCfgDecorator(decorator)) continue;
      const argument = cfgArgument(decorator);
      if (argument === undefined) continue;
      found.push({
        node,
        form: "decorator",
        decorator,
        predicate: parsePredicateExpression(argument, source),
        ...positionOf(decorator, source),
      });
    }
  }

  if (options.comments !== false && isStatementLike(node)) {
    for (const range of leadingCfgComments(node, source)) {
      found.push({
        node,
        form: "comment",
        commentRange: range,
        predicate: parseCommentPredicate(source.text, range),
        ...positionOf(range.pos, source),
      });
    }
  }

  return found;
}

/**
 * The decorators on a node, whatever its kind.
 *
 * `ts.getDecorators` is the supported accessor and it takes a `HasDecorators`, which a
 * function declaration is not, because the grammar says a function cannot have one. The
 * parser attaches them anyway, so this reads the modifier list directly. That is the whole
 * mechanism the non-class forms rest on.
 */
export function getDecorators(node: ts.Node): readonly ts.Decorator[] {
  const modifiers = (node as { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;
  if (modifiers === undefined) return [];
  return modifiers.filter((modifier): modifier is ts.Decorator => ts.isDecorator(modifier));
}

/** Whether a decorator is `@cfg(...)`, including `@ns.cfg(...)`. */
export function isCfgDecorator(decorator: ts.Decorator): boolean {
  const call = decorator.expression;
  if (!ts.isCallExpression(call)) return false;
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text === CFG_NAME;
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) {
    return callee.name.text === CFG_NAME;
  }
  return false;
}

/** The one argument of a `@cfg(...)`, or undefined when it has none. */
function cfgArgument(decorator: ts.Decorator): ts.Expression | undefined {
  const call = decorator.expression;
  if (!ts.isCallExpression(call)) return undefined;
  return call.arguments[0];
}

/**
 * Whether TypeScript would accept a decorator on this node.
 *
 * Classes and class elements yes, everything else no. What a consumer needs it for is
 * knowing whether their `@cfg` will typecheck without the plugin installed, which is a real
 * question with a real answer rather than a detail.
 */
export function isNativelyDecoratable(node: ts.Node): boolean {
  return ts.isClassDeclaration(node) ||
    ts.isClassExpression(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isParameter(node);
}

/** A node's kind, spelled the way a diagnostic should say it. */
export function getDecoratedNodeKind(node: ts.Node): string {
  return ts.SyntaxKind[node.kind];
}

/** Whether a node is the sort of thing a leading comment attaches to. */
function isStatementLike(node: ts.Node): boolean {
  return ts.isStatement(node) || ts.isClassElement(node) ||
    ts.isEnumMember(node) || ts.isPropertyAssignment(node);
}

/** The `//@cfg(...)` comments immediately before a node. */
function leadingCfgComments(node: ts.Node, source: ts.SourceFile): ts.CommentRange[] {
  const ranges = ts.getLeadingCommentRanges(source.text, node.pos) ?? [];
  return ranges.filter((range) => isCfgComment(source.text.slice(range.pos, range.end)));
}

/** Whether a comment's text is a `@cfg` directive. */
function isCfgComment(text: string): boolean {
  return /^(\/\/|\/\*)\s*@cfg\s*\(/.test(text);
}

/**
 * The predicate inside a `//@cfg(...)` comment.
 *
 * The argument text is cut out and handed to the same grammar the decorator form goes
 * through, so the two cannot drift.
 */
function parseCommentPredicate(text: string, range: ts.CommentRange): Predicate {
  const comment = text.slice(range.pos, range.end);
  const open = comment.indexOf("(");
  const close = comment.lastIndexOf(")");
  if (open === -1 || close <= open) {
    throw new Error(`a @cfg comment with no predicate: ${comment}`);
  }
  const inner = comment.slice(open + 1, close);
  const file = ts.createSourceFile(
    "cfg.ts",
    `(${inner})`,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS,
  );
  const statement = file.statements[0];
  if (statement === undefined || !ts.isExpressionStatement(statement)) {
    throw new Error(`a @cfg comment whose argument is not an expression: ${comment}`);
  }
  const expression = ts.isParenthesizedExpression(statement.expression)
    ? statement.expression.expression
    : statement.expression;
  return parsePredicateExpression(expression, file);
}

/** A node or offset as a one-based line and column. */
function positionOf(
  at: ts.Node | number,
  source: ts.SourceFile,
): { line: number; column: number } {
  const offset = typeof at === "number" ? at : at.getStart(source);
  const { line, character } = source.getLineAndCharacterOfPosition(offset);
  return { line: line + 1, column: character + 1 };
}

/** The source text of a `@cfg`'s argument, for a diagnostic or a hover. */
export function extractPredicateExpression(
  decorator: ts.Decorator,
  source: ts.SourceFile,
): string | undefined {
  const argument = cfgArgument(decorator);
  return argument?.getText(source);
}
