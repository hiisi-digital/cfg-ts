/**
 * TypeScript Language Service Plugin for @cfg decorator support.
 *
 * This plugin provides IDE support for the @cfg decorator system:
 * - Suppresses errors for @cfg on non-class elements
 * - Provides completions for predicate names
 * - Shows hover info for @cfg decorators
 * - Emits diagnostics for disabled features
 *
 * @module
 */

import type { PluginConfig } from "../types.ts";

/**
 * TypeScript Language Service Plugin factory.
 *
 * This is the entry point that TypeScript calls when loading the plugin.
 * Configure in tsconfig.json:
 * ```json
 * {
 *   "compilerOptions": {
 *     "plugins": [
 *       { "name": "@hiisi/cfg-ts/plugin" }
 *     ]
 *   }
 * }
 * ```
 *
 * TODO: Implement the plugin factory
 * - Wrap the language service
 * - Override getSemanticDiagnostics to filter @cfg errors
 * - Override getCompletionsAtPosition to add predicate suggestions
 * - Override getQuickInfoAtPosition to show @cfg hover info
 *
 * @param modules - TypeScript module provided by the host
 * @returns Plugin module with create function
 */
export function init(_modules: { typescript: typeof import("typescript") }): {
  create: (info: PluginCreateInfo) => unknown;
} {
  // TODO: Implement plugin initialization
  // - Store reference to typescript module
  // - Return create function that wraps the language service
  throw new Error("Not implemented: plugin init");
}

/**
 * Plugin creation info provided by TypeScript.
 */
export interface PluginCreateInfo {
  project: unknown; // ts.server.Project
  languageService: unknown; // ts.LanguageService
  languageServiceHost: unknown; // ts.LanguageServiceHost
  serverHost: unknown; // ts.server.ServerHost
  config: PluginConfig;
}

/**
 * Creates a wrapped language service with @cfg support.
 *
 * TODO: Implement service wrapper
 * - Proxy all methods to original service
 * - Override specific methods for @cfg support
 *
 * @param info - Plugin creation info from TypeScript
 * @returns Wrapped language service
 */
export function createLanguageService(_info: PluginCreateInfo): unknown {
  // TODO: Create proxy for language service
  // TODO: Override getSemanticDiagnostics
  // TODO: Override getCompletionsAtPosition
  // TODO: Override getQuickInfoAtPosition
  throw new Error("Not implemented: createLanguageService");
}

/**
 * Default export for TypeScript plugin loading.
 */
export default init;
