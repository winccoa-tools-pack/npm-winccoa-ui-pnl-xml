import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pnlToXml, xmlToPnl } from '../../src/api';
import { PnlXmlConverter } from '../../src/converter';
import { ConversionDirection } from '../../src/types';

describe('API convenience functions', () => {
    describe('pnlToXml()', () => {
        it('should perform a PNL to XML conversion', async () => {
            // We test through the module-level converter instance
            // by stubbing PnlXmlConverter.prototype.convert
            const originalConvert = PnlXmlConverter.prototype.convert;
            const calls: any[] = [];

            PnlXmlConverter.prototype.convert = mock.fn(async function (this: any, options, direction) {
                calls.push({ options, direction });
                return {
                    success: true,
                    exitCode: 0,
                    stdout: 'ok',
                    stderr: '',
                    inputPath: options.inputPath,
                    direction,
                };
            }) as any;

            try {
                const result = await pnlToXml({
                    version: '3.20',
                    inputPath: 'panels/test.pnl',
                });

                assert.equal(result.success, true);
                assert.equal(result.direction, ConversionDirection.PNL_TO_XML);
                assert.equal(calls.length, 1);
                assert.equal(calls[0].direction, ConversionDirection.PNL_TO_XML);
            } finally {
                PnlXmlConverter.prototype.convert = originalConvert;
            }
        });
    });

    describe('xmlToPnl()', () => {
        it('should perform an XML to PNL conversion', async () => {
            const originalConvert = PnlXmlConverter.prototype.convert;
            const calls: any[] = [];

            PnlXmlConverter.prototype.convert = mock.fn(async function (this: any, options, direction) {
                calls.push({ options, direction });
                return {
                    success: true,
                    exitCode: 0,
                    stdout: 'ok',
                    stderr: '',
                    inputPath: options.inputPath,
                    direction,
                };
            }) as any;

            try {
                const result = await xmlToPnl({
                    version: '3.20',
                    inputPath: 'panels/test.xml',
                });

                assert.equal(result.success, true);
                assert.equal(result.direction, ConversionDirection.XML_TO_PNL);
                assert.equal(calls.length, 1);
                assert.equal(calls[0].direction, ConversionDirection.XML_TO_PNL);
            } finally {
                PnlXmlConverter.prototype.convert = originalConvert;
            }
        });
    });
});
