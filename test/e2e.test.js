import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/ptx.js', import.meta.url));
const PACKAGE = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));

let home;
let work;

function ptx(args) {
    return spawnSync(process.execPath, [BIN, ...args], {
        encoding: 'utf8',
        env: { ...process.env, XDG_CONFIG_HOME: home },
    });
}

describe('e2e', { skip: process.platform === 'win32' }, () => {
    before(() => {
        home = fs.mkdtempSync(path.join(os.tmpdir(), 'ptx-e2e-home-'));
        work = fs.mkdtempSync(path.join(os.tmpdir(), 'ptx-e2e-work-'));
        fs.mkdirSync(path.join(home, 'ptx'), { recursive: true });
        fs.writeFileSync(path.join(home, 'ptx', 'config.json'), JSON.stringify({
            projects: {
                demo: {
                    cwd: work,
                    tasks: {
                        hello: 'echo hello %%',
                        pair: 'printf "[%s][%s]" %%{{a}} %%{{b}}',
                        where: 'pwd',
                        fail: 'exit 3',
                    },
                },
                broken: {
                    cwd: path.join(work, 'missing'),
                    tasks: { run: 'echo nope' },
                },
            },
        }));
    });

    after(() => {
        fs.rmSync(home, { recursive: true, force: true });
        fs.rmSync(work, { recursive: true, force: true });
    });

    it('lists projects', () => {
        const result = ptx(['list']);
        assert.equal(result.status, 0);
        assert.equal(result.stdout, 'demo\nbroken\n');
    });

    it('lists a project tasks', () => {
        const result = ptx(['list', 'demo']);
        assert.equal(result.status, 0);
        assert.equal(result.stdout, 'hello\npair\nwhere\nfail\n');
    });

    it('prints the config path', () => {
        const result = ptx(['config']);
        assert.equal(result.status, 0);
        assert.equal(result.stdout.trim(), path.join(home, 'ptx', 'config.json'));
    });

    it('prints the version', () => {
        const result = ptx(['--version']);
        assert.equal(result.status, 0);
        assert.equal(result.stdout.trim(), PACKAGE.version);
    });

    it('runs a project command with arguments', () => {
        const result = ptx(['demo', 'hello', 'e2e']);
        assert.equal(result.status, 0);
        assert.equal(result.stdout, 'hello e2e\n');
    });

    it('applies placeholder defaults', () => {
        const result = ptx(['demo', 'pair']);
        assert.equal(result.status, 0);
        assert.equal(result.stdout, '[a][b]');
    });

    it('runs the command in the configured cwd', () => {
        const result = ptx(['demo', 'where']);
        assert.equal(result.status, 0);
        assert.equal(fs.realpathSync(result.stdout.trim()), fs.realpathSync(work));
    });

    it('propagates the child exit code', () => {
        const result = ptx(['demo', 'fail']);
        assert.equal(result.status, 3);
    });

    it('fails with code 2 for an unknown project', () => {
        const result = ptx(['missing', 'run']);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /Unknown project "missing"/);
    });

    it('fails with code 2 for an unknown command', () => {
        const result = ptx(['demo', 'nope']);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /has no task "nope"/);
    });

    it('fails with code 2 when the cwd is missing', () => {
        const result = ptx(['broken', 'run']);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /does not exist or is not a directory/);
    });

    it('shows help when called without arguments', () => {
        const result = ptx([]);
        assert.equal(result.status, 0);
        assert.match(result.stdout, /Usage:/);
        assert.match(result.stdout, /^ {2}demo$/m);
    });
});
