import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PnlXmlConverter } from '../../src/converter';
import { ConversionDirection } from '../../src/types';

describe('PnlXmlConverter', () => {
    let converter: PnlXmlConverter;

    beforeEach(() => {
        converter = new PnlXmlConverter();
    });

    describe('convert()', () => {
        it('should call UIComponent.start with correct args for PNL_TO_XML', async () => {
            // Stub the internal UIComponent
            const ui = (converter as any).ui;
            const capturedArgs: { args: string[]; options: any }[] = [];

            ui.setVersion = mock.fn((_v: string) => {});
            ui.start = mock.fn(async (args: string[], options: any) => {
                capturedArgs.push({ args, options });
                return 0;
            });
            ui.stdOut = 'conversion output';
            ui.stdErr = '';

            const result = await converter.convert(
                { version: '3.20', inputPath: 'panels/test.pnl' },
                ConversionDirection.PNL_TO_XML,
            );

            // Verify version was set
            assert.equal(ui.setVersion.mock.callCount(), 1);
            assert.deepEqual(ui.setVersion.mock.calls[0].arguments, ['3.20']);

            // Verify start was called with correct arguments
            assert.equal(ui.start.mock.callCount(), 1);
            const startArgs = capturedArgs[0].args;
            assert.ok(startArgs.includes('-xmlConvert=XML'), 'should include -xmlConvert=XML');
            assert.ok(startArgs.includes('-p'), 'should include -p flag');
            assert.ok(startArgs.includes('panels/test.pnl'), 'should include input path');
            assert.ok(startArgs.includes('-n'), 'should include -n flag');

            // Verify result
            assert.equal(result.success, true);
            assert.equal(result.exitCode, 0);
            assert.equal(result.direction, ConversionDirection.PNL_TO_XML);
            assert.equal(result.inputPath, 'panels/test.pnl');
        });

        it('should call UIComponent.start with correct args for XML_TO_PNL', async () => {
            const ui = (converter as any).ui;
            const capturedArgs: { args: string[]; options: any }[] = [];

            ui.setVersion = mock.fn((_v: string) => {});
            ui.start = mock.fn(async (args: string[], options: any) => {
                capturedArgs.push({ args, options });
                return 0;
            });
            ui.stdOut = '';
            ui.stdErr = '';

            const result = await converter.convert(
                { version: '3.19', inputPath: 'panels/test.xml' },
                ConversionDirection.XML_TO_PNL,
            );

            const startArgs = capturedArgs[0].args;
            assert.ok(startArgs.includes('-xmlConvert=PNL'), 'should include -xmlConvert=PNL');
            assert.ok(startArgs.includes('-p'), 'should include -p flag');
            assert.ok(startArgs.includes('panels/test.xml'), 'should include input path');
            assert.ok(startArgs.includes('-n'), 'should include -n flag');
            assert.equal(result.direction, ConversionDirection.XML_TO_PNL);
        });

        it('should include -o flag when overwrite is true', async () => {
            const ui = (converter as any).ui;
            const capturedArgs: { args: string[]; options: any }[] = [];

            ui.setVersion = mock.fn((_v: string) => {});
            ui.start = mock.fn(async (args: string[], options: any) => {
                capturedArgs.push({ args, options });
                return 0;
            });
            ui.stdOut = '';
            ui.stdErr = '';

            await converter.convert(
                { version: '3.20', inputPath: 'panels/test.pnl', overwrite: true },
                ConversionDirection.PNL_TO_XML,
            );

            const startArgs = capturedArgs[0].args;
            assert.ok(startArgs.includes('-o'), 'should include -o flag when overwrite is true');
        });

        it('should NOT include -o flag when overwrite is false', async () => {
            const ui = (converter as any).ui;
            const capturedArgs: { args: string[]; options: any }[] = [];

            ui.setVersion = mock.fn((_v: string) => {});
            ui.start = mock.fn(async (args: string[], options: any) => {
                capturedArgs.push({ args, options });
                return 0;
            });
            ui.stdOut = '';
            ui.stdErr = '';

            await converter.convert(
                { version: '3.20', inputPath: 'panels/test.pnl', overwrite: false },
                ConversionDirection.PNL_TO_XML,
            );

            const startArgs = capturedArgs[0].args;
            assert.ok(!startArgs.includes('-o'), 'should NOT include -o flag when overwrite is false');
        });

        it('should use custom timeout when specified', async () => {
            const ui = (converter as any).ui;
            const capturedArgs: { args: string[]; options: any }[] = [];

            ui.setVersion = mock.fn((_v: string) => {});
            ui.start = mock.fn(async (args: string[], options: any) => {
                capturedArgs.push({ args, options });
                return 0;
            });
            ui.stdOut = '';
            ui.stdErr = '';

            await converter.convert(
                { version: '3.20', inputPath: 'panels/test.pnl', timeout: 30000 },
                ConversionDirection.PNL_TO_XML,
            );

            assert.equal(capturedArgs[0].options.timeout, 30000);
        });

        it('should use default 60s timeout when not specified', async () => {
            const ui = (converter as any).ui;
            const capturedArgs: { args: string[]; options: any }[] = [];

            ui.setVersion = mock.fn((_v: string) => {});
            ui.start = mock.fn(async (args: string[], options: any) => {
                capturedArgs.push({ args, options });
                return 0;
            });
            ui.stdOut = '';
            ui.stdErr = '';

            await converter.convert(
                { version: '3.20', inputPath: 'panels/test.pnl' },
                ConversionDirection.PNL_TO_XML,
            );

            assert.equal(capturedArgs[0].options.timeout, 60000);
        });

        it('should report failure when exit code is non-zero', async () => {
            const ui = (converter as any).ui;

            ui.setVersion = mock.fn((_v: string) => {});
            ui.start = mock.fn(async () => 1);
            ui.stdOut = '';
            ui.stdErr = 'error occurred';

            const result = await converter.convert(
                { version: '3.20', inputPath: 'panels/test.pnl' },
                ConversionDirection.PNL_TO_XML,
            );

            assert.equal(result.success, false);
            assert.equal(result.exitCode, 1);
            assert.equal(result.stderr, 'error occurred');
        });

        it('should handle directory paths for batch conversion', async () => {
            const ui = (converter as any).ui;
            const capturedArgs: { args: string[]; options: any }[] = [];

            ui.setVersion = mock.fn((_v: string) => {});
            ui.start = mock.fn(async (args: string[], options: any) => {
                capturedArgs.push({ args, options });
                return 0;
            });
            ui.stdOut = '';
            ui.stdErr = '';

            await converter.convert(
                { version: '3.20', inputPath: 'panels/', overwrite: true },
                ConversionDirection.PNL_TO_XML,
            );

            const startArgs = capturedArgs[0].args;
            assert.ok(startArgs.includes('panels/'), 'should accept directory path');
            assert.ok(startArgs.includes('-o'), 'should include -o for batch');
        });
    });
});
