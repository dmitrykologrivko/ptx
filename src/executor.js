import { resolveTask, runProjectCommand } from './tasks.js';

export function createExecutor(deps = {}) {
    const {
        resolveTask: resolve = resolveTask,
        runProject = runProjectCommand,
    } = deps;

    async function executeTask(name, args = []) {
        const task = resolve(name);
        if (task !== undefined) {
            const output = await task.run(args);
            return { output, exitCode: 0 };
        }

        const [commandName, ...commandArgs] = args;
        const exitCode = await runProject(name, commandName, commandArgs);
        return { output: undefined, exitCode };
    }

    async function run(argv = []) {
        if (argv.length === 0) {
            return executeTask('help', []);
        }

        const [name, ...args] = argv;
        return executeTask(name, args);
    }

    return { executeTask, run };
}

export const executor = createExecutor();

export const { executeTask, run } = executor;
