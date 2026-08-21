/**
 * @module cfg-ts/errors
 *
 * Everything cfg-ts throws, and the suggestions it attaches when it can.
 */

import type { Predicate } from "./types.ts";

/** The base every error here extends, so a consumer can catch the family. */
export class CfgError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CfgError";
  }
}

/**
 * A `@cfg` argument that is not a predicate expression.
 *
 * Carries the source it choked on and, where it has one, the offset, because the transformer
 * reads a decorator out of a file and a message with no position sends the reader looking
 * through it.
 */
export class PredicateParseError extends CfgError {
  constructor(
    message: string,
    readonly predicateSource: string,
    readonly position?: number,
  ) {
    super(`cannot read this as a predicate: ${message}\n  in: ${predicateSource}`);
    this.name = "PredicateParseError";
  }
}

/**
 * A predicate that could not answer.
 *
 * Distinct from a predicate that answered false, and deliberately loud. A false strips the
 * code and takes its references with it, so a predicate that silently failed to false would
 * surface as an error somewhere else entirely, in a file nobody was editing.
 */
export class PredicateEvaluationError extends CfgError {
  constructor(message: string, readonly predicate?: Predicate) {
    const shown = predicate === undefined ? "" : `\n  in: ${predicate.describe()}`;
    super(`${message}${shown}`);
    this.name = "PredicateEvaluationError";
  }
}

/** A `@cfg` in a position the transformer cannot act on. */
export class InvalidCfgUsageError extends CfgError {
  constructor(message: string, readonly nodeKind?: string) {
    const shown = nodeKind === undefined ? "" : ` (on a ${nodeKind})`;
    super(`@cfg${shown}: ${message}`);
    this.name = "InvalidCfgUsageError";
  }
}

/**
 * A feature id no manifest declares.
 *
 * Suggests the closest declared ids, because the overwhelmingly common cause is a typo and
 * the second most common is a name that was renamed. Both are answered by the same list.
 */
export class UndefinedFeatureError extends CfgError {
  constructor(readonly featureId: string, known: readonly string[] = []) {
    super(`no feature "${featureId}" is declared${suggest(featureId, known)}`);
    this.name = "UndefinedFeatureError";
  }
}

/** A target id that is not well formed, or names nothing. */
export class UndefinedTargetError extends CfgError {
  constructor(readonly targetId: string, known: readonly string[] = []) {
    super(`no target "${targetId}" is known${suggest(targetId, known)}`);
    this.name = "UndefinedTargetError";
  }
}

/** The transformer failed on a file, at a position in it. */
export class TransformError extends CfgError {
  constructor(
    message: string,
    readonly filePath?: string,
    readonly line?: number,
    readonly column?: number,
  ) {
    super(`${formatLocation(filePath, line, column)}${message}`);
    this.name = "TransformError";
  }
}

/** The language service plugin failed. */
export class PluginError extends CfgError {
  constructor(message: string) {
    super(`cfg-ts plugin: ${message}`);
    this.name = "PluginError";
  }
}

/**
 * `path:line:column: ` for the parts that are present, and nothing at all when none are.
 *
 * Kept separate from the message so a bare `TransformError` reads as a sentence rather than
 * as a sentence with a stray colon in front of it.
 */
function formatLocation(file?: string, line?: number, column?: number): string {
  if (file === undefined) return "";
  const at = line === undefined ? "" : column === undefined ? `:${line}` : `:${line}:${column}`;
  return `${file}${at}: `;
}

/**
 * The closest few known names, as a sentence to append.
 *
 * Three at most: past that the list stops being a suggestion and becomes the whole
 * vocabulary printed back at somebody who already knows it.
 */
function suggest(given: string, known: readonly string[]): string {
  if (known.length === 0) return "";
  const near = known
    .map((candidate) => ({ candidate, distance: editDistance(given, candidate) }))
    // A quarter of the length, rounded up, and at least two. A fixed threshold either misses
    // every typo in a long dotted id or matches everything among short ones.
    .filter(({ candidate, distance }) =>
      distance <= Math.max(2, Math.ceil(Math.max(given.length, candidate.length) / 4))
    )
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ candidate }) => `"${candidate}"`);
  if (near.length === 0) return "";
  return `. Did you mean ${near.join(", ")}?`;
}

/**
 * Levenshtein distance, two rows rather than a full matrix.
 *
 * Small enough to keep here rather than take a dependency for: this runs once, on the way
 * to throwing, over a list of names a project declared by hand.
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length]!;
}
