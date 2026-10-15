import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, it } from 'node:test';
import { WorkingDirectoryError } from '../src/errors.js';
import { detectShell, getConfigDir, getLibVersion, runShell } from '../src/utils.js';

describe('getLibVersion', () => {
    it('reads and parses the package version', () => {
        const read = () => JSON.stringify({ version: '9.9.9' });
        assert.equal(getLibVersion(read), '9.9.9');
    });
});

describe('getConfigDir', () => {
    it('uses XDG_CONFIG_HOME on linux', () => {
        assert.equal(getConfigDir({ XDG_CONFIG_HOME: '/xdg' }, 'linux', '/home/u'), '/xdg/ptx');
    });

    it('falls back to ~/.config on linux and macOS', () => {
        assert.equal(getConfigDir({}, 'linux', '/home/u'), '/home/u/.config/ptx');
        assert.equal(getConfigDir({}, 'darwin', '/Users/u'), '/Users/u/.config/ptx');
    });

    it('uses APPDATA on windows', () => {
        assert.equal(getConfigDir({ APPDATA: '/appdata' }, 'win32', '/users/u'), '/appdata/ptx');
    });

    it('falls back to AppData/Roaming on windows', () => {
        assert.equal(getConfigDir({}, 'win32', '/users/u'), '/users/u/AppData/Roaming/ptx');
    });
});

describe('detectShell', () => {
    it('returns bash on linux and macOS', () => {
        assert.equal(detectShell('linux', {}), 'bash');
        assert.equal(detectShell('darwin', {}), 'bash');
    });

    it('returns cmd on windows', () => {
        assert.equal(detectShell('win32', {}), 'cmd');
    });

    it('returns powershell on windows when PSModulePath is set', () => {
        assert.equal(detectShell('win32', { PSModulePath: '/modules' }), 'powershell');
    });
});

function recordingSpawn() {
    const records = [];

    function spawn(file, args, options) {
        const child = new EventEmitter();
        child.exitCode = null;
        child.signalCode = null;
        child.kill = (signal) => {
            child.signalCode = signal;
            child.emit('exit', null, signal);
        };
        records.push({ file, args, options });
        setImmediate(() => {
            child.exitCode = 0;
            child.emit('exit', 0, null);
        });
        return child;
    }

    return { records, spawn };
}

describe('runShell', () => {
    it('spawns bash -c with inherited stdio', async () => {
        const { records, spawn } = recordingSpawn();

        const code = await runShell('echo hi', {
            cwd: '/tmp',
            spawn,
            stat: () => ({ isDirectory: () => true }),
            shell: 'bash',
        });

        assert.equal(code, 0);
        assert.equal(records[0].file, 'bash');
        assert.deepEqual(records[0].args, ['-c', 'echo hi']);
        assert.equal(records[0].options.stdio, 'inherit');
        assert.equal(records[0].options.cwd, '/tmp');
    });

    it('spawns cmd.exe with /d /s /c', async () => {
        const { records, spawn } = recordingSpawn();

        await runShell('dir', { spawn, shell: 'cmd' });

        assert.equal(records[0].file, 'cmd.exe');
        assert.deepEqual(records[0].args, ['/d', '/s', '/c', 'dir']);
        assert.equal(records[0].options.windowsVerbatimArguments, true);
    });

    it('spawns powershell.exe with -NoProfile -Command', async () => {
        const { records, spawn } = recordingSpawn();

        await runShell('Get-Location', { spawn, shell: 'powershell' });

        assert.equal(records[0].file, 'powershell.exe');
        assert.deepEqual(records[0].args, ['-NoProfile', '-Command', 'Get-Location']);
    });

    it('rejects when the child emits an error', async () => {
        const spawn = () => {
            const child = new EventEmitter();
            child.exitCode = null;
            child.signalCode = null;
            child.kill = () => {};
            setImmediate(() => child.emit('error', new Error('spawn failed')));
            return child;
        };

        await assert.rejects(() => runShell('x', { spawn, shell: 'bash' }), /spawn failed/);
    });

    it('rejects when cwd does not exist', async () => {
        const spawn = () => {
            throw new Error('should not spawn');
        };
        const stat = () => {
            const error = new Error('ENOENT');
            error.code = 'ENOENT';
            throw error;
        };

        await assert.rejects(
            () => runShell('x', { cwd: '/nope', spawn, stat, shell: 'bash' }),
            WorkingDirectoryError,
        );
    });

    it('rejects when cwd is not a directory', async () => {
        const spawn = () => {
            throw new Error('should not spawn');
        };

        await assert.rejects(
            () => runShell('x', { cwd: '/nope', spawn, stat: () => ({ isDirectory: () => false }), shell: 'bash' }),
            WorkingDirectoryError,
        );
    });
});
