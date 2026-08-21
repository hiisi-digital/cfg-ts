/**
 * @module cfg-ts/parse
 *
 * Reading a predicate out of source.
 *
 * The transformer sees a syntax tree, not values. `@cfg(all(feature("a"), target("node")))`
 * is a call expression at build time and evaluating it would mean running the module, which
 * is exactly what a build is trying to avoid doing. So the expression is read structurally:
 * the grammar below is small, closed, and refuses anything outside it rather than guessing.
 *
 * The grammar, which is the whole of it:
 *
 * ```text
 * predicate := feature(string)     | notFeature(string)
 *            | allFeatures(string, ...)  | anyFeature(string, ...)
 *            | target(string | object)   | notTarget(string | object)
 *            | targetAll(...)     | targetAny(...)
 *            | runtime(string)    | platform(string) | arch(string)
 *            | capabilities(string, ...)
 *            | all(predicate, ...) | any(predicate, ...) | not(predicate)
 *            | always()           | never()
 *            | custom(string, literal...)
 *            | name(literal...)          -- a bare call, read as custom(name, ...)
 * ```
 */

import ts from "typescript";
import type { TargetPattern } from "@hiisi/tgts";
import { PredicateParseError } from "./errors.ts";
import type { Predicate } from "./types.ts";
import { all, always, any, never, not } from "./predicates/combinators.ts";
import { allFeatures, anyFeature, feature, notFeature } from "./predicates/feature.ts";
import {
  arch,
  capabilities,
  notTarget,
  platform,
  runtime,
  target,
  targetAll,
  targetAny,
} from "./predicates/target.ts";
import { custom } from "./predicates/custom.ts";

/** Every name the grammar above recognises, for completions and for error messages. */
export const PREDICATE_NAMES: readonly string[] = Object.freeze([
  "all",
  "allFeatures",
  "always",
  "any",
  "anyFeature",
  "arch",
  "capabilities",
  "custom",
  "feature",
  "never",
  "not",
  "notFeature",
  "notTarget",
  "platform",
  "runtime",
  "target",
  "targetAll",
  "targetAny",
]);

/**
 * The predicate an expression denotes.
 *
 * @param expression - The argument of a `@cfg(...)`.
 * @param source - The file it came from, so a failure can quote itself.
 * @throws PredicateParseError when the expression is outside the grammar.
 *
 * @example
 * ```ts
 * const predicate = parsePredicateExpression(decorator.expression.arguments[0], sourceFile);
 * ```
 */
export function parsePredicateExpression(
  expression: ts.Expression,
  source?: ts.SourceFile,
): Predicate {
  const text = (node: ts.Node): string => nodeText(node, source);

  if (!ts.isCallExpression(expression)) {
    throw new PredicateParseError(
      'a predicate is a call, like feature("x") or all(...)',
      text(expression),
      expression.pos,
    );
  }

  const name = calleeName(expression.expression);
  if (name === undefined) {
    throw new PredicateParseError(
      "the thing being called is not a plain name",
      text(expression),
      expression.pos,
    );
  }

  const args = expression.arguments;
  const strings = (): string[] => args.map((a) => stringArg(a, name, text));
  const nested = (): Predicate[] => args.map((a) => parsePredicateExpression(a, source));

  switch (name) {
    case "feature":
      return feature(one(strings(), name, text(expression)));
    case "notFeature":
      return notFeature(one(strings(), name, text(expression)));
    case "allFeatures":
      return allFeatures(...strings());
    case "anyFeature":
      return anyFeature(...strings());

    case "target":
      return target(patternArg(one(args, name, text(expression)), name, text));
    case "notTarget":
      return notTarget(patternArg(one(args, name, text(expression)), name, text));
    case "targetAll":
      return targetAll(...args.map((a) => patternArg(a, name, text)));
    case "targetAny":
      return targetAny(...args.map((a) => patternArg(a, name, text)));

    // The axis shorthands. Their argument is a union of string literals in the typed API, so
    // the cast is the one place a parsed string crosses into it; an unknown name is caught by
    // `resolveTarget` when the predicate is evaluated rather than being silently accepted.
    case "runtime":
      return runtime(one(strings(), name, text(expression)) as Parameters<typeof runtime>[0]);
    case "platform":
      return platform(one(strings(), name, text(expression)) as Parameters<typeof platform>[0]);
    case "arch":
      return arch(one(strings(), name, text(expression)) as Parameters<typeof arch>[0]);
    case "capabilities":
      return capabilities(...strings());

    case "all":
      return all(...nested());
    case "any":
      return any(...nested());
    case "not":
      return not(parsePredicateExpression(one(args, name, text(expression)), source));

    case "always":
      return always();
    case "never":
      return never();

    case "custom": {
      const [first, ...rest] = args;
      if (first === undefined) {
        throw new PredicateParseError("custom() needs a name", text(expression), expression.pos);
      }
      return custom(stringArg(first, name, text), ...rest.map((a) => literal(a, name, text)));
    }

    default:
      // A bare call nobody recognises is read as a custom predicate rather than refused, so
      // `@cfg(release())` works without the ceremony of `custom("release")`. Whether the name
      // is registered is settled at evaluation, where the build's own table is in hand.
      return custom(name, ...args.map((a) => literal(a, name, text)));
  }
}

/**
 * The predicate a string denotes, by parsing it as an expression.
 *
 * For a caller holding source text rather than a node: a configuration file, a command line
 * argument, a test. Goes through the same grammar, so the two cannot disagree about what a
 * predicate is.
 *
 * @example
 * ```ts
 * parsePredicate('all(feature("net"), target("deno"))')
 * ```
 */
export function parsePredicate(source: string): Predicate {
  const file = ts.createSourceFile(
    "cfg.ts",
    `(${source})`,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS,
  );
  const statement = file.statements[0];
  if (statement === undefined || !ts.isExpressionStatement(statement)) {
    throw new PredicateParseError("not an expression", source);
  }
  const inner = ts.isParenthesizedExpression(statement.expression)
    ? statement.expression.expression
    : statement.expression;
  return parsePredicateExpression(inner, file);
}

/** The name of the thing being called, for `f(...)` and `ns.f(...)` alike. */
function calleeName(callee: ts.Expression): string | undefined {
  if (ts.isIdentifier(callee)) return callee.text;
  // `cfg.feature("x")` and `predicates.all(...)` are how the API reads when imported as a
  // namespace, and the last segment is the one that names the predicate.
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) {
    return callee.name.text;
  }
  return undefined;
}

/** The single argument `name` takes, or a parse error naming how many arrived. */
function one<T>(args: readonly T[], name: string, source: string): T {
  const list = Array.from(args);
  if (list.length !== 1) {
    throw new PredicateParseError(
      `${name}() takes exactly one argument, and ${list.length} were given`,
      source,
    );
  }
  return list[0]!;
}

/** A string literal argument, as its text. */
function stringArg(
  node: ts.Expression,
  name: string,
  text: (n: ts.Node) => string,
): string {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  throw new PredicateParseError(
    `${name}() takes string literals, and this argument is not one. A predicate is read ` +
      `without running anything, so a variable or a computed name cannot be resolved here.`,
    text(node),
    node.pos,
  );
}

/**
 * A target argument: an id string, or an object literal read as a pattern.
 *
 * The object form is restricted to the four keys a {@link TargetPattern} has. An unknown key
 * is refused rather than ignored, because a silently ignored key produces a pattern that
 * matches more than it was written to, and the code that should have been stripped ships.
 */
function patternArg(
  node: ts.Expression,
  name: string,
  text: (n: ts.Node) => string,
): string | TargetPattern {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;

  if (!ts.isObjectLiteralExpression(node)) {
    throw new PredicateParseError(
      `${name}() takes a target id or an object pattern`,
      text(node),
      node.pos,
    );
  }

  const pattern: Record<string, unknown> = {};
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property) || !isPatternKey(property.name)) {
      throw new PredicateParseError(
        `a target pattern takes runtime, platform, architecture and capabilities, ` +
          `written as plain keys`,
        text(property),
        property.pos,
      );
    }
    const key = property.name.text;
    if (key === "capabilities") {
      if (!ts.isArrayLiteralExpression(property.initializer)) {
        throw new PredicateParseError(
          "capabilities is an array of strings",
          text(property.initializer),
          property.initializer.pos,
        );
      }
      pattern[key] = property.initializer.elements.map((e) => stringArg(e, name, text));
    } else {
      pattern[key] = stringArg(property.initializer, name, text);
    }
  }
  return pattern as TargetPattern;
}

/** Whether a property name is one of the four a pattern has. */
function isPatternKey(
  name: ts.PropertyName,
): name is ts.Identifier | ts.StringLiteral {
  if (!ts.isIdentifier(name) && !ts.isStringLiteral(name)) return false;
  return ["runtime", "platform", "architecture", "capabilities"].includes(name.text);
}

/**
 * A literal argument to a custom predicate, as its value.
 *
 * Strings, numbers, booleans, null and arrays of those. Nothing that would have to be
 * evaluated, for the same reason the rest of this file reads structurally.
 */
function literal(node: ts.Expression, name: string, text: (n: ts.Node) => string): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    const operand = literal(node.operand, name, text);
    if (typeof operand === "number") return -operand;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((e) => literal(e, name, text));
  }
  throw new PredicateParseError(
    `${name}() takes literal arguments, and this one would have to be evaluated`,
    text(node),
    node.pos,
  );
}

/**
 * A node's source text.
 *
 * `getText()` needs the node to have been parsed with position tracking and to still know
 * its file. Both hold for anything this module produced, and neither is guaranteed for a
 * synthesised node handed in by a caller, so the fallback prints the node kind rather than
 * throwing while building an error message.
 */
function nodeText(node: ts.Node, source?: ts.SourceFile): string {
  try {
    return node.getText(source);
  } catch {
    return `<${ts.SyntaxKind[node.kind]}>`;
  }
}
