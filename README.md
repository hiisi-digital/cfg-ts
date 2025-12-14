# `cfg-ts`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/cfg-ts)](https://jsr.io/@hiisi/cfg-ts)
[![npm Version](https://img.shields.io/npm/v/cfg-ts?logo=npm)](https://www.npmjs.com/package/cfg-ts)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/cfg-ts.svg)](https://github.com/hiisi-digital/cfg-ts/issues)
![License](https://img.shields.io/github/license/hiisi-digital/cfg-ts?color=%23009689)

> The `@cfg` decorator system for TypeScript - enabling Rust-like conditional compilation with custom syntax support.

</div>

## What it does

`cfg-ts` provides the foundational `@cfg` decorator syntax for conditional compilation in TypeScript. Inspired by Rust's `#[cfg(...)]` attribute, it allows you to annotate any code element with compile-time conditions.

This package includes:

- **TypeScript Language Service Plugin** for IDE support (no red squiggles on custom syntax)
- **TypeScript Compiler Transformer** for processing `@cfg` decorators at build time
- **Extensible predicate system** for custom conditions (features, targets, platforms, etc.)

It serves as the base for other conditional compilation packages like `@hiisi/ft-flags` and `@hiisi/tgts`.

## Installation

```bash
# Deno
deno add jsr:@hiisi/cfg-ts

# npm / yarn / pnpm
npm install cfg-ts
```

## Related Packages

- [`@hiisi/otso`](https://jsr.io/@hiisi/otso) - The build framework that orchestrates cfg-ts
- [`@hiisi/ft-flags`](https://jsr.io/@hiisi/ft-flags) - Feature flag predicates for @cfg
- [`@hiisi/tgts`](https://jsr.io/@hiisi/tgts) - Target predicates (runtime, platform, arch) for @cfg
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
