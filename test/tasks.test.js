import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CommandNotFoundError, ProjectNotFoundError } from '../src/errors.js';
import { configTask, helpTask, listTask, resolveTask, runProjectCommand, versionTask } from '../src/tasks.js';

describe('resolveTask', () => {
    it('resolves a task by name', () => {
        assert.equal(resolveTask('list').name, 'list');
        assert.equal(resolveTask('list').run, listTask);
    });

    it('resolves a task by alias', () => {
        assert.equal(resolveTask('--help').name, 'help');
        assert.equal(resolveTask('-h').name, 'help');
        assert.equal(resolveTask('--version').name, 'version');
        assert.equal(resolveTask('-v').name, 'version');
    });

    it('returns undefined for unknown or empty tokens', () => {
        assert.equal(resolveTask('nope'), undefined);
        assert.equal(resolveTask(''), undefined);
        assert.equal(resolveTask(undefined), undefined);
    });

    it('returns undefined for inherited properties', () => {
        assert.equal(resolveTask('toString'), undefined);
    });
});

describe('helpTask', () => {
    it('includes usage and the project list', () => {
        const output = helpTask([], { projects: { alpha: {}, beta: {} } });

        assert.match(output, /ptx <project> <command>/);
        assert.match(output, /^ {2}alpha$/m);
        assert.match(output, /^ {2}beta$/m);
    });

    it('handles an empty project list', () => {
        assert.match(helpTask([], { projects: {} }), /\(none\)/);
    });
});

describe('versionTask', () => {
    it('returns the injected version', () => {
        assert.equal(versionTask([], '1.2.3'), '1.2.3');
    });
});

describe('listTask', () => {
    it('lists all projects', () => {
        assert.equal(listTask([], { projects: { alpha: {}, beta: {} } }), 'alpha\nbeta');
    });

    it('reports when no projects are configured', () => {
        assert.equal(listTask([], { projects: {} }), 'No projects configured.');
    });

    it('lists the commands of a project', () => {
        const config = { projects: { alpha: { cwd: '/alpha', commands: { run: 'x', test: 'y' } } } };
        assert.equal(listTask(['alpha'], config), 'run\ntest');
    });

    it('reports a project without commands', () => {
        assert.equal(listTask(['alpha'], { projects: { alpha: { cwd: '/alpha' } } }), 'Project "alpha" has no commands.');
    });

    it('throws for an unknown project', () => {
        assert.throws(() => listTask(['missing'], { projects: {} }), ProjectNotFoundError);
    });
});

describe('configTask', () => {
    it('returns the config path', () => {
        assert.equal(configTask([], '/tmp/ptx/config.json'), '/tmp/ptx/config.json');
    });

    it('creates the config when --init is passed', () => {
        let created;
        const output = configTask(['--init'], '/tmp/ptx/config.json', (configPath) => {
            created = configPath;
            return configPath;
        });

        assert.equal(created, '/tmp/ptx/config.json');
        assert.match(output, /\/tmp\/ptx\/config\.json/);
    });
});

describe('runProjectCommand', () => {
    const config = {
        projects: {
            alpha: {
                cwd: '/alpha',
                commands: {
                    run: 'echo %%',
                    serve: 'srv %%{{0.0.0.0}}',
                },
            },
        },
    };

    it('substitutes the arguments and executes the command in the project cwd', async () => {
        let called;
        const execute = async (command, options) => {
            called = { command, options };
            return 7;
        };

        const exitCode = await runProjectCommand('alpha', 'run', ['hello'], config, undefined, execute);

        assert.equal(exitCode, 7);
        assert.deepEqual(called, { command: 'echo hello', options: { cwd: '/alpha' } });
    });

    it('applies defaults via substitution', async () => {
        let command;
        const exitCode = await runProjectCommand('alpha', 'serve', [], config, undefined, async (value) => {
            command = value;
            return 0;
        });

        assert.equal(exitCode, 0);
        assert.equal(command, 'srv 0.0.0.0');
    });

    it('throws for an unknown project', async () => {
        await assert.rejects(
            () => runProjectCommand('missing', 'run', [], config, undefined, async () => 0),
            ProjectNotFoundError,
        );
    });

    it('throws for an unknown command', async () => {
        await assert.rejects(
            () => runProjectCommand('alpha', 'nope', [], config, undefined, async () => 0),
            CommandNotFoundError,
        );
    });
});
