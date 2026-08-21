/**
 * @module cfg-ts/transform/stripper
 *
 * What becomes of a declaration whose predicate came out false.
 */

import ts from "typescript";
import { InvalidCfgUsageError } from "../errors.ts";
import type { CfgAction } from "../types.ts";

/**
 * The node a false predicate leaves behind, or `undefined` to remove it.
 *
 * `strip` is the default and is what conditional compilation means. The other three exist
 * because removing a declaration removes its references too, and a build that fails with
 * "cannot find name" twelve files away is harder to read than one that fails at the call.
 *
 * - `stub` keeps the declaration and replaces what it does with a throw, so the name still
 *   resolves and the failure names the predicate that excluded it.
 * - `warn` and `keep` leave the node alone. The difference is that `warn` reports it, which
 *   is how you find out what a target is carrying that it did not need.
 */
export function applyAction(
  node: ts.Node,
  action: CfgAction,
  reason: string,
  factory: ts.NodeFactory,
): ts.Node | undefined {
  switch (action) {
    case "strip":
      return undefined;
    case "stub":
      return stub(node, reason, factory);
    case "warn":
    case "keep":
      return node;
  }
}

/**
 * A declaration with its body replaced by a throw.
 *
 * The signature survives, so every reference still typechecks and the failure happens where
 * the excluded code is actually reached. A declaration with no body to replace, a variable
 * or an interface, has nowhere to put the throw and is stripped instead, which is stated
 * here rather than silently done because a caller asking for `stub` should know it did not
 * get one everywhere.
 */
function stub(node: ts.Node, reason: string, factory: ts.NodeFactory): ts.Node | undefined {
  const body = factory.createBlock([
    factory.createThrowStatement(
      factory.createNewExpression(factory.createIdentifier("Error"), undefined, [
        factory.createStringLiteral(stubMessage(node, reason)),
      ]),
    ),
  ], true);

  if (ts.isFunctionDeclaration(node)) {
    if (node.name === undefined) return undefined;
    return factory.updateFunctionDeclaration(
      node,
      withoutCfg(node.modifiers, factory),
      node.asteriskToken,
      node.name,
      node.typeParameters,
      node.parameters,
      node.type,
      body,
    );
  }

  if (ts.isMethodDeclaration(node)) {
    return factory.updateMethodDeclaration(
      node,
      withoutCfg(node.modifiers, factory),
      node.asteriskToken,
      node.name,
      node.questionToken,
      node.typeParameters,
      node.parameters,
      node.type,
      body,
    );
  }

  if (ts.isGetAccessorDeclaration(node)) {
    return factory.updateGetAccessorDeclaration(
      node,
      withoutCfg(node.modifiers, factory),
      node.name,
      node.parameters,
      node.type,
      body,
    );
  }

  if (ts.isSetAccessorDeclaration(node)) {
    return factory.updateSetAccessorDeclaration(
      node,
      withoutCfg(node.modifiers, factory),
      node.name,
      node.parameters,
      body,
    );
  }

  if (ts.isClassDeclaration(node)) {
    // A class keeps its shape and loses its members, so the type still resolves and every
    // use of it fails at construction with the predicate named.
    const constructorStub = factory.createConstructorDeclaration(undefined, [], body);
    return factory.updateClassDeclaration(
      node,
      withoutCfg(node.modifiers, factory),
      node.name,
      node.typeParameters,
      node.heritageClauses,
      [constructorStub],
    );
  }

  return undefined;
}

/** What a stub throws, which names the predicate rather than just failing. */
function stubMessage(node: ts.Node, reason: string): string {
  const name = (node as { name?: ts.Node }).name;
  const shown = name !== undefined && ts.isIdentifier(name as ts.Identifier)
    ? `"${(name as ts.Identifier).text}"`
    : "this declaration";
  return `${shown} was excluded from this build: ${reason}`;
}

/**
 * A modifier list with every `@cfg` taken out.
 *
 * A stubbed declaration keeps its other decorators and its `export`, and loses only the
 * thing that excluded it. Leaving the `@cfg` in would put a call to a runtime no-op in the
 * output for a declaration that is already inert.
 */
export function withoutCfg(
  modifiers: ts.NodeArray<ts.ModifierLike> | undefined,
  factory: ts.NodeFactory,
): ts.ModifierLike[] | undefined {
  if (modifiers === undefined) return undefined;
  const kept = modifiers.filter((modifier) => !isCfg(modifier));
  return kept.length === 0 ? undefined : factory.createNodeArray(kept).slice();
}

/** Whether a modifier is a `@cfg(...)` decorator. */
function isCfg(modifier: ts.ModifierLike): boolean {
  if (!ts.isDecorator(modifier)) return false;
  const call = modifier.expression;
  if (!ts.isCallExpression(call)) return false;
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text === "cfg";
  return ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name) &&
    callee.name.text === "cfg";
}

/**
 * The action to take, refusing the combinations that cannot be honoured.
 *
 * `stub` on something with no body is the one case worth naming: the caller asked for a
 * declaration that still resolves and there is nowhere to put the throw.
 */
export function checkAction(node: ts.Node, action: CfgAction): void {
  if (action !== "stub") return;
  if (
    ts.isVariableStatement(node) || ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) || ts.isPropertyDeclaration(node)
  ) {
    throw new InvalidCfgUsageError(
      `falseAction is "stub" and this declaration has no body to replace, so there is ` +
        `nowhere to put the throw. Use "strip" for it, or give the build a falseAction of ` +
        `"strip" and mark the few declarations that need a stub individually.`,
      ts.SyntaxKind[node.kind],
    );
  }
}
