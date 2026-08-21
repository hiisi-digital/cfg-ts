/**
 * @module cfg-ts/predicates/target
 *
 * Predicates over the target a build is producing output for.
 */

import { capability, matchesTarget, resolveTarget } from "@hiisi/tgts";
import type { Architecture, Platform, RuntimeName, TargetPattern } from "@hiisi/tgts";
import type { EvaluationContext, Predicate, TargetPredicate } from "../types.ts";
import { all, any, not } from "./combinators.ts";

/**
 * True when the target being built for matches `pattern`.
 *
 * A string is read as a target id, so `target("deno")` and `target("deno-linux-x64")` both
 * work and mean what they look like: the id's axes have to match and the ones it leaves out
 * are unconstrained. An object is a pattern directly, which is how a capability requirement
 * is written, since no id spells one.
 *
 * @example
 * ```ts
 * target("deno")
 * target({ runtime: "node", platform: "linux" })
 * target({ capabilities: ["webgpu"] })
 * ```
 */
export function target(pattern: string | TargetPattern): TargetPredicate {
  const resolved = typeof pattern === "string" ? patternFromId(pattern) : normalise(pattern);
  const shown = typeof pattern === "string" ? `"${pattern}"` : describePattern(resolved);

  return {
    type: "target",
    pattern: resolved,
    evaluate(context: EvaluationContext): boolean {
      // The context carries an id, and an id has no capabilities: resolving is what attaches
      // them. Matching a parsed target against a capability pattern is false for every
      // target, including the ones that have the capability, and the false is silent.
      return matchesTarget(resolveTarget(context.target), resolved);
    },
    describe(): string {
      return `target(${shown})`;
    },
  };
}

/** True when the target's runtime is `name`. Leaves platform and architecture free. */
export function runtime(name: RuntimeName): TargetPredicate {
  return target({ runtime: name });
}

/** True when the target's platform is `name`. Leaves runtime and architecture free. */
export function platform(name: Platform): TargetPredicate {
  return target({ platform: name });
}

/** True when the target's architecture is `name`. Leaves runtime and platform free. */
export function arch(name: Architecture): TargetPredicate {
  return target({ architecture: name });
}

/**
 * True when the target has every named capability.
 *
 * The predicate worth reaching for most of the time. Gating on a runtime says which
 * implementation you had in mind; gating on a capability says what the code needs, and it
 * keeps working when a fourth runtime arrives with the same capability.
 *
 * @example
 * ```ts
 * capabilities("fs.read", "fs.write")
 * ```
 */
export function capabilities(...names: string[]): TargetPredicate {
  return target({ capabilities: names.map(capability) });
}

/** True when every pattern matches. `targetAll()` with no arguments is true. */
export function targetAll(...patterns: (string | TargetPattern)[]): Predicate {
  return all(...patterns.map(target));
}

/** True when some pattern matches. `targetAny()` with no arguments is false. */
export function targetAny(...patterns: (string | TargetPattern)[]): Predicate {
  return any(...patterns.map(target));
}

/** True when no pattern matches. */
export function notTarget(pattern: string | TargetPattern): Predicate {
  return not(target(pattern));
}

/** Whether `predicate` is the shape {@link target} builds. */
export function isTargetPredicate(predicate: Predicate): predicate is TargetPredicate {
  return predicate.type === "target";
}

/**
 * A target id read as a pattern.
 *
 * `resolveTarget` throws on a malformed id, which is what should happen: a typo in a `@cfg`
 * is a build error at the point it was written, not a predicate that is quietly false and
 * strips code nobody meant to strip.
 */
function patternFromId(id: string): TargetPattern {
  const resolved = resolveTarget(id);
  return {
    runtime: resolved.runtime.name,
    ...(resolved.platform ? { platform: resolved.platform.name } : {}),
    ...(resolved.architecture ? { architecture: resolved.architecture.name } : {}),
  };
}

/**
 * A pattern with its capability strings branded.
 *
 * A pattern written as an object literal spells its capabilities as plain strings, because
 * that is what a consumer types. `capability` validates the shape, so a name that cannot be
 * one is rejected here rather than failing to match at every target.
 */
function normalise(pattern: TargetPattern): TargetPattern {
  if (pattern.capabilities === undefined) return pattern;
  return {
    ...pattern,
    capabilities: pattern.capabilities.map((c) => capability(c as unknown as string)),
  };
}

/** A pattern in the form it would have been written in. */
function describePattern(pattern: TargetPattern): string {
  const parts: string[] = [];
  if (pattern.runtime !== undefined) parts.push(`runtime: "${pattern.runtime}"`);
  if (pattern.platform !== undefined) parts.push(`platform: "${pattern.platform}"`);
  if (pattern.architecture !== undefined) {
    parts.push(`architecture: "${pattern.architecture}"`);
  }
  if (pattern.capabilities !== undefined) {
    parts.push(`capabilities: [${pattern.capabilities.map((c) => `"${c}"`).join(", ")}]`);
  }
  return `{ ${parts.join(", ")} }`;
}
