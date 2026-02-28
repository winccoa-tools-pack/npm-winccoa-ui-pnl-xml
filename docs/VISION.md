# Vision: WinCC OA UI PNL/XML Converter

This document describes the product vision for **@winccoa-tools-pack/npm-winccoa-ui-pnl-xml**.
It focuses on *what the tool is*,
*why it exists*, and *what guarantees it should provide*.

## Purpose

Enable reliable and automation-friendly conversion between WinCC OA UI panel formats:

- `.pnl` to `.xml` for analysis, editor tooling, and CI checks
- `.xml` to `.pnl` for round-trip workflows and regeneration

## Target users

- WinCC OA engineers who maintain native WinCC oA panels and want repeatable conversions
- Tool authors (VS Code extensions, scripts, CI jobs) who need a programmatic API
- CI/CD pipelines that need validation and transformation steps

## Value proposition

- **Consistency:** One conversion implementation used by CLI and API
- **Tooling-first:** A clean Node/TypeScript interface that works in scripts and pipelines
- **Ecosystem-ready:** Designed to be composed with other winccoa-tools-pack packages

## Guiding principles

- Use the **official WinCC OA conversion mechanism** (UI manager) rather than re-implementing parsing.
- Prefer **predictable behavior** and typed results over clever heuristics.
- Make failures **actionable**: return exit code plus captured stdout/stderr.

## How conversion works (non-negotiables)

Conversions are executed via the WinCC OA UI manager (`WCCOAui`) using the `-xmlConvert` flag.

- Conversion is **in-place**: the input file is rewritten to the target format.
- WinCC OA may create a `.bak` file next to the input.
- The `-p` argument (input path) is typically resolved relative to the projectâ€™s `panels/` directory.
- The tool always uses `-n` (no connect to `WCCIL event`) to keep runs automation-friendly.

These behaviors must be documented prominently because they affect how users choose input paths and
how repositories manage backups.

## Public interfaces

### CLI

- Binary name: `winccoa-pnl-xml`
- Commands:
  - `convert pnl-to-xml <path>`
  - `convert xml-to-pnl <path>`
- Required option:
  - `--version <ver>` (selects WinCC OA version / executable)
- Optional options:
  - `--config <path>` (project `config/config` file)
  - `--overwrite`
  - `--timeout <ms>`

The CLI is intended for batch usage in scripts, CI, and local tooling.

### TypeScript/JavaScript API

The API must support async/await and typed results.

- Core: `PnlXmlConverter` with `convert(options, direction)`
- Convenience wrappers:
  - `pnlToXml(options)`
  - `xmlToPnl(options)`
- Types:
  - `ConversionOptions` (requires `version` and `inputPath`)
  - `ConversionResult` (includes `success`, `exitCode`, `stdout`, `stderr`, `direction`, `inputPath`)
  - `ConversionDirection` aligned with WinCC OA `-xmlConvert` values (`XML` / `PNL`)

Error model:

- Normal conversion failures should return `ConversionResult.success = false` with an exit code.
- Unexpected launcher/process errors may throw; callers should treat those as exceptional.

## Integration goals

- **VS Code extensions:** provide a stable API/CLI that extensions can call to convert panels
- **CI/CD:** enable conversion jobs to run deterministically and fail the build when conversion fails
- **Container support:** integration tests can run in a WinCC OA container when available

## Quality bar (what â€œdoneâ€ means)

- Unit tests cover:
  - CLI argument parsing for valid/invalid invocations
  - API convenience wrappers call the correct direction
  - converter argument construction (`-xmlConvert`, `-p`, `-o`, `-config`, `-n`)
- Documentation clearly states the in-place behavior and path resolution rules.
- `npm test` passes (lint, formatting check, markdownlint, build, unit tests).

## Release readiness

Before an official release:

- Update [CHANGELOG.md](../CHANGELOG.md) with user-facing changes.
- Validate package artifacts:
  - `npm pack` includes only `dist/`
  - `exports` and `bin` work from a clean install
- Publish (automated):
  - Stable releases are published by GitHub Actions via the Release workflow (triggered after a successful CI run on `main`).
  - Publishing requires the `NPM_TOKEN` repo secret and will be skipped on forks.
  - The pipeline creates a GitHub Release and publishes to npm with dist-tag `latest`.
  - Pre-releases may be published to npm with dist-tag `next` (depending on workflow configuration).

## Scope boundaries (non-goals)

- This package does **not** attempt to implement a custom `.pnl` parser.
- This package does **not** aim to provide a GUI.
- This package does **not** guarantee semantic stability of WinCC OAâ€™s conversion output across OA versions; it exposes the selected OA version as an explicit input.
