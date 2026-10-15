import { spawn as nodeSpawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WorkingDirectoryError } from './errors.js';

export function getLibVersion(read = fs.readFileSync) {
    const PACKAGE_PATH = fileURLToPath(new URL('../package.json', import.meta.url));
    return JSON.parse(read(PACKAGE_PATH, 'utf8')).version;
}

export function detectShell(platform = process.platform, env = process.env) {
    if (platform === 'win32') {
        return env.PSModulePath ? 'powershell' : 'cmd';
    }
    return 'bash';
}

export function runShell(command, options = {}) {
    const {
        cwd,
        env = process.env,
        shell = detectShell(),
        spawn = nodeSpawn,
        stat = fs.statSync,
        signals = ['SIGINT', 'SIGTERM'],
    } = options;

    const SHELLS = {
        bash: (command) => ({ file: 'bash', args: ['-c', command], options: {} }),
        cmd: (command) => ({
            file: 'cmd.exe',
            args: ['/d', '/s', '/c', command],
            options: { windowsVerbatimArguments: true },
        }),
        powershell: (command) => ({ file: 'powershell.exe', args: ['-NoProfile', '-Command', command], options: {} }),
    };

    const SIGNAL_EXIT_CODES = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 };

    const build = SHELLS[shell] ?? SHELLS.bash;
    const spec = build(command);

    return new Promise((resolve, reject) => {
        if (cwd !== undefined) {
            try {
                assertWorkingDirectory(cwd, stat);
            } catch (error) {
                reject(error);
                return;
            }
        }

        const child = spawn(spec.file, spec.args, {
            cwd,
            env,
            stdio: 'inherit',
            ...spec.options,
        });

        const forward = (signal) => {
            if (child.exitCode === null && child.signalCode === null) {
                child.kill(signal);
            }
        };

        for (const signal of signals) {
            process.on(signal, forward);
        }

        const cleanup = () => {
            for (const signal of signals) {
                process.off(signal, forward);
            }
        };

        child.on('error', (error) => {
            cleanup();
            reject(error);
        });

        child.on('exit', (code, signal) => {
            cleanup();
            resolve(code ?? SIGNAL_EXIT_CODES[signal] ?? 1);
        });
    });
}

function assertWorkingDirectory(cwd, stat) {
    let info;
    try {
        info = stat(cwd);
    } catch (cause) {
        throw new WorkingDirectoryError(cwd, cause);
    }

    if (!info.isDirectory()) {
        throw new WorkingDirectoryError(cwd);
    }
}

export function getConfigDir(
    env = process.env,
    platform = process.platform,
    homedir = os.homedir(),
) {
    if (platform === 'win32') {
        const base = env.APPDATA && env.APPDATA.trim() !== ''
            ? env.APPDATA
            : path.join(homedir, 'AppData', 'Roaming');
        return path.join(base, 'ptx');
    }

    const base = env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME.trim() !== ''
        ? env.XDG_CONFIG_HOME
        : path.join(homedir, '.config');
    return path.join(base, 'ptx');
}

export function fileExists(filePath, exists = fs.existsSync) {
    return exists(filePath);
}

export function ensureDir(dir, mkdir = fs.mkdirSync) {
    mkdir(dir, { recursive: true });
    return dir;
}

export function readFile(filePath, read = fs.readFileSync) {
    return read(filePath, 'utf8');
}

export function writeFile(filePath, content, write = fs.writeFileSync) {
    write(filePath, content, 'utf8');
    return filePath;
}
