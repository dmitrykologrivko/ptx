import { resolveTask, runProjectTask } from './tasks.js';

export function createExecutor(deps = {}) {
    const {
        resolveTask: resolve = resolveTask,
        runProject = runProjectTask,
    } = deps;

    async function executeTask(name, args = []) {
        const task = resolve(name);
        if (task !== undefined) {
            const output = await task.run(args);
            return { output, exitCode: 0 };
        }

        const [taskName, ...taskArgs] = args;
        const exitCode = await runProject(name, taskName, taskArgs);
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
