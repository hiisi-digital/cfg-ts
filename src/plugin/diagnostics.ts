/**
 * Diagnostic filtering for TypeScript Language Service Plugin
 *
 * Filters out TypeScript errors that are expected when using @cfg decorators
 * on elements that don't natively support decorators (functions, variables, etc.).
 *
 * @module
 */

import type ts from "typescript";

/**
 * Error codes to filter when @cfg decorator is detected.
 *
 * These are TypeScript errors that occur when decorators are applied
 * to elements that don't natively support them.
 */
export const FILTERED_ERROR_CODES = {
  /** Decorators are not valid here */
  DECORATORS_NOT_VALID: 1206,
  /** Decorators can only be used on class declarations, methods, etc. */
  DECORATOR_INVALID_TARGET: 1240,
  /** Decorator function return type is not assignable */
  DECORATOR_RETURN_TYPE: 1270,
  /** Unable to resolve signature of decorator */
  DECORATOR_SIGNATURE: 1329,
  /** Experimental decorators warning */
  EXPERIMENTAL_DECORATORS: 1219,
} as const;

/**
 * Checks if a diagnostic should be filtered for @cfg usage.
 *
 * @param diagnostic - The TypeScript diagnostic to check
 * @returns True if the diagnostic should be suppressed
 *
 * TODO: Implement filtering logic:
 * - Check if diagnostic code is in our filter list
 * - Check if the diagnostic is related to a @cfg decorator
 * - Only filter if we can confirm it's a valid @cfg usage
 */
export function shouldFilterDiagnostic(
  _diagnostic: ts.Diagnostic,
): boolean {
  // TODO: Check diagnostic.code against FILTERED_ERROR_CODES
  // TODO: Inspect diagnostic.file and diagnostic.start to find the decorator
  // TODO: Check if the decorator is @cfg
  // TODO: Return true only for valid @cfg usages
  throw new Error("Not implemented: shouldFilterDiagnostic");
}

/**
 * Filters an array of diagnostics, removing @cfg-related false positives.
 *
 * @param diagnostics - Array of TypeScript diagnostics
 * @returns Filtered array with @cfg false positives removed
 *
 * TODO: Implement filtering:
 * - Iterate through diagnostics
 * - Apply shouldFilterDiagnostic to each
 * - Return filtered array
 */
export function filterDiagnostics(
  _diagnostics: readonly ts.Diagnostic[],
): ts.Diagnostic[] {
  // TODO: Filter diagnostics using shouldFilterDiagnostic
  // TODO: Return new array without filtered diagnostics
  throw new Error("Not implemented: filterDiagnostics");
}

/**
 * Checks if a node has a @cfg decorator.
 *
 * @param node - The TypeScript AST node to check
 * @param sourceFile - The source file containing the node
 * @returns True if the node has a @cfg decorator
 *
 * TODO: Implement decorator detection:
 * - Get decorators from node (if any)
 * - Check if any decorator is named "cfg"
 * - Handle both @cfg and @cfg(...) forms
 */
export function hasCfgDecorator(
  _node: ts.Node,
  _sourceFile: ts.SourceFile,
): boolean {
  // TODO: Get decorators from node
  // TODO: Check for @cfg decorator
  throw new Error("Not implemented: hasCfgDecorator");
}

/**
 * Adds a custom diagnostic for @cfg usage.
 *
 * @param node - The node with the @cfg decorator
 * @param message - The diagnostic message
 * @param category - The diagnostic category (error, warning, etc.)
 * @returns A new Diagnostic object
 *
 * TODO: Create custom diagnostics for:
 * - Invalid predicate syntax
 * - Unknown feature references
 * - Unknown target references
 * - Deprecated features
 */
export function createCfgDiagnostic(
  _node: ts.Node,
  _message: string,
  _category: ts.DiagnosticCategory,
): ts.Diagnostic {
  // TODO: Create and return a Diagnostic object
  // TODO: Include file, position, and message
  throw new Error("Not implemented: createCfgDiagnostic");
}
