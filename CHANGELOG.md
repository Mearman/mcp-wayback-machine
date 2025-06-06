# 1.0.0 (2025-06-06)


* feat!: introduce template synchronization system with breaking changes ([22b9036](https://github.com/Mearman/mcp-wayback-machine/commit/22b9036b1f65b1d0d832c4796b3188c283d57273))


### Bug Fixes

* add missing dependencies for template fetch utilities ([dbf82c6](https://github.com/Mearman/mcp-wayback-machine/commit/dbf82c6b67a5a3b4ee759f8c6237b9d12e3d84ce))
* add missing validation utility functions for wayback machine tools ([dfc3546](https://github.com/Mearman/mcp-wayback-machine/commit/dfc354619e3817af23ef774f7ed3cccaced403a1))
* add yarn.lock and use immutable installs for reproducible builds ([c873248](https://github.com/Mearman/mcp-wayback-machine/commit/c8732481dc6b8519c0b0b6813099d4fbb3ffc274))
* correct timestamp validation in retrieve tool and format validation utilities ([83ed630](https://github.com/Mearman/mcp-wayback-machine/commit/83ed63046e13d9463e9ccdd27a1f4aa5719fa7bb))
* disable immutable installs to allow lockfile creation in CI ([d22435b](https://github.com/Mearman/mcp-wayback-machine/commit/d22435bb6960237aad7290cade33f0c31d639524))
* remove frozen-lockfile from CI workflows for template repository ([f5b55bb](https://github.com/Mearman/mcp-wayback-machine/commit/f5b55bb14e26b3077be88fff1f0649c5a306d2d8))
* resolve linting errors and update version to 2.0.0 ([a51edfc](https://github.com/Mearman/mcp-wayback-machine/commit/a51edfc55fe8f36077fd5de0b63b87bdf9a6ebe3))
* resolve wayback machine test failures and validation issues ([05f371d](https://github.com/Mearman/mcp-wayback-machine/commit/05f371d6066dda7eb94b5298640983e56ed97f6f))


### Features

* add CLI support for dual MCP/CLI mode ([40010ef](https://github.com/Mearman/mcp-wayback-machine/commit/40010ef3ef41fb9bfd6b6c8ad9d706211b741c5d))
* add configurable fetch utility with caching ([0c4fc33](https://github.com/Mearman/mcp-wayback-machine/commit/0c4fc332ac33d7b4b3448323c3c254a1dae5cfdf))
* add example tool implementation ([64332dd](https://github.com/Mearman/mcp-wayback-machine/commit/64332dd63ee4c6a7bff1c956ed1c5d7d9b65f093))
* add fetch example tool demonstrating caching ([d6c973f](https://github.com/Mearman/mcp-wayback-machine/commit/d6c973f29100b63ac4c4e96ea79543b00b6af3b3))
* add HTTP client and rate limiting utilities ([33c421c](https://github.com/Mearman/mcp-wayback-machine/commit/33c421ce8adff974f30c554d3522ff6e561a4a4a))
* add MCP server entry point with tool registration ([f1c418a](https://github.com/Mearman/mcp-wayback-machine/commit/f1c418ace9cae5c1d109f43c573c98d867406fdb))
* add shared dependency management configuration ([d23449b](https://github.com/Mearman/mcp-wayback-machine/commit/d23449bc9807459b8507be9c6c555f7d5473da9c))
* add shared fetch utility for template synchronization ([f89a1f9](https://github.com/Mearman/mcp-wayback-machine/commit/f89a1f969b30d337a4fa77db017a96d487956be3))
* add shared MCP server base patterns ([ab4cde7](https://github.com/Mearman/mcp-wayback-machine/commit/ab4cde719f1c2f7d914cf7757103a86ff28ccac7))
* add template marker and version tracking ([0505eb6](https://github.com/Mearman/mcp-wayback-machine/commit/0505eb654b2ef77f67f54610593620ec7593c674))
* add template synchronization configuration ([483f144](https://github.com/Mearman/mcp-wayback-machine/commit/483f144ee9719ade3fb961738cd37ee495cb39ee))
* add validation utilities for common patterns ([e920306](https://github.com/Mearman/mcp-wayback-machine/commit/e920306c8dc92ddd3aab44a7136fe7530955d6f2))
* add Wayback Machine MCP server and CLI implementation ([9b972c0](https://github.com/Mearman/mcp-wayback-machine/commit/9b972c0d8b9d8d7efee2c8b0d87d1ad8aa652c73))
* add Wayback Machine tools (save, retrieve, search, status) ([fd1d1d9](https://github.com/Mearman/mcp-wayback-machine/commit/fd1d1d9a65d9577871f992280ca290d1259b9930))


### BREAKING CHANGES

* This release introduces a new CI-driven template synchronization system that fundamentally changes how template updates are distributed. Repositories created from this template will now receive automatic updates through GitHub Actions workflows. This includes new required files (.template-marker, .template-version), a shared utilities architecture, and new configuration requirements. See BREAKING_CHANGES.md for migration details.

# 1.0.0 (2025-06-05)


### Bug Fixes

* add packageManager field for Yarn 4 compatibility ([dc1de05](https://github.com/Mearman/mcp-wayback-machine/commit/dc1de05a1a856fd666d9c7711626c664fe249c19))
* add version detection for GitHub Packages publishing ([9eecb8b](https://github.com/Mearman/mcp-wayback-machine/commit/9eecb8b8b5b599ae48a1a0d5b78ce0c95dc94455))
* convert bin field to object format for npm compatibility ([9f5ee8a](https://github.com/Mearman/mcp-wayback-machine/commit/9f5ee8ad7b1b1ae4c0cabc6ed5109aaea9b50073))
* replace GitHub license badge with CC BY-NC-SA 4.0 badge ([87a8c91](https://github.com/Mearman/mcp-wayback-machine/commit/87a8c91af3f03befbf0f34fc131c003d4697f9eb))
* resolve all linting issues ([f2fa7c2](https://github.com/Mearman/mcp-wayback-machine/commit/f2fa7c29555ff708fb82771f4cf1f3cba7c0b3ed))
* resolve test failures and version compatibility issues ([660663d](https://github.com/Mearman/mcp-wayback-machine/commit/660663dc74b3feb7760fb68898719779fc0fb023))
* resolve timeout test race condition ([8a6dea1](https://github.com/Mearman/mcp-wayback-machine/commit/8a6dea17ced800eb6bf9826be3473aa767406db6))
* resolve TypeScript errors in test files ([8e0b7fc](https://github.com/Mearman/mcp-wayback-machine/commit/8e0b7fcb0d552ab58bec81dad2d82e2bff52ae15))
* restore bin field as object for proper CLI naming ([14a3c69](https://github.com/Mearman/mcp-wayback-machine/commit/14a3c69c18a3d1cf5b38e32bbf28bd153155ab4e))
* skip prepublishOnly script for GitHub Packages publish ([9e4513b](https://github.com/Mearman/mcp-wayback-machine/commit/9e4513bae41973dbc50ab0fc966e07a45bb7c432))
* use lowercase package name and correct registry for GitHub Packages ([8a8d353](https://github.com/Mearman/mcp-wayback-machine/commit/8a8d3538ade9d4d8ad1292ac8567bb8d36acaf89))
* use space indentation for markdown files ([58b359b](https://github.com/Mearman/mcp-wayback-machine/commit/58b359b7dc2b561aba1cc45ef95405d87825756d))


### Features

* add bin field to enable npx invocation ([1c48881](https://github.com/Mearman/mcp-wayback-machine/commit/1c48881effe427cf3b9bacd9ce32f78912d1a267))
* add CLI support for direct command-line usage ([cf7ab50](https://github.com/Mearman/mcp-wayback-machine/commit/cf7ab50f8d99b132d8f7a8a740e23bf00e1516bd))
* apply CC BY-NC-SA 4.0 license with full license file and README badge ([e8c9980](https://github.com/Mearman/mcp-wayback-machine/commit/e8c998056d3e9cbca272204d83c905478a7c9fc6))
* implement initial MCP server with tool definitions ([377b6e0](https://github.com/Mearman/mcp-wayback-machine/commit/377b6e02773f8ad59115f0097a69201ea8028e84))
* implement Wayback Machine API integration ([14d70c1](https://github.com/Mearman/mcp-wayback-machine/commit/14d70c1161e0a8cf78dd6011d670007419011c34))
* initial project setup with plan for Wayback Machine MCP server ([f265ed8](https://github.com/Mearman/mcp-wayback-machine/commit/f265ed824184f009f1d39a6716632337ae1e58c3))


### BREAKING CHANGES

* The tool now checks for CLI arguments and will run in CLI mode if any are provided

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
