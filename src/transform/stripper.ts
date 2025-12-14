/**
 * Code stripper/stubber for @cfg transformer
 *
 * Handles the removal or stubbing of code elements based on @cfg predicate
 * evaluation results.
 *
 * @module
 */

import type ts from "typescript";
import type { CfgAction } from "../types.ts";

/**
 * Options for stripping/stubbing code
 */
export interface StripOptions {
  /** The action to take (strip, stub, warn, keep) */
  readonly action: CfgAction;
  /** Whether to preserve JSDoc comments */
  readonly preserveComments?: boolean;
  /** Custom stub message */
  readonly stubMessage?: string;
}

/**
 * Strips a node from the AST entirely.
 *
 * @param node - The node to strip
 * @param context - The transformation context
 * @returns undefined (node is removed from output)
 *
 * TODO: Implement stripping:
 * - Return undefined to remove the node
 * - Handle export statements that reference the stripped node
 * - Handle imports that might become unused
 */
export function stripNode(
  _node: ts.Node,
  _context: ts.TransformationContext,
): ts.Node | undefined {
  // TODO: Return undefined to strip the node
  // TODO: Handle cascading effects (exports, imports)
  throw new Error("Not implemented: stripNode");
}

/**
 * Replaces a node with a stub that throws at runtime.
 *
 * @param node - The node to stub
 * @param context - The transformation context
 * @param message - Message for the stub's error
 * @returns A stubbed version of the node
 *
 * TODO: Implement stubbing:
 * - For functions: Replace body with throw statement
 * - For classes: Replace methods with throw stubs
 * - For variables: Replace initializer with stub function
 * - Preserve the type signature for type checking
 */
export function stubNode(
  _node: ts.Node,
  _context: ts.TransformationContext,
  _message?: string,
): ts.Node {
  // TODO: Determine node type
  // TODO: Create appropriate stub replacement
  // TODO: Preserve type annotations
  throw new Error("Not implemented: stubNode");
}

/**
 * Creates a stub function body that throws an error.
 *
 * @param message - The error message
 * @param factory - TypeScript node factory
 * @returns A block containing a throw statement
 *
 * TODO: Generate code like:
 * ```ts
 * { throw new Error("Feature X is not enabled"); }
 * ```
 */
export function createStubBody(
  _message: string,
  _factory: ts.NodeFactory,
): ts.Block {
  // TODO: Create throw statement
  // TODO: Wrap in block
  throw new Error("Not implemented: createStubBody");
}

/**
 * Stubs a function declaration.
 *
 * @param node - The function to stub
 * @param factory - TypeScript node factory
 * @param message - Error message for the stub
 * @returns Stubbed function declaration
 *
 * TODO: Replace function body with throw, preserve signature
 */
export function stubFunctionDeclaration(
  _node: ts.FunctionDeclaration,
  _factory: ts.NodeFactory,
  _message?: string,
): ts.FunctionDeclaration {
  // TODO: Copy function signature
  // TODO: Replace body with stub
  throw new Error("Not implemented: stubFunctionDeclaration");
}

/**
 * Stubs a class declaration.
 *
 * @param node - The class to stub
 * @param factory - TypeScript node factory
 * @param message - Error message for stubs
 * @returns Stubbed class declaration
 *
 * TODO: Replace all method bodies with throws, preserve structure
 */
export function stubClassDeclaration(
  _node: ts.ClassDeclaration,
  _factory: ts.NodeFactory,
  _message?: string,
): ts.ClassDeclaration {
  // TODO: Iterate through class members
  // TODO: Stub each method
  // TODO: Keep property declarations
  throw new Error("Not implemented: stubClassDeclaration");
}

/**
 * Stubs a variable declaration.
 *
 * @param node - The variable declaration to stub
 * @param factory - TypeScript node factory
 * @param message - Error message for the stub
 * @returns Stubbed variable declaration
 *
 * TODO: Replace initializer with stub function or undefined
 */
export function stubVariableDeclaration(
  _node: ts.VariableDeclaration,
  _factory: ts.NodeFactory,
  _message?: string,
): ts.VariableDeclaration {
  // TODO: Determine if it's a function or value
  // TODO: Replace with appropriate stub
  throw new Error("Not implemented: stubVariableDeclaration");
}

/**
 * Determines the appropriate action for a node based on options.
 *
 * @param options - The strip options
 * @returns The action to take
 */
export function determineAction(options: StripOptions): CfgAction {
  return options.action ?? "strip";
}
