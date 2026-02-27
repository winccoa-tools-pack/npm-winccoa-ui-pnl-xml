import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import fs from 'fs';
import { ensurePmonAcceptingCommands, withRunnableTestProject } from '../helpers/test-project-helpers';
import { ProjEnvManagerStartMode, type ProjEnvManagerOptions } from '../../src/types/project/ProjEnv';

function listComponents(list: ProjEnvManagerOptions[]): string[] {
	return list.map((m) => m.component);
}

describe('insertManagerAt (integration)', () => {
	it('should insert WCCOActrl at index 1 in runnable project', async (t) => {
		await withRunnableTestProject(async (project) => {
			try {
				const pmon = await ensurePmonAcceptingCommands(t, project);
				if (!pmon) {
					return;
				}

				const beforeList = await pmon.getManagerOptionsList(project.getId());
				const beforeComponents = listComponents(beforeList);
				if (beforeComponents.join(',') !== 'WCCILpmon,WCCOAui') {
					t.skip(
						`Unexpected initial MGRLIST:LIST order for runnable fixture (expected WCCILpmon,WCCOAui): ${beforeComponents.join(',')}`,
					);
					return;
				}

				const opts: ProjEnvManagerOptions = {
					component: 'WCCOActrl',
					startMode: ProjEnvManagerStartMode.Manual,
					secondToKill: 30,
					resetMin: 3,
					resetStartCounter: 1,
					startOptions: '',
				};

				const result = await project.insertManager(opts, 1);
				assert.ok(result !== -2, 'insertManager should not report pmon unreachable (-2)');
				assert.ok(result !== -1, 'insertManager should not fail (-1)');

				// Poll until pmon reflects the change in MGRLIST:LIST (can be slightly delayed).
				const start = Date.now();
				const timeoutMs = 7_500;
				let afterComponents: string[] = [];
				while (Date.now() - start < timeoutMs) {
					const afterList = await pmon.getManagerOptionsList(project.getId());
					afterComponents = listComponents(afterList);

					if (afterComponents.length > 1 && afterComponents[1] === 'WCCOActrl') {
						break;
					}
					await new Promise((r) => setTimeout(r, 500));
				}

				if (afterComponents.length <= 1 || afterComponents[1] !== 'WCCOActrl') {
                    assert.fail(
						`WCCOActrl was not visible at index 1 via MGRLIST:LIST (got: ${afterComponents.join(',')}) after ${timeoutMs}ms, stdErr: ${pmon.stdErr}, \n , stdErr: ${pmon.stdOut}`,
					);
					return;
				}

				assert.deepStrictEqual(
					afterComponents,
					['WCCILpmon', 'WCCOActrl', 'WCCOAui'],
					'Expected WCCOActrl to be inserted at index 1 (between pmon and ui)',
				);
			} finally {
				// Always stop pmon to avoid leaking a running instance into other tests.
				try {
					await project.stop();
					await project.stopPmon(10);
				} catch {
					// Ignore cleanup errors in tests.
				}
			}
		});
	});
});

