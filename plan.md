# Project Plan: WinCC OA UI PNL/XML Converter

## Overview

This project aims to develop a lightweight developer tool for SIMATIC WinCC Open Architecture projects,
providing reliable PNL ⇄ XML transformations for UI panels.
The tool will be part of the modular winccoa-tools-pack ecosystem.

## Goals

- Provide seamless conversion between .pnl and .xml formats for WinCC OA UI panels
- Enable integration with modern development tools and CI/CD pipelines
- Ensure high reliability and performance for engineering workflows
- Maintain consistency with the winccoa-tools-pack organization standards

## Features to Implement

1. **PNL → XML Conversion**
   - Parse .pnl files and convert to structured XML
   - Handle various panel elements and properties
   - Ensure accurate representation of UI components

2. **XML → PNL Conversion**
   - Parse XML files and regenerate .pnl files
   - Support round-trip workflows
   - Maintain compatibility with WinCC OA standards

3. **CLI Interface**
   - Command-line tool for batch processing
   - Support for input/output file specifications
   - Error handling and logging

4. **API Interface**
   - TypeScript/JavaScript API for programmatic use
   - Async/await support
   - Comprehensive error handling

5. **Integration Features**
   - Compatibility with VS Code extensions
   - Support for CI/CD automation
   - Ecosystem integration with other winccoa-tools-pack libraries

## Implementation Details

- **Core Technology**: Utilize WinCC OA UI Manager for conversions
- **Component**: UIComponent from npm-winccoa-core
- **Options**:
  - `-xmlConvert[=XML|PNL]` for conversion direction
  - `-p <panel>|<startDir>` for input specification
  - `-o` for overwrite existing panels
  - `-n` for no connection to WCCIL event
- **Dependencies**:
  - <https://github.com/winccoa-tools-pack/npm-winccoa-core>

## Development Phases

1. **Phase 1: Core Conversion Logic** (done)
   - Implement basic PNL to XML conversion
   - Implement basic XML to PNL conversion
   - Unit testing for conversion accuracy

2. **Phase 2: CLI Development** (done)
   - Build command-line interface
   - Add file I/O handling
   - Implement error reporting

3. **Phase 3: API Development** (done)
    - Define a stable, typed public API surface
       - `PnlXmlConverter` class with `convert(options, direction)`
       - Convenience functions `pnlToXml(options)` and `xmlToPnl(options)` for the common directions
       - Root exports from `src/index.ts` so consumers can `import { pnlToXml } from "..."`
    - Provide TypeScript types that mirror runtime behavior
       - `ConversionOptions` (required `version`, required `inputPath`, optional `configPath`, `overwrite`, `timeout`)
       - `ConversionResult` (success flag, exit code, captured stdout/stderr, direction, inputPath)
       - `ConversionDirection` enum values aligned with WinCC OA `-xmlConvert` flag (`XML` / `PNL`)
    - Async/await support and predictable error behavior
       - API returns `Promise<ConversionResult>`
       - Default timeout (60s) with override via `options.timeout`
       - Only throw on unexpected process/launcher errors; otherwise return a non-success `ConversionResult`
    - Document important WinCC OA specifics in API docs
       - Conversion is performed by `WCCOAui` using `-xmlConvert`
       - Conversion happens **in-place** and may create `.bak` backups
       - `inputPath` is resolved relative to the project’s `panels/` directory
    - Add unit coverage for the API layer
       - Verify convenience wrappers call the converter with the correct direction
       - Verify return value shape and typing
    - Update consumer documentation and examples
       - README API example uses the real `ConversionOptions` shape
       - README CLI example includes required `--version` and clarifies `--overwrite`

4. **Phase 4: Integration and Testing**
   - VS Code extension integration
   - CI/CD pipeline integration
   - Comprehensive testing and validation

5. **Phase 5: Documentation and Release**
   - Complete README and documentation
   - Package publishing setup
   - Release to NPM registry

## Timeline

- **Week 1-2**: Core conversion logic implementation
- **Week 3**: CLI interface development
- **Week 4**: API development and testing
- **Week 5**: Integration testing and documentation
- **Week 6**: Final testing, release preparation

## Risks and Mitigation

- **Dependency on WinCC OA**: Ensure proper version compatibility and licensing
- **Complex File Formats**: Thorough testing with various panel types
- **Performance**: Optimize for large panel files
- **Community Adoption**: Focus on documentation and ecosystem integration

## Success Criteria

- Successful conversion of complex panel files
- Integration with at least one VS Code extension
- Positive feedback from WinCC OA developers
- Adoption in CI/CD pipelines
