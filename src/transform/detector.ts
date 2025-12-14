/**
 * @cfg decorator detector
 *
 * Utilities for finding and extracting @cfg decorators from TypeScript AST.
 *
 * @module
 */

import type ts from "typescript";

/**
 * Information about a detected @cfg decorator
 */
export interface DetectedCfgDecorator {
  /** The decorator AST node */
  readonly decorator: ts.Decorator;
  /** The node the decorator is attached to */
  readonly target: ts.Node;
  /** The predicate expression inside @cfg(...) */
  readonly predicateExpression: ts.Expression | undefined;
  /** Source file containing the decorator */
  readonly sourceFile: ts.SourceFile;
  /** Start position in the source */
  readonly start: number;
  /** End position in the source */
  readonly end: number;
}

/**
 * Options for the detector
 */
export interface DetectorOptions {
  /** Custom decorator name (default: "cfg") */
  readonly decoratorName?: string;
  /** Whether to detect on all node types or only supported ones */
  readonly detectAll?: boolean;
}

/**
 * Finds all @cfg decorators in a source file.
 *
 * @param sourceFile - The TypeScript source file to scan
 * @param typeChecker - Optional type checker for better resolution
 * @param options - Detection options
 * @returns Array of detected @cfg decorators
 *
 * TODO: Implement detection logic:
 * - Walk the AST recursively
 * - Find all decorator nodes
 * - Check if decorator is @cfg (or matches decoratorName option)
 * - Extract predicate expression from decorator call
 * - Return array of DetectedCfgDecorator objects
 */
export function findCfgDecorators(
  _sourceFile: ts.SourceFile,
  _typeChecker?: ts.TypeChecker,
  _options?: DetectorOptions,
): DetectedCfgDecorator[] {
  // TODO: Create visitor function to walk AST
  // TODO: Check each node for decorators
  // TODO: Filter for @cfg decorators
  // TODO: Extract predicate expressions
  // TODO: Build and return DetectedCfgDecorator array
  throw new Error("Not implemented: findCfgDecorators");
}

/**
 * Checks if a decorator is a @cfg decorator.
 *
 * @param decorator - The decorator node to check
 * @param decoratorName - The name to look for (default: "cfg")
 * @returns True if this is a @cfg decorator
 *
 * TODO: Implement check logic:
 * - Handle both @cfg and @cfg(...) forms
 * - Handle aliased imports (import { cfg as c } from ...)
 */
export function isCfgDecorator(
  _decorator: ts.Decorator,
  _decoratorName: string = "cfg",
): boolean {
  // TODO: Get the decorator expression
  // TODO: Check if it's a call expression (@cfg(...)) or identifier (@cfg)
  // TODO: Get the identifier name
  // TODO: Compare against decoratorName
  throw new Error("Not implemented: isCfgDecorator");
}

/**
 * Extracts the predicate expression from a @cfg decorator.
 *
 * @param decorator - The @cfg decorator node
 * @returns The predicate expression or undefined if not a call expression
 *
 * TODO: Implement extraction:
 * - Check if decorator is a call expression
 * - Get the first argument
 * - Return the argument expression
 */
export function extractPredicateExpression(
  _decorator: ts.Decorator,
): ts.Expression | undefined {
  // TODO: Check if decorator.expression is a CallExpression
  // TODO: Get the first argument from the call
  // TODO: Return the argument expression
  throw new Error("Not implemented: extractPredicateExpression");
}

/**
 * Gets the kind/type of node that has a @cfg decorator.
 *
 * @param node - The decorated node
 * @returns String description of the node kind
 *
 * TODO: Useful for error messages and debugging
 */
export function getDecoratedNodeKind(_node: ts.Node): string {
  // TODO: Switch on node.kind
  // TODO: Return human-readable description
  throw new Error("Not implemented: getDecoratedNodeKind");
}

/**
 * Checks if a node kind is traditionally supported for decorators.
 *
 * @param node - The node to check
 * @returns True if this node kind natively supports decorators in TS
 *
 * TODO: Check against:
 * - ClassDeclaration
 * - MethodDeclaration
 * - PropertyDeclaration
 * - GetAccessor
 * - SetAccessor
 * - Parameter (constructor parameters)
 */
export function isNativelyDecoratable(_node: ts.Node): boolean {
  // TODO: Check node.kind against decorator-supporting node kinds
  throw new Error("Not implemented: isNativelyDecoratable");
}

/**
 * Gets all decorators from a node, handling both legacy and ES decorators.
 *
 * @param node - The node to get decorators from
 * @returns Array of decorator nodes, or empty array if none
 *
 * TODO: Handle both TS 4.x and 5.x decorator APIs
 */
export function getDecorators(_node: ts.Node): readonly ts.Decorator[] {
  // TODO: Check for node.decorators (legacy)
  // TODO: Check for ts.getDecorators (TS 5.x)
  // TODO: Return decorators array or empty array
  throw new Error("Not implemented: getDecorators");
}
