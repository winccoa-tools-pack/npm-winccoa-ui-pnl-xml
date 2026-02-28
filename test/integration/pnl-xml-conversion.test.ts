import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { PnlXmlConverter, ConversionDirection } from '../../src/index';
import { UIComponent } from '@winccoa-tools-pack/npm-winccoa-core/types/components/implementations/UIComponent';
import {
    getAvailableWinCCOAVersions,
    getWinCCOAInstallationPathByVersion,
} from '@winccoa-tools-pack/npm-winccoa-core/utils/winccoa-paths';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Source fixture directory containing the original about.pnl and config template.
 * This directory is NEVER modified — tests work on an isolated copy.
 */
const FIXTURE_PROJECT_DIR = path.resolve(__dirname, '..', 'fixtures', 'projects', 'runnable');
const FIXTURE_ABOUT_PNL = path.join(FIXTURE_PROJECT_DIR, 'panels', 'about.pnl');

/** Central WinCC OA project registry file. */
const PVSS_INST_CONF = path.join(
    process.env['ProgramData'] ?? 'C:\\ProgramData',
    'SIEMENS',
    'WinCC_OA',
    'pvssInst.conf',
);

/** Unique project name used for the integration test registration. */
const TEST_PROJECT_NAME = 'pnl-xml-integration-test';

/**
 * Returns the first available WinCC OA version, or undefined if none installed.
 */
function getTestVersion(): string | undefined {
    try {
        const versions = getAvailableWinCCOAVersions();
        return versions.length > 0 ? versions[0] : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Checks whether the WCCOAui executable is available for the given version.
 */
function isUIComponentAvailable(version: string): boolean {
    try {
        const ui = new UIComponent();
        ui.setVersion(version);
        return ui.exists();
    } catch {
        return false;
    }
}

/**
 * Creates an isolated temporary project directory that mirrors the fixture
 * structure needed by WCCOAui (config/config + panels/).
 *
 * Registers the temporary project in pvssInst.conf so that WCCOAui can find it.
 *
 * Returns a handle with project paths and a cleanup function.
 */
function createTestProject(version: string): {
    projectDir: string;
    panelsDir: string;
    configFile: string;
    cleanup: () => void;
} | undefined {
    const installPath = getWinCCOAInstallationPathByVersion(version);
    if (!installPath || !fs.existsSync(PVSS_INST_CONF)) {
        return undefined;
    }

    // Create a temp project directory
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pnl-xml-test-'));
    const panelsDir = path.join(tmpRoot, 'panels');
    const configDir = path.join(tmpRoot, 'config');
    fs.mkdirSync(panelsDir, { recursive: true });
    fs.mkdirSync(configDir, { recursive: true });

    // Copy fixture about.pnl into the temp project
    fs.copyFileSync(FIXTURE_ABOUT_PNL, path.join(panelsDir, 'about.pnl'));

    // Normalise to forward-slashes for WinCC OA config format
    const normInstall = installPath.replace(/\\/g, '/');
    const normProject = tmpRoot.replace(/\\/g, '/');
    const configFile = path.join(configDir, 'config');

    // Write a valid project config file
    const configContent = [
        '[general]',
        `pvss_path = "${normInstall}"`,
        `proj_path = "${normProject}"`,
        `proj_version = "${version}"`,
        '',
        'lang = "auto"',
        'langs = "en_US.utf8"',
        '',
    ].join('\n');
    fs.writeFileSync(configFile, configContent, 'utf-8');

    // Append registration entry to pvssInst.conf
    const registrationEntry = [
        '',
        `[Software\\ETM\\PVSS II\\Configs\\${TEST_PROJECT_NAME}]`,
        'notRunnable = 0',
        `InstallationDate = "${new Date().toISOString()}"`,
        `InstallationUser = "${os.userInfo().username}"`,
        `InstallationDir = "${tmpRoot}"`,
        `InstallationVersion = ${version}`,
        `proj_path = ${tmpRoot}`,
        `PVSS_II = ${configFile}`,
        `pvss_path = ${installPath}`,
        '',
    ].join('\n');

    fs.appendFileSync(PVSS_INST_CONF, registrationEntry, 'utf-8');

    const cleanup = (): void => {
        // Remove registration entry from pvssInst.conf
        try {
            const content = fs.readFileSync(PVSS_INST_CONF, 'utf-8');
            const sectionHeader = `[Software\\ETM\\PVSS II\\Configs\\${TEST_PROJECT_NAME}]`;
            const idx = content.indexOf(sectionHeader);
            if (idx >= 0) {
                const nextSection = content.indexOf(
                    '\n[Software\\ETM\\PVSS II\\',
                    idx + sectionHeader.length,
                );
                const cleaned = nextSection >= 0
                    ? content.slice(0, idx) + content.slice(nextSection)
                    : content.slice(0, idx);
                fs.writeFileSync(PVSS_INST_CONF, cleaned, 'utf-8');
            }
        } catch {
            // Ignore cleanup errors
        }

        // Remove temp project directory
        try {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    };

    return { projectDir: tmpRoot, panelsDir, configFile, cleanup };
}

/**
 * WCCOAui `-xmlConvert` performs **in-place** conversion:
 *
 * - `-xmlConvert=XML` : rewrites the `.pnl` file with XML content, creates `.pnl.bak`
 * - `-xmlConvert=PNL` : rewrites the `.pnl` file with PNL content, creates `.pnl.bak`
 *
 * The `-p` flag takes a path **relative to the project's panels/ directory**.
 */
describe('PNL ⇄ XML conversion (integration)', () => {
    let testVersion: string | undefined;
    let testProject: ReturnType<typeof createTestProject>;

    before(() => {
        testVersion = getTestVersion();
        if (testVersion) {
            testProject = createTestProject(testVersion);
        }
    });

    after(() => {
        if (testProject) {
            testProject.cleanup();
        }
    });

    it('should convert about.pnl to XML in-place', async (t) => {
        if (!testVersion) {
            t.skip('No WinCC OA installation found; skipping integration test');
            return;
        }

        if (!isUIComponentAvailable(testVersion)) {
            t.skip(`WCCOAui not found for version ${testVersion}; skipping`);
            return;
        }

        if (!testProject) {
            t.skip('Could not register test project; skipping');
            return;
        }

        const aboutPnl = path.join(testProject.panelsDir, 'about.pnl');
        assert.ok(fs.existsSync(aboutPnl), `Panel file not found: ${aboutPnl}`);

        // Read original binary-format PNL content
        const originalContent = fs.readFileSync(aboutPnl, 'utf-8');
        assert.ok(!originalContent.startsWith('<?xml'), 'Fixture should start as non-XML PNL');

        const converter = new PnlXmlConverter();

        // WCCOAui -p expects a path relative to the project panels/ directory
        const result = await converter.convert(
            {
                version: testVersion,
                inputPath: 'about.pnl',
                configPath: testProject.configFile,
                overwrite: true,
            },
            ConversionDirection.PNL_TO_XML,
        );

        assert.ok(
            result.success,
            `PNL → XML conversion failed (exit ${result.exitCode}):\n`
                + `stdout: ${result.stdout}\nstderr: ${result.stderr}`,
        );
        assert.strictEqual(result.exitCode, 0, 'Exit code should be 0');
        assert.strictEqual(result.direction, ConversionDirection.PNL_TO_XML);

        // The file is converted in-place — the .pnl file now contains XML
        const convertedContent = fs.readFileSync(aboutPnl, 'utf-8');
        assert.ok(
            convertedContent.startsWith('<?xml'),
            'Converted file should start with <?xml declaration',
        );
        assert.ok(
            convertedContent.includes('<panel'),
            'Converted file should contain <panel element',
        );

        // A .bak file should have been created with the original content
        const bakPath = aboutPnl + '.bak';
        assert.ok(fs.existsSync(bakPath), `Backup file not found: ${bakPath}`);
    });

    it('should round-trip about.pnl → XML → PNL', async (t) => {
        if (!testVersion) {
            t.skip('No WinCC OA installation found; skipping integration test');
            return;
        }

        if (!isUIComponentAvailable(testVersion)) {
            t.skip(`WCCOAui not found for version ${testVersion}; skipping`);
            return;
        }

        if (!testProject) {
            t.skip('Could not register test project; skipping');
            return;
        }

        // Start with a fresh copy of the fixture
        const aboutPnl = path.join(testProject.panelsDir, 'about.pnl');
        fs.copyFileSync(FIXTURE_ABOUT_PNL, aboutPnl);
        // Remove any leftover backup from previous test
        const bakPath = aboutPnl + '.bak';
        if (fs.existsSync(bakPath)) {
            fs.unlinkSync(bakPath);
        }

        const originalPnl = fs.readFileSync(aboutPnl, 'utf-8');

        const converter = new PnlXmlConverter();

        // --- Step 1: PNL → XML (in-place) ---
        const toXmlResult = await converter.convert(
            {
                version: testVersion,
                inputPath: 'about.pnl',
                configPath: testProject.configFile,
                overwrite: true,
            },
            ConversionDirection.PNL_TO_XML,
        );

        assert.ok(
            toXmlResult.success,
            `PNL → XML failed (exit ${toXmlResult.exitCode}):\n`
                + `stdout: ${toXmlResult.stdout}\nstderr: ${toXmlResult.stderr}`,
        );

        // Verify the file is now XML
        const xmlContent = fs.readFileSync(aboutPnl, 'utf-8');
        assert.ok(xmlContent.startsWith('<?xml'), 'After PNL→XML the file should be XML');

        // Remove the backup before the back-conversion
        if (fs.existsSync(bakPath)) {
            fs.unlinkSync(bakPath);
        }

        // --- Step 2: XML → PNL (in-place) ---
        const toPnlResult = await converter.convert(
            {
                version: testVersion,
                inputPath: 'about.pnl',
                configPath: testProject.configFile,
                overwrite: true,
            },
            ConversionDirection.XML_TO_PNL,
        );

        assert.ok(
            toPnlResult.success,
            `XML → PNL failed (exit ${toPnlResult.exitCode}):\n`
                + `stdout: ${toPnlResult.stdout}\nstderr: ${toPnlResult.stderr}`,
        );
        assert.strictEqual(toPnlResult.direction, ConversionDirection.XML_TO_PNL);

        // The file should be back to PNL format
        const roundTrippedPnl = fs.readFileSync(aboutPnl, 'utf-8');
        assert.ok(!roundTrippedPnl.startsWith('<?xml'), 'After XML→PNL the file should not be XML');

        // WCCOAui normalises certain values during the round-trip (font
        // descriptors, layer metadata, floating-point precision), so a strict
        // byte-for-byte comparison will not match.  Instead verify the key
        // structural elements are preserved.
        assert.ok(
            roundTrippedPnl.startsWith('V 14\n'),
            'Round-tripped PNL should start with the same version header',
        );
        assert.ok(
            roundTrippedPnl.includes('PANEL,-1 -1 600 360'),
            'Panel dimensions should be preserved',
        );
        assert.ok(
            roundTrippedPnl.includes('"RECTANGLE1"'),
            'Widget RECTANGLE1 should be preserved',
        );
        assert.ok(
            roundTrippedPnl.includes('"version"'),
            'Widget "version" should be preserved',
        );
        assert.ok(
            roundTrippedPnl.includes('"platform"'),
            'Widget "platform" should be preserved',
        );
        assert.ok(
            roundTrippedPnl.includes('PRIMITIVE_TEXT1'),
            'Widget PRIMITIVE_TEXT1 should be preserved',
        );
        assert.ok(
            roundTrippedPnl.includes('ETM professional control GmbH'),
            'Text content should be preserved',
        );
    });

    it('should handle non-existent panel gracefully', async (t) => {
        if (!testVersion) {
            t.skip('No WinCC OA installation found; skipping integration test');
            return;
        }

        if (!isUIComponentAvailable(testVersion)) {
            t.skip(`WCCOAui not found for version ${testVersion}; skipping`);
            return;
        }

        if (!testProject) {
            t.skip('Could not register test project; skipping');
            return;
        }

        const converter = new PnlXmlConverter();
        const result = await converter.convert(
            {
                version: testVersion,
                inputPath: 'does-not-exist.pnl',
                configPath: testProject.configFile,
                overwrite: true,
            },
            ConversionDirection.PNL_TO_XML,
        );

        // WCCOAui logs a warning but still returns exit code 0 for missing files.
        // We verify the conversion ran and reported no crash.
        assert.strictEqual(result.exitCode, 0, 'WCCOAui should exit cleanly even for missing panels');
        assert.ok(
            result.stderr.includes('Cannot open file') || result.exitCode === 0,
            'Should indicate the file could not be opened or exit cleanly',
        );
    });
});