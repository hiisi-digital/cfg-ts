/**
 * Hover information provider for @cfg decorators
 *
 * Provides hover tooltips in IDEs when hovering over @cfg decorators
 * and their predicates.
 *
 * @module
 */

import type ts from "typescript";

/**
 * Hover information for a @cfg decorator
 */
export interface CfgHoverInfo {
  /** The display text for the hover */
  readonly displayText: string;
  /** Documentation string */
  readonly documentation?: string;
  /** The predicate being evaluated */
  readonly predicateDescription?: string;
  /** Current evaluation result (if determinable) */
  readonly evaluationHint?: "enabled" | "disabled" | "unknown";
}

/**
 * Gets hover information for a @cfg decorator at the given position.
 *
 * @param sourceFile - The source file containing the decorator
 * @param position - The cursor position
 * @returns Hover info or undefined if not hovering over @cfg
 *
 * TODO: Implement hover detection:
 * - Check if position is within a @cfg decorator
 * - Extract the predicate expression
 * - Build hover info with predicate description
 * - Include evaluation hint based on current config
 */
export function getCfgHoverInfo(
  _sourceFile: ts.SourceFile,
  _position: number,
): CfgHoverInfo | undefined {
  // TODO: Find node at position
  // TODO: Check if it's a @cfg decorator
  // TODO: Extract predicate
  // TODO: Build hover info
  throw new Error("Not implemented: getCfgHoverInfo");
}

/**
 * Formats hover info as a TypeScript QuickInfo object.
 *
 * @param info - The hover info to format
 * @returns TypeScript QuickInfo compatible object
 *
 * TODO: Implement formatting:
 * - Convert to displayParts array
 * - Include documentation
 * - Format for VS Code display
 */
export function formatHoverInfo(
  _info: CfgHoverInfo,
): ts.QuickInfo | undefined {
  // TODO: Create displayParts array
  // TODO: Add documentation parts
  // TODO: Return QuickInfo object
  throw new Error("Not implemented: formatHoverInfo");
}

/**
 * Gets documentation for a predicate type.
 *
 * @param predicateType - The type of predicate (feature, target, all, etc.)
 * @returns Documentation string for the predicate
 *
 * TODO: Implement documentation lookup:
 * - Return appropriate docs for each predicate type
 * - Include usage examples
 */
export function getPredicateDocumentation(
  _predicateType: string,
): string {
  // TODO: Switch on predicate type
  // TODO: Return appropriate documentation
  throw new Error("Not implemented: getPredicateDocumentation");
}

/**
 * Generates a description string for a predicate.
 *
 * @param predicateNode - The AST node representing the predicate
 * @returns Human-readable description of the predicate
 *
 * TODO: Implement predicate description:
 * - Parse predicate AST
 * - Generate readable description
 * - Handle nested predicates (all, any, not)
 */
export function describePredicateNode(
  _predicateNode: ts.Node,
): string {
  // TODO: Parse the predicate expression
  // TODO: Build human-readable description
  throw new Error("Not implemented: describePredicateNode");
}
