import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../src/cli';
import { ConversionDirection } from '../../src/types';

/**
 * Helper – builds a fake process.argv array from the given CLI tokens.
 * Prepends 'node' and 'cli.js' to mimic real argv.
 */
function argv(...tokens: string[]): string[] {
    return ['node', 'cli.js', ...tokens];
}

describe('CLI parseArgs', () => {
    // ── happy-path ──────────────────────────────────────────────

    describe('valid invocations', () => {
        it('should parse pnl-to-xml with required flags', () => {
            const result = parseArgs(argv('convert', 'pnl-to-xml', 'panels/test.pnl', '-v', '3.20'));
            assert.ok(result);
            assert.equal(result.direction, ConversionDirection.PNL_TO_XML);
            assert.equal(result.inputPath, 'panels/test.pnl');
            assert.equal(result.version, '3.20');
            assert.equal(result.overwrite, false);
            assert.equal(result.timeout, undefined);
        });

        it('should parse xml-to-pnl with required flags', () => {
            const result = parseArgs(argv('convert', 'xml-to-pnl', 'panels/test.xml', '-v', '3.19'));
            assert.ok(result);
            assert.equal(result.direction, ConversionDirection.XML_TO_PNL);
            assert.equal(result.inputPath, 'panels/test.xml');
            assert.equal(result.version, '3.19');
        });

        it('should accept --version long form', () => {
            const result = parseArgs(argv('convert', 'pnl-to-xml', 'p.pnl', '--version', '3.20'));
            assert.ok(result);
            assert.equal(result.version, '3.20');
        });

        it('should accept -o flag', () => {
            const result = parseArgs(argv('convert', 'pnl-to-xml', 'p.pnl', '-v', '3.20', '-o'));
            assert.ok(result);
            assert.equal(result.overwrite, true);
        });

        it('should accept --overwrite long form', () => {
            const result = parseArgs(
                argv('convert', 'pnl-to-xml', 'p.pnl', '-v', '3.20', '--overwrite'),
            );
            assert.ok(result);
            assert.equal(result.overwrite, true);
        });

        it('should accept -t flag with timeout', () => {
            const result = parseArgs(
                argv('convert', 'pnl-to-xml', 'p.pnl', '-v', '3.20', '-t', '120000'),
            );
            assert.ok(result);
            assert.equal(result.timeout, 120000);
        });

        it('should accept --timeout long form', () => {
            const result = parseArgs(
                argv('convert', 'pnl-to-xml', 'p.pnl', '-v', '3.20', '--timeout', '30000'),
            );
            assert.ok(result);
            assert.equal(result.timeout, 30000);
        });

        it('should accept directory as input path', () => {
            const result = parseArgs(argv('convert', 'pnl-to-xml', 'panels/', '-v', '3.20'));
            assert.ok(result);
            assert.equal(result.inputPath, 'panels/');
        });

        it('should accept all flags together', () => {
            const result = parseArgs(
                argv('convert', 'xml-to-pnl', 'dir/', '-v', '3.20', '-o', '-t', '90000'),
            );
            assert.ok(result);
            assert.equal(result.direction, ConversionDirection.XML_TO_PNL);
            assert.equal(result.inputPath, 'dir/');
            assert.equal(result.version, '3.20');
            assert.equal(result.overwrite, true);
            assert.equal(result.timeout, 90000);
        });
    });

    // ── error paths ─────────────────────────────────────────────

    describe('invalid invocations', () => {
        it('should return null for empty args', () => {
            assert.equal(parseArgs(argv()), null);
        });

        it('should return null for -h', () => {
            assert.equal(parseArgs(argv('-h')), null);
        });

        it('should return null for --help', () => {
            assert.equal(parseArgs(argv('--help')), null);
        });

        it('should return null for unknown command', () => {
            assert.equal(parseArgs(argv('run', 'pnl-to-xml', 'p.pnl', '-v', '3.20')), null);
        });

        it('should return null for unknown sub-command', () => {
            assert.equal(parseArgs(argv('convert', 'bad', 'p.pnl', '-v', '3.20')), null);
        });

        it('should return null when input path is missing', () => {
            assert.equal(parseArgs(argv('convert', 'pnl-to-xml', '-v', '3.20')), null);
        });

        it('should return null when version is missing', () => {
            assert.equal(parseArgs(argv('convert', 'pnl-to-xml', 'p.pnl')), null);
        });

        it('should return null for invalid timeout', () => {
            assert.equal(
                parseArgs(argv('convert', 'pnl-to-xml', 'p.pnl', '-v', '3.20', '-t', 'abc')),
                null,
            );
        });

        it('should return null for negative timeout', () => {
            assert.equal(
                parseArgs(argv('convert', 'pnl-to-xml', 'p.pnl', '-v', '3.20', '-t', '-100')),
                null,
            );
        });

        it('should return null for unknown option', () => {
            assert.equal(
                parseArgs(argv('convert', 'pnl-to-xml', 'p.pnl', '-v', '3.20', '--foo')),
                null,
            );
        });
    });
});
