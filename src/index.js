import { PtxError } from './errors.js';
import { run } from './executor.js';

export default async function main(args = []) {
    try {
        const { output, exitCode } = await run(args);

        if (output !== undefined && output !== '') {
            process.stdout.write(`${output}\n`);
        }

        process.exitCode = exitCode ?? 0;
        return exitCode ?? 0;
    } catch (error) {
        if (error instanceof PtxError) {
            process.stderr.write(`${error.message}\n`);
            process.exitCode = error.exitCode;
            return error.exitCode;
        }

        throw error;
    }
}
