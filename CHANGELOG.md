## [3.6.1](https://github.com/Mearman/mcp-wayback-machine/compare/v3.6.0...v3.6.1) (2026-05-31)

### Bug Fixes

* add --experimental-strip-types to release prepare script ([b1d35c9](https://github.com/Mearman/mcp-wayback-machine/commit/b1d35c9892afb5ee3c55c7f5bf1db18371138e47))
* add --experimental-strip-types to untested-files subprocess ([be44561](https://github.com/Mearman/mcp-wayback-machine/commit/be44561d0a7f2d34a80f6c2d44ffad123c3a68b2))
* add NODE_OPTIONS=--experimental-strip-types to pre-commit hook ([1723863](https://github.com/Mearman/mcp-wayback-machine/commit/17238638f9b27a4e4aae05985c083d2c96e0ae75))

### Chores

* pin Node 22.16.0 in .tool-versions for Cloudflare build compat ([44491c4](https://github.com/Mearman/mcp-wayback-machine/commit/44491c46ae73f90b298b9809366167607b22623d))
* pin Node 22.16.0, add --experimental-strip-types to test scripts ([ed6f774](https://github.com/Mearman/mcp-wayback-machine/commit/ed6f7741f74c8beda2d465cf9f1e8b67eca097ce))

## [3.6.0](https://github.com/Mearman/mcp-wayback-machine/compare/v3.5.2...v3.6.0) (2026-05-31)

### Features

* **auth:** add pluggable AuthProvider with static bearer token implementation ([f895a74](https://github.com/Mearman/mcp-wayback-machine/commit/f895a74b49aec3d76f81d7c1bb8ac2f52403e2e5))
* **cache:** add Cache API backend, replace KV for Worker caching ([7c5ac24](https://github.com/Mearman/mcp-wayback-machine/commit/7c5ac246771629e180615757ebe2d2f38463e3da))
* **cache:** store disk cache under the user's cache directory instead of tmpdir ([a81a807](https://github.com/Mearman/mcp-wayback-machine/commit/a81a807f05cb774b4b4d1ab45296ca2564366977))
* **rate-limit:** add Cache API rate limiter, remove Durable Object dependency ([f375c42](https://github.com/Mearman/mcp-wayback-machine/commit/f375c424cfc6a2f8aabee2f78d5a4c02f94308ce))
* **rate-limit:** extract RateLimitBackend interface, add Durable Object backend ([e75af71](https://github.com/Mearman/mcp-wayback-machine/commit/e75af716a450e06f291f6b76e7ac11daea3f420e))
* **snapshots:** cap returned snapshot bytes and label content blocks for downstream parsers ([0351ca9](https://github.com/Mearman/mcp-wayback-machine/commit/0351ca9077af4e1f74a5827232716a2aea21e959))
* **validation:** require http(s) URLs and 14-digit timestamps in tool input schemas ([c8487b2](https://github.com/Mearman/mcp-wayback-machine/commit/c8487b26f3496bf331a979392b02732e54d9049d))
* **worker:** accept per-request IA credentials via headers ([da8266b](https://github.com/Mearman/mcp-wayback-machine/commit/da8266bd260a9900f230675e0f62d803825ea346))
* **worker:** add Cloudflare Worker entry point with KV cache backend ([19f8e06](https://github.com/Mearman/mcp-wayback-machine/commit/19f8e06cc7aa7d7ffe664f1d0a10c23c289d8967))

### Bug Fixes

* **rate-limit:** atomic acquire() so concurrent callers stay under the configured limit ([fd52af4](https://github.com/Mearman/mcp-wayback-machine/commit/fd52af4b257024095f9c4afa37375049c2960e93))

### Refactoring

* **cache:** extract CacheBackend interface from CachingFetcher ([f3d684a](https://github.com/Mearman/mcp-wayback-machine/commit/f3d684a7be5e707a5743e270039152d5d93373b3))
* **contexts:** match the SPN2 save endpoint via URL parsing instead of substring ([fc219aa](https://github.com/Mearman/mcp-wayback-machine/commit/fc219aaed8f2e35cada7ecac070e1b59265d0f12))
* **lint:** replace eslint-plugin-prettier with standalone Prettier ([c12bda0](https://github.com/Mearman/mcp-wayback-machine/commit/c12bda04eb71510f10b5f4f17e8200253220b2a4))

### Documentation

* expand README with architecture, conventions, and gotchas ([ce9d16c](https://github.com/Mearman/mcp-wayback-machine/commit/ce9d16cd90f95a48358e5116bf4b281761aab2c8))

### Chores

* **deps:** update pnpm-lock.yaml for Worker dependencies ([3d83e29](https://github.com/Mearman/mcp-wayback-machine/commit/3d83e2920cabfd4deba51172fd9b9def6fd60e8b))
* remove superseded KV/DO backends, fix build config ([b97327a](https://github.com/Mearman/mcp-wayback-machine/commit/b97327a972bce4b2960fe9c862e26818415a6b28))

## [3.5.2](https://github.com/Mearman/mcp-wayback-machine/compare/v3.5.1...v3.5.2) (2026-05-11)

### Build

* **deps:** bump the dev-dependencies group with 2 updates ([9776d3b](https://github.com/Mearman/mcp-wayback-machine/commit/9776d3ba6dc90363d534c6d82281f75e3d27fc72))

## [3.5.1](https://github.com/Mearman/mcp-wayback-machine/compare/v3.5.0...v3.5.1) (2026-05-10)

### Bug Fixes

* align release workflow with pi-perms pattern ([a49b31a](https://github.com/Mearman/mcp-wayback-machine/commit/a49b31a8669048fd86823eeb4083274dccac15f6))
* make E2E tests tolerant of Wayback Machine rate limits ([fdcc4d3](https://github.com/Mearman/mcp-wayback-machine/commit/fdcc4d3b04db061c5bcda1f0160cd3f37f3685c7))
* retry HTTP 498 rate limits and improve E2E test resilience ([a888d30](https://github.com/Mearman/mcp-wayback-machine/commit/a888d30a1b2634138cfb1d7e516d3d7208207107))

### CI

* add coverage and untested-files check to CI ([1302a30](https://github.com/Mearman/mcp-wayback-machine/commit/1302a30ae2713c800cf8ffb8894a0c38945150cc))

## [3.5.0](https://github.com/Mearman/mcp-wayback-machine/compare/v3.4.0...v3.5.0) (2026-05-10)

### Features

* add untested-files check and production wiring tests ([e53495a](https://github.com/Mearman/mcp-wayback-machine/commit/e53495af8a7579a71ea9d4d7277a27ffdf86268d))

### Bug Fixes

* exclude wiring files from coverage thresholds ([10ab442](https://github.com/Mearman/mcp-wayback-machine/commit/10ab4427dda1c515832b3966e3186f68291b99de))

## [3.4.0](https://github.com/Mearman/mcp-wayback-machine/compare/v3.3.2...v3.4.0) (2026-05-10)

### Features

* add integration and E2E test suites, extract server factory for DI ([69030a5](https://github.com/Mearman/mcp-wayback-machine/commit/69030a5047a87e814a6c6abff2ed8fed1690b3df))

## [3.3.2](https://github.com/Mearman/mcp-wayback-machine/compare/v3.3.1...v3.3.2) (2026-05-09)

### Documentation

* add Claude Code plugin marketplace install commands ([0b83b3a](https://github.com/Mearman/mcp-wayback-machine/commit/0b83b3a06b5ae2a7fda3b19ec77369f495d9f997))

## [3.3.1](https://github.com/Mearman/mcp-wayback-machine/compare/v3.3.0...v3.3.1) (2026-05-09)

### Documentation

* add related section linking internet-archive-skills ([b480e6f](https://github.com/Mearman/mcp-wayback-machine/commit/b480e6f05b19a2eecf18ec41d444940050bbb3fa))

## [3.3.0](https://github.com/Mearman/mcp-wayback-machine/compare/v3.2.0...v3.3.0) (2026-05-09)

### Features

* **ci:** run dependabot auto-merge on schedule and manually ([7a1c162](https://github.com/Mearman/mcp-wayback-machine/commit/7a1c162c3e2eece0f9a296e9022751e2343df257))

### Bug Fixes

* **ci:** add checkout step to dependabot auto-merge ([1c8494d](https://github.com/Mearman/mcp-wayback-machine/commit/1c8494db6df25c21ee4bf21f4a3f92c02bed916d))
* **ci:** use single quotes in dependabot auto-merge condition ([f72f3ee](https://github.com/Mearman/mcp-wayback-machine/commit/f72f3ee8eb90ea64cf927f55e0b9a9c397e202ba))
* **ci:** wait for CI before auto-merging dependabot PRs ([61d2393](https://github.com/Mearman/mcp-wayback-machine/commit/61d2393b20ad42b29e00c84184354e056a218b80))

### CI

* add pnpm audit step and fix fast-uri vulnerability ([4080d25](https://github.com/Mearman/mcp-wayback-machine/commit/4080d253382c167dea464f38945d6e445a3aecc4))
* **deps:** bump pnpm/action-setup from 6 to 6.0.5 ([5281e0d](https://github.com/Mearman/mcp-wayback-machine/commit/5281e0da4def6ba7f00ec878a48e96f721317dca))

## [3.2.0](https://github.com/Mearman/mcp-wayback-machine/compare/v3.1.2...v3.2.0) (2026-05-09)

### Features

* add subpath exports for programmatic usage ([e146a6f](https://github.com/Mearman/mcp-wayback-machine/commit/e146a6fc78756354cdfd68abc556fe5e9722bb4d))

## [3.1.2](https://github.com/Mearman/mcp-wayback-machine/compare/v3.1.1...v3.1.2) (2026-05-09)

### Bug Fixes

* clarify credentials are for SPN2 rate limits specifically ([f204c18](https://github.com/Mearman/mcp-wayback-machine/commit/f204c18265eba5d5b31188cfb2f0279c317023a8))

### Documentation

* add quick examples section for agent prompts ([3e70d65](https://github.com/Mearman/mcp-wayback-machine/commit/3e70d659b0891f46ed9c0cd8361e0fe373dfe463))
* collapse tool parameter tables into expandable details blocks ([9bf65f2](https://github.com/Mearman/mcp-wayback-machine/commit/9bf65f267d4a7fc17bd770b27ec738e13afa5f3d))
* expand README with CLI shorthand installs and harness config table ([0514067](https://github.com/Mearman/mcp-wayback-machine/commit/05140677da0d9070bec16101423112ecd8c27b8b))
* restructure credentials, CLI usage, and resources sections ([00e7297](https://github.com/Mearman/mcp-wayback-machine/commit/00e72978b9042e61c5e57d85fd832b1a0b0a9687))

## [3.1.1](https://github.com/Mearman/mcp-wayback-machine/compare/v3.1.0...v3.1.1) (2026-05-09)

### Documentation

* fix license badge URL for shields.io ([2b7f593](https://github.com/Mearman/mcp-wayback-machine/commit/2b7f593a1f46c3a9b1e70e8ea15b72b8d621ce06))

## [3.1.0](https://github.com/Mearman/mcp-wayback-machine/compare/v3.0.2...v3.1.0) (2026-05-09)

### Features

* add Claude Code plugin marketplace distribution ([7d892c9](https://github.com/Mearman/mcp-wayback-machine/commit/7d892c9742084ea3fd3416c5ee20aabd334b3b67))
* add Claude Code plugin marketplace distribution ([fc35f78](https://github.com/Mearman/mcp-wayback-machine/commit/fc35f781f0e57df001dd91844c7b62caba2f464e))

### Bug Fixes

* remove invalid automerge from dependabot config ([b698469](https://github.com/Mearman/mcp-wayback-machine/commit/b6984692e6aede3323c9036470018a4b2ebb83a4))

### Chores

* configure dependabot auto-merge, cooldown, and commit conventions ([ae73e00](https://github.com/Mearman/mcp-wayback-machine/commit/ae73e006f1e5151984ca97815771c7582544399a))
* **deps:** bump zod, eslint, typescript-eslint, add @semantic-release/exec ([61f7484](https://github.com/Mearman/mcp-wayback-machine/commit/61f7484dd9b24a0b8a13b8e40b5aaf561caef260))

## [3.0.2](https://github.com/Mearman/mcp-wayback-machine/compare/v3.0.1...v3.0.2) (2026-05-09)

### Bug Fixes

* correct dependabot group applies-to to dependency-type ([7c4926e](https://github.com/Mearman/mcp-wayback-machine/commit/7c4926efbcefa73626bd5f7fcc154f5edcc16fd2))

## [3.0.1](https://github.com/Mearman/mcp-wayback-machine/compare/v3.0.0...v3.0.1) (2026-05-09)

### Chores

* enable dependabot auto-merge for passing PRs ([1453f3e](https://github.com/Mearman/mcp-wayback-machine/commit/1453f3e93a4bd759c950c5b19fc805b32ce9562c))

## [3.0.0](https://github.com/Mearman/mcp-wayback-machine/compare/v2.2.0...v3.0.0) (2026-05-09)

### ⚠ BREAKING CHANGES

* v3.0.0 major release - complete toolchain migration
from Yarn/Biome to pnpm/ESLint, native Node type stripping, DI-based
tool architecture, per-endpoint cache TTLs, SPN2 advanced options,
CDX advanced features, and MCP Registry integration.

### Bug Fixes

* correct mcpName to match GitHub repo name ([7ad4e45](https://github.com/Mearman/mcp-wayback-machine/commit/7ad4e453653e3ae41176c6fc77b7a200f4c75385))

## [2.2.0](https://github.com/Mearman/mcp-wayback-machine/compare/v2.1.1...v2.2.0) (2026-05-09)

### Features

* add cache management, screenshot listing, and snapshot comparison tools ([cd8c122](https://github.com/Mearman/mcp-wayback-machine/commit/cd8c122ca8ba618386b75638dc56dc0f9cbd45a5))
* add server.json generation script for MCP Registry ([a578da7](https://github.com/Mearman/mcp-wayback-machine/commit/a578da74e72a75caa2cbf45ed2e0ea1403e24e16))
* migrate toolchain and rewrite for strict TypeScript ([008434e](https://github.com/Mearman/mcp-wayback-machine/commit/008434ebac4216d3e30de7083c22100bbcf9fb5a))

### Refactoring

* extract shared response schemas ([9bf978d](https://github.com/Mearman/mcp-wayback-machine/commit/9bf978dc99455aa957db8027a96504b35b2af3be))

### Documentation

* update readme for v2 feature set ([e315381](https://github.com/Mearman/mcp-wayback-machine/commit/e315381f72b0af043e32695459202ad8437148c5))

### Tests

* cover SPN2 options and CDX advanced features ([09e50a0](https://github.com/Mearman/mcp-wayback-machine/commit/09e50a0bbea5a41246adaab2be8f393b74e19fe8))

### Chores

* remove tsconfig.tests.json ([e683d44](https://github.com/Mearman/mcp-wayback-machine/commit/e683d4454ada39dd53274a74cc38c2ea547bc839))

## [2.1.1](https://github.com/Mearman/mcp-wayback-machine/compare/v2.1.0...v2.1.1) (2026-05-09)

### Bug Fixes

* disable provenance for GitHub Packages publish ([112607c](https://github.com/Mearman/mcp-wayback-machine/commit/112607c3902db407b03cdb556a3afc3ff7f58df3))

## [2.1.0](https://github.com/Mearman/mcp-wayback-machine/compare/v2.0.0...v2.1.0) (2026-05-09)

### Features

* add in-memory and disk request caching for read operations ([d901348](https://github.com/Mearman/mcp-wayback-machine/commit/d90134856936bd2e39c71692ad978a13098d3b49))

### Bug Fixes

* pass NPM_TOKEN to semantic-release for npm auth verification ([043c694](https://github.com/Mearman/mcp-wayback-machine/commit/043c694312e34b3a563a419245e1b9e945a92259))
* propagate semantic-release exit code in CI release step ([d34008d](https://github.com/Mearman/mcp-wayback-machine/commit/d34008dbeb663383908828c66dbd8008f2972bf7))
* split eslint config into per-context tsconfig resolution ([54a33db](https://github.com/Mearman/mcp-wayback-machine/commit/54a33dbb84b87ab1c223f31822a9cb495188f220))

### Refactoring

* rewrite source for strict typescript and eslint compliance ([58a8415](https://github.com/Mearman/mcp-wayback-machine/commit/58a8415595eff5827143d59075fcdd2b9582d27b)), closes [#3](https://github.com/Mearman/mcp-wayback-machine/issues/3) [#18](https://github.com/Mearman/mcp-wayback-machine/issues/18)

### Documentation

* update README for pnpm, caching, and Node 22+ ([68c2156](https://github.com/Mearman/mcp-wayback-machine/commit/68c2156b31b33a0ed20323956b140d1087f48130))

### Tests

* add node:test suite with 80% coverage threshold ([97443ba](https://github.com/Mearman/mcp-wayback-machine/commit/97443bace96a552bf271858004313f8478be3215))

### CI

* add GitHub Packages publishing alongside npmjs ([ab58f25](https://github.com/Mearman/mcp-wayback-machine/commit/ab58f25a1a1a4e7d02213a4d4f09ba30052cfa5c))
* rewrite workflow for pnpm, matrix builds, and OIDC publishing ([0dcf8e5](https://github.com/Mearman/mcp-wayback-machine/commit/0dcf8e57cfc2b5c08f8ebe890cfb59e775e516d7))

### Chores

* migrate toolchain from yarn/biome to pnpm/eslint/turbo ([26dac1c](https://github.com/Mearman/mcp-wayback-machine/commit/26dac1c557e8704f68bb9e03713a8d7a7cfadc73))
* remove stale workflows, template artifacts, and vitest tests ([928d87b](https://github.com/Mearman/mcp-wayback-machine/commit/928d87b97046e3c01ce0a3ec9d35c8ef43b844df))

# [2.0.0](https://github.com/Mearman/mcp-wayback-machine/compare/v1.0.4...v2.0.0) (2025-06-05)


### Bug Fixes

* replace GitHub license badge with CC BY-NC-SA 4.0 badge ([feda5a0](https://github.com/Mearman/mcp-wayback-machine/commit/feda5a0d5ee7807475118af8b2c123c4668c29f2))


### Features

* add CLI support for direct command-line usage ([94a1bf8](https://github.com/Mearman/mcp-wayback-machine/commit/94a1bf8e3dd8386b29e67bd5295f68b2f63e7d98))


### BREAKING CHANGES

* The tool now checks for CLI arguments and will run in CLI mode if any are provided

## [1.0.4](https://github.com/Mearman/mcp-wayback-machine/compare/v1.0.3...v1.0.4) (2025-06-04)


### Bug Fixes

* use lowercase package name and correct registry for GitHub Packages ([0a3b4ba](https://github.com/Mearman/mcp-wayback-machine/commit/0a3b4ba9958f1680245eb5b5b30f84ff82475631))

## [1.0.3](https://github.com/Mearman/mcp-wayback-machine/compare/v1.0.2...v1.0.3) (2025-06-04)


### Bug Fixes

* skip prepublishOnly script for GitHub Packages publish ([25c3c3f](https://github.com/Mearman/mcp-wayback-machine/commit/25c3c3fc104f7c0c55cf4a8e9bf3d5952aa91884))

## [1.0.2](https://github.com/Mearman/mcp-wayback-machine/compare/v1.0.1...v1.0.2) (2025-06-04)


### Bug Fixes

* add version detection for GitHub Packages publishing ([4298868](https://github.com/Mearman/mcp-wayback-machine/commit/429886820cb90238249fdf8563c203fff55f5382))

## [1.0.1](https://github.com/Mearman/mcp-wayback-machine/compare/v1.0.0...v1.0.1) (2025-06-04)


### Bug Fixes

* restore bin field as object for proper CLI naming ([ab966b2](https://github.com/Mearman/mcp-wayback-machine/commit/ab966b28b01ecd1938a3cf3640922ab7e0d24a16))

# 1.0.0 (2025-06-04)


### Bug Fixes

* add packageManager field for Yarn 4 compatibility ([dc1de05](https://github.com/Mearman/mcp-wayback-machine/commit/dc1de05a1a856fd666d9c7711626c664fe249c19))
* convert bin field to object format for npm compatibility ([9f5ee8a](https://github.com/Mearman/mcp-wayback-machine/commit/9f5ee8ad7b1b1ae4c0cabc6ed5109aaea9b50073))
* resolve test failures and version compatibility issues ([6b682aa](https://github.com/Mearman/mcp-wayback-machine/commit/6b682aa4569693209f7673112c13bc860021acac))
* resolve timeout test race condition ([8a6dea1](https://github.com/Mearman/mcp-wayback-machine/commit/8a6dea17ced800eb6bf9826be3473aa767406db6))
* resolve TypeScript errors in test files ([2877988](https://github.com/Mearman/mcp-wayback-machine/commit/2877988733d6010f1a5e98a1e51760f8c71b63ee))
* use space indentation for markdown files ([58b359b](https://github.com/Mearman/mcp-wayback-machine/commit/58b359b7dc2b561aba1cc45ef95405d87825756d))


### Features

* add bin field to enable npx invocation ([1c48881](https://github.com/Mearman/mcp-wayback-machine/commit/1c48881effe427cf3b9bacd9ce32f78912d1a267))
* apply CC BY-NC-SA 4.0 license with full license file and README badge ([e8c9980](https://github.com/Mearman/mcp-wayback-machine/commit/e8c998056d3e9cbca272204d83c905478a7c9fc6))
* implement initial MCP server with tool definitions ([377b6e0](https://github.com/Mearman/mcp-wayback-machine/commit/377b6e02773f8ad59115f0097a69201ea8028e84))
* implement Wayback Machine API integration ([14d70c1](https://github.com/Mearman/mcp-wayback-machine/commit/14d70c1161e0a8cf78dd6011d670007419011c34))
* initial project setup with plan for Wayback Machine MCP server ([f265ed8](https://github.com/Mearman/mcp-wayback-machine/commit/f265ed824184f009f1d39a6716632337ae1e58c3))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
