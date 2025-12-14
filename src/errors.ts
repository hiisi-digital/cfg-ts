/**
 * Error types for cfg-ts
 *
 * @module
 */

/**
 * Base error class for cfg-ts errors
 */
export class CfgError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CfgError";
  }
}

/**
 * Error thrown when a predicate cannot be parsed
 *
 * TODO: Include source location and helpful suggestions
 */
export class PredicateParseError extends CfgError {
  constructor(
    message: string,
    public readonly predicateSource: string,
    public readonly position?: number,
  ) {
    super(`Failed to parse predicate: ${message}`);
    this.name = "PredicateParseError";
  }
}

/**
 * Error thrown when a predicate evaluation fails
 *
 * TODO: Include context about the evaluation environment
 */
export class PredicateEvaluationError extends CfgError {
  constructor(
    message: string,
    public readonly predicateName?: string,
  ) {
    super(`Predicate evaluation failed: ${message}`);
    this.name = "PredicateEvaluationError";
  }
}

/**
 * Error thrown when @cfg decorator is used incorrectly
 *
 * TODO: Include expected usage and examples
 */
export class InvalidCfgUsageError extends CfgError {
  constructor(
    message: string,
    public readonly nodeKind?: string,
  ) {
    super(`Invalid @cfg usage: ${message}`);
    this.name = "InvalidCfgUsageError";
  }
}

/**
 * Error thrown when a feature referenced in @cfg is not defined
 *
 * TODO: Suggest similar feature names
 */
export class UndefinedFeatureError extends CfgError {
  constructor(public readonly featureId: string) {
    super(`Feature "${featureId}" is not defined`);
    this.name = "UndefinedFeatureError";
  }
}

/**
 * Error thrown when a target referenced in @cfg is not defined
 *
 * TODO: Suggest similar target names
 */
export class UndefinedTargetError extends CfgError {
  constructor(public readonly targetId: string) {
    super(`Target "${targetId}" is not defined`);
    this.name = "UndefinedTargetError";
  }
}

/**
 * Error thrown when the TypeScript compiler transformer encounters an issue
 *
 * TODO: Include file path and source position
 */
export class TransformError extends CfgError {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    const location = filePath ? ` at ${filePath}${line ? `:${line}` : ""}${column ? `:${column}` : ""}` : "";
    super(`Transform error${location}: ${message}`);
    this.name = "TransformError";
  }
}

/**
 * Error thrown when the language service plugin encounters an issue
 */
export class PluginError extends CfgError {
  constructor(message: string) {
    super(`Plugin error: ${message}`);
    this.name = "PluginError";
  }
}
