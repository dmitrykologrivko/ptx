import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createExecutor } from '../src/executor.js';

const HELP = 'HELP';

function buildExecutor() {
    const calls = [];
    const resolveTask = (name) => {
        if (name === 'help') {
            return { name: 'help', run: () => HELP };
        }
        if (name === 'list') {
            return { name: 'list', run: (args) => `list:${args.join(',')}` };
        }
        return undefined;
    };
    const runProject = async (project, command, args) => {
        calls.push({ project, command, args });
        return 42;
    };

    return { calls, executor: createExecutor({ resolveTask, runProject }) };
}

describe('executor.run', () => {
    it('routes a service command', async () => {
        const { executor } = buildExecutor();

        assert.deepEqual(await executor.run(['list', 'alpha']), { output: 'list:alpha', exitCode: 0 });
    });

    it('routes a project command', async () => {
        const { calls, executor } = buildExecutor();

        const result = await executor.run(['alpha', 'run', 'x', 'y']);

        assert.deepEqual(result, { output: undefined, exitCode: 42 });
        assert.deepEqual(calls[0], { project: 'alpha', command: 'run', args: ['x', 'y'] });
    });

    it('shows help when there are no arguments', async () => {
        const { executor } = buildExecutor();

        assert.deepEqual(await executor.run([]), { output: HELP, exitCode: 0 });
    });
});

describe('executor.executeTask', () => {
    it('forwards project arguments to the runner', async () => {
        const { calls, executor } = buildExecutor();

        await executor.executeTask('beta', ['build', '--release']);

        assert.deepEqual(calls[0], { project: 'beta', command: 'build', args: ['--release'] });
    });
});
