/**
 * Target predicate for @cfg decorator
 *
 * Provides a predicate that evaluates against target specifications
 * (runtime, platform, architecture).
 *
 * @module
 */

import type { TargetPattern } from "@hiisi/tgts";
import type { Predicate, PredicateContext } from "../types.ts";

/**
 * Creates a predicate that checks if the current target matches a pattern.
 *
 * @param pattern - Target pattern to match against (string or object)
 * @returns A Predicate that evaluates to true if target matches
 *
 * TODO: Implement target predicate creation:
 * - Parse pattern string if string provided (e.g., "node-linux-x64")
 * - Create TargetPattern object
 * - Return predicate that checks context.target against pattern
 *
 * @example
 * ```ts
 * @cfg(target("node"))
 * function nodeOnly() { ... }
 *
 * @cfg(target({ runtime: "deno", platform: "darwin" }))
 * function denoMac() { ... }
 * ```
 */
export function target(_pattern: string | TargetPattern): Predicate {
  // TODO: Parse pattern if string
  // TODO: Create predicate function
  // TODO: Return predicate with metadata
  throw new Error("Not implemented: target");
}

/**
 * Creates a predicate that checks for a specific runtime.
 *
 * @param runtime - The runtime name to check for
 * @returns A Predicate that evaluates to true if running on that runtime
 *
 * TODO: Shorthand for target({ runtime: runtime })
 */
export function runtime(
  _runtime: "deno" | "node" | "bun" | "browser",
): Predicate {
  // TODO: Create target predicate with runtime only
  throw new Error("Not implemented: runtime");
}

/**
 * Creates a predicate that checks for a specific platform.
 *
 * @param platform - The platform name to check for
 * @returns A Predicate that evaluates to true if running on that platform
 *
 * TODO: Shorthand for target({ platform: platform })
 */
export function platform(
  _platform: "darwin" | "linux" | "windows",
): Predicate {
  // TODO: Create target predicate with platform only
  throw new Error("Not implemented: platform");
}

/**
 * Creates a predicate that checks for a specific architecture.
 *
 * @param arch - The architecture name to check for
 * @returns A Predicate that evaluates to true if running on that architecture
 *
 * TODO: Shorthand for target({ architecture: arch })
 */
export function arch(_arch: "x64" | "arm64"): Predicate {
  // TODO: Create target predicate with architecture only
  throw new Error("Not implemented: arch");
}

/**
 * Evaluates a target predicate against a context.
 *
 * @param predicate - The target predicate to evaluate
 * @param context - The evaluation context containing current target
 * @returns True if the target matches
 *
 * TODO: Implement evaluation:
 * - Get current target from context
 * - Match against predicate's pattern
 * - Return match result
 */
export function evaluateTargetPredicate(
  _predicate: Predicate,
  _context: PredicateContext,
): boolean {
  // TODO: Extract pattern from predicate
  // TODO: Get target from context
  // TODO: Use matchesTarget from @hiisi/tgts
  throw new Error("Not implemented: evaluateTargetPredicate");
}

/**
 * Checks if a predicate is a target predicate.
 *
 * @param predicate - The predicate to check
 * @returns True if this is a target predicate
 */
export function isTargetPredicate(_predicate: Predicate): boolean {
  // TODO: Check predicate.type === "target"
  throw new Error("Not implemented: isTargetPredicate");
}
