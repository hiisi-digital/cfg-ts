/**
 * What this package has to be true of before anything may be committed.
 *
 * Deliberately harsher than the code currently is. A lint set tuned to what
 * already passes measures nothing, and the point of putting it here is that it
 * refuses work rather than describes it.
 *
 * @module
 */

import defaultLints from "@hiisi/viola-default-lints";
import typescript from "@hiisi/viola-grammar-ts";
import { report, viola, when } from "@hiisi/viola";

export default viola()
  .use(defaultLints)
  // the grammar is what turns a file into something a lint can ask questions
  // of. the alias defaults to the grammar's own id, so naming it "typescript"
  // said the same thing twice.
  .add(typescript)
  // anything a linter has any confidence in at all is a failure. a warning
  // is a finding nobody acts on, and a gate that warns is not a gate. the
  // floor was 50 and everything under it passed silently.
  .rule(report.error, when.confidence.atLeast(1))
  // tests are held to the same bar as source. a fixture that drifts is how a
  // suite stops measuring the thing it names.
  .rule(report.error, when.in("tests/**/*.ts"))
  // fixtures that are supposed to be wrong are the one exception, since being
  // wrong is their entire job.
  .rule(report.off, when.in("tests/compile_fail/**"))
  .rule(report.off, when.in("**/fixtures/**"))
  // a literal spelled out across several test cases is several tests each
  // asserting its own expected value. counting those toward a duplication
  // threshold asks for a shared constant, and a test comparing a constant to
  // itself has stopped testing anything. they still show in the locations
  // list, they just do not push a string over the threshold on their own.
  // examples are the same case as tests, and for the same reason: an example
  // that imports a shared constant instead of spelling the literal out has
  // stopped being an example. this package's examples are almost entirely
  // target and predicate names, which is exactly what a reader came to see.
  .set("duplicate-strings.countIn", [
    "**",
    "!**/*_test.ts",
    "!**/*.test.ts",
    "!**/tests/**",
    "!**/examples/**",
    "!**/fixtures/**",
  ])
  // The predicate names are this package's closed vocabulary. Each is written
  // once in `PREDICATE_NAMES`, which feeds completions and error messages, and
  // once as a `case` in the parser's switch, where the literal is the thing a
  // reader is looking for. A test already asserts the two agree, so the drift
  // this would otherwise guard against is closed by something that can fail.
  .set("duplicate-strings.ignoreStrings", [
    "always",
    "arch",
    "capabilities",
    "never",
    "platform",
    "runtime",
  ])
  // `EvaluationContext` and `TransformerOptions` share fields because a
  // transform is an evaluation plus where to write the result. Collapsing them
  // would let a caller pass transform settings where an evaluation is wanted.
  .set("similar-types.ignoreTypes", ["EvaluationContext", "TransformerOptions"])
  // The examples export what they demonstrate, which is what makes them
  // readable as examples rather than as scripts.
  .rule(report.off, when.in("examples/**").and(when.linter("orphaned-code")))
  // `visit` is one local recursive walker, named the way every tree walk in
  // this codebase is named. Three references to one declaration is not three
  // declarations.
  .set("similar-functions.ignoreFunctions", ["visit"]);
