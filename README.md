# `cfg-ts`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/cfg-ts)](https://jsr.io/@hiisi/cfg-ts)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/cfg-ts.svg)](https://github.com/hiisi-digital/cfg-ts/issues)
![License](https://img.shields.io/github/license/hiisi-digital/cfg-ts?color=%23009689)

> The `@cfg` decorator for Rust-like conditional compilation in TypeScript, with a compiler transformer and language service plugin.

</div>

## What it does

A `@cfg(...)` marks a declaration with the condition under which it belongs in the build.
When the condition holds the declaration is kept and the marker is removed; when it does not,
the declaration is stripped. One source file carries what every runtime needs, and each
target's output carries only its own half. It is Rust's `#[cfg(...)]`, for TypeScript.

```ts
//@cfg(target("deno"))
export const readText = (path: string) => Deno.readTextFile(path);

//@cfg(any(target("node"), target("bun")))
export const readText = async (path: string) =>
  (await import("node:fs/promises")).readFile(path, "utf8");
```

Built for deno, that file exports the first. Built for node or bun, the second. Neither output
mentions the other, and neither mentions `@cfg`.

## Two forms, and why there are two

TypeScript permits a decorator on a class and a class element and nowhere else. On a function
or a variable the checker raises TS1206, "Decorators are not valid here".

That is a grammar check the checker raises, **not a parse error**. The parser attaches the
decorator and reports no parse diagnostics at all, which is what makes the decorator form
workable: a transformer running before type checking reads the node perfectly, and the
language service plugin suppresses the diagnostic so an editor stops underlining it.

Where installing an editor plugin is not wanted, the same condition goes in a leading comment,
which is legal everywhere and needs nothing:

| Form          | Where it is valid                | Needs                                            |
| ------------- | -------------------------------- | ------------------------------------------------ |
| `@cfg(...)`   | classes and class elements       | nothing                                          |
| `@cfg(...)`   | functions, variables, statements | the language service plugin, for the editor only |
| `//@cfg(...)` | everywhere                       | nothing                                          |

Both forms go through the same grammar, so a project can use either or both, and a predicate
reads the same whichever way it was written.

## The predicates

| Predicate                                                   | Asks                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `feature("net")`                                            | is this feature enabled for the build                                            |
| `notFeature`, `allFeatures`, `anyFeature`                   | the same, negated or over several                                                |
| `target("deno")`, `target("deno-linux-x64")`                | does the target id match, with the axes it omits left free                       |
| `target({ runtime, platform, architecture, capabilities })` | the same, written out                                                            |
| `runtime`, `platform`, `arch`                               | one axis each                                                                    |
| `capabilities("webgpu")`                                    | can the target do this                                                           |
| `all`, `any`, `not`                                         | composition, short-circuiting                                                    |
| `always`, `never`                                           | the constants, which is how code is taken out of every build without deleting it |
| `custom("release")`, or any unrecognised call               | resolved from a table the build registers                                        |

`capabilities` is the one worth reaching for. Gating on a runtime says which implementation you
had in mind; gating on a capability says what the code needs, and it keeps working when a
fourth runtime arrives with the same capability.

## What happens to a false declaration

`strip` removes it, and is the default. Removing a declaration removes its references too, so
three other actions exist for finding out which: `stub` keeps the declaration and replaces its
body with a throw naming the predicate that excluded it, `warn` keeps it and reports it, and
`keep` keeps it silently.

## Building it in

```ts
import { contextFromStrings, transformSource } from "@hiisi/cfg-ts";

const { code, diagnostics, stats } = transformSource(source, "mod.ts", {
  ...contextFromStrings("node", ["net"]),
});
```

For a compiler that is already running, `programTransformer` is a `ts.TransformerFactory` and
is the ts-patch entry point. For the editor, add the plugin to `tsconfig.json`:

```json
{ "compilerOptions": { "plugins": [{ "name": "@hiisi/cfg-ts/plugin", "defaultTarget": "deno" }] } }
```

## Examples

`examples/` runs. `deno task test` executes every one of them and asserts on what they print.

| Example                 | What it shows                                           |
| ----------------------- | ------------------------------------------------------- |
| `one_predicate.ts`      | one condition against two builds                        |
| `every_predicate.ts`    | every predicate in the grammar, and what each answers   |
| `strip_for_a_target.ts` | one source file, three targets, three outputs           |
| `the_decorator_form.ts` | the decorator on a class, untransformed and transformed |

## Developing on it

`@hiisi/tgts` is not published yet, so `deno.local.json` links the sibling checkouts the way a
cargo `[patch]` section does. `deno task check:local` and `deno task test` use it; the
committed `deno.json` keeps the registry specifiers a consumer needs. It assumes `tgts` and
`ft-flags` are checked out beside this repo.

## Installation

```bash
deno add jsr:@hiisi/cfg-ts
```

## Related Packages

- [`@hiisi/otso`](https://jsr.io/@hiisi/otso) - The build framework that orchestrates cfg-ts
- [`@hiisi/ft-flags`](https://jsr.io/@hiisi/ft-flags) - Feature flag registry backing the `feature()` predicates
- [`@hiisi/tgts`](https://jsr.io/@hiisi/tgts) - Target patterns (runtime, platform, arch) backing the `target()` predicates
- [`@hiisi/onlywhen`](https://jsr.io/@hiisi/onlywhen) - Runtime detection and conditional execution

## Support

Whether you use this project, have learned something from it, or just like it,
please consider supporting it by buying me a coffee, so I can dedicate more time
on open-source projects like this :)

<a href="https://buymeacoffee.com/orgrinrt" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>

## License

> You can check out the full license [here](https://github.com/hiisi-digital/cfg-ts/blob/main/LICENSE)

This project is licensed under the terms of the **Mozilla Public License 2.0**.

`SPDX-License-Identifier: MPL-2.0`
