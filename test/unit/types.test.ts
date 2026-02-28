import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConversionDirection } from '../../src/types';

describe('ConversionDirection enum', () => {
    it('PNL_TO_XML should map to "XML"', () => {
        assert.equal(ConversionDirection.PNL_TO_XML, 'XML');
    });

    it('XML_TO_PNL should map to "PNL"', () => {
        assert.equal(ConversionDirection.XML_TO_PNL, 'PNL');
    });
});

describe('Types module exports', () => {
    it('should export ConversionDirection', async () => {
        const mod = await import('../../src/types');
        assert.ok('ConversionDirection' in mod);
    });
});
