# `cfg-ts`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/cfg-ts)](https://jsr.io/@hiisi/cfg-ts)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/cfg-ts.svg)](https://github.com/hiisi-digital/cfg-ts/issues)
![License](https://img.shields.io/github/license/hiisi-digital/cfg-ts?color=%23009689)

> The `@cfg` decorator for Rust-like conditional compilation in TypeScript, with a compiler transformer and language service plugin.

</div>

## Status

Early skeleton. The module layout, exported types, and function signatures are in place, but the
implementations are stubs that throw `Not implemented` when called, and the test suite is skipped.
The sections below describe the intended surface; do not depend on this package yet.

## What it does

`cfg-ts` defines the `@cfg` decorator syntax for conditional compilation in TypeScript. Inspired by
Rust's `#[cfg(...)]` attribute, it annotates functions, classes, methods, or variables with
compile-time conditions.

This package defines:

- **TypeScript Language Service Plugin** for IDE support (no errors on `@cfg` applied to non-class
  elements, predicate completions, hover info)
- **TypeScript Compiler Transformer** for stripping or stubbing `@cfg`-decorated code at build time
  (pre-type-check transformation via ts-patch)
- **Predicate system** with `feature`, `target`, `runtime`, `platform`, and `arch` predicates, the
  `all`/`any`/`not` combinators, and a `CustomPredicate` type for user-defined conditions

It builds on [`@hiisi/ft-flags`](https://jsr.io/@hiisi/ft-flags) for feature flag state and
[`@hiisi/tgts`](https://jsr.io/@hiisi/tgts) for target patterns.

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
