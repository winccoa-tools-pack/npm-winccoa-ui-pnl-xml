# Usage

This package wraps the WinCC OA UI manager (`WCCOAui`) to convert UI panels between `.pnl` and `.xml`.

## Important behavior

- Conversion is performed by `WCCOAui` via the `-xmlConvert` flag.
- Conversion is **in-place**: the input file is rewritten to the target format.
- WinCC OA may create a `.bak` file next to the input.
- The `-p` input is typically resolved relative to the project’s `panels/` directory.
  - For most projects, pass a bare filename like `about.pnl` / `about.xml`, or a sub-path.
  - Use `--config` / `configPath` to point `WCCOAui` at a specific project context.

## CLI

Show built-in help:

```shell
winccoa-pnl-xml --help
```

Convert PNL → XML:

```shell
winccoa-pnl-xml convert pnl-to-xml about.pnl --version 3.20
```

Convert XML → PNL:

```shell
winccoa-pnl-xml convert xml-to-pnl about.xml --version 3.20
```

Common options:

- `--config <path>`: project `config/config` file
- `--overwrite`: pass `-o` to `WCCOAui`
- `--timeout <ms>`: increase process timeout (default: `60000`)

## API

Convenience functions:

```ts
import { pnlToXml, xmlToPnl } from "@winccoa-tools-pack/npm-winccoa-ui-pnl-xml";

const result = await pnlToXml({
  version: "3.20",
  inputPath: "about.pnl",
});

if (!result.success) {
  throw new Error(result.stderr || `Conversion failed with exit code ${result.exitCode}`);
}
```

Converter class:

```ts
import {
  PnlXmlConverter,
  ConversionDirection,
} from "@winccoa-tools-pack/npm-winccoa-ui-pnl-xml";

const converter = new PnlXmlConverter();
const result = await converter.convert(
  {
    version: "3.20",
    inputPath: "about.pnl",
    // configPath: "C:/path/to/project/config/config",
    // overwrite: true,
    // timeout: 120_000,
  },
  ConversionDirection.PNL_TO_XML,
);
```

## Troubleshooting

- Exit code non-zero: check `stderr` and verify the selected `--version` matches your WinCC OA installation.
- Timeouts on large panels: increase `--timeout` / `timeout`.
- Path not found: remember `inputPath` is usually relative to `panels/` in the active project context.
