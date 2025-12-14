/**
 * Completion provider for the @cfg Language Service Plugin.
 *
 * Provides IDE completions for @cfg decorator predicates.
 *
 * @module
 */

import type ts from "typescript";

/**
 * Completion entry for @cfg predicates
 */
export interface CfgCompletionEntry {
  readonly name: string;
  readonly kind: ts.ScriptElementKind;
  readonly sortText: string;
  readonly insertText?: string;
  readonly documentation?: string;
}

/**
 * Gets completion entries for @cfg decorator context.
 *
 * TODO: Implement completion logic:
 * - Detect if cursor is inside @cfg()
 * - Provide predicate function completions (feature, target, all, any, not)
 * - Provide feature ID completions inside feature()
 * - Provide target ID completions inside target()
 *
 * @param _fileName - The file being edited
 * @param _position - Cursor position in the file
 * @param _languageService - The TypeScript language service
 * @returns Array of completion entries
 */
export function getCfgCompletions(
  _fileName: string,
  _position: number,
  _languageService: ts.LanguageService,
): CfgCompletionEntry[] {
  // TODO: Get the source file
  // TODO: Find the token at position
  // TODO: Check if we're inside a @cfg decorator
  // TODO: Determine what kind of completions to provide
  // TODO: Return appropriate completion entries
  throw new Error("Not implemented: getCfgCompletions");
}

/**
 * Gets completions for predicate functions.
 *
 * TODO: Return completions for: feature, target, all, any, not
 */
export function getPredicateFunctionCompletions(): CfgCompletionEntry[] {
  // TODO: Return predefined predicate function completions
  // - feature("...")
  // - target("...")
  // - all(...)
  // - any(...)
  // - not(...)
  throw new Error("Not implemented: getPredicateFunctionCompletions");
}

/**
 * Gets completions for feature IDs.
 *
 * TODO: Load available feature IDs from project configuration
 *
 * @param _knownFeatures - Array of known feature IDs from config
 * @returns Completion entries for each feature
 */
export function getFeatureIdCompletions(
  _knownFeatures: string[],
): CfgCompletionEntry[] {
  // TODO: Convert feature IDs to completion entries
  // TODO: Include feature descriptions as documentation
  throw new Error("Not implemented: getFeatureIdCompletions");
}

/**
 * Gets completions for target specifications.
 *
 * TODO: Return completions for known target strings
 * - deno, node, bun, browser
 * - darwin, linux, windows
 * - x64, arm64
 * - Composed targets like "node-linux-x64"
 */
export function getTargetCompletions(): CfgCompletionEntry[] {
  // TODO: Return completions for predefined targets
  throw new Error("Not implemented: getTargetCompletions");
}

/**
 * Checks if a position is inside a @cfg decorator call.
 *
 * TODO: Implement AST inspection
 *
 * @param _sourceFile - The source file AST
 * @param _position - Position to check
 * @returns True if position is inside @cfg(...)
 */
export function isInsideCfgDecorator(
  _sourceFile: ts.SourceFile,
  _position: number,
): boolean {
  // TODO: Walk up the AST from position
  // TODO: Check if we're inside a decorator
  // TODO: Check if the decorator is @cfg
  throw new Error("Not implemented: isInsideCfgDecorator");
}
