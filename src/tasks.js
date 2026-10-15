import { ensureConfigFile, getConfig, getConfigPath } from './config.js';
import { ProjectNotFoundError, TaskNotFoundError } from './errors.js';
import { substitute } from './substitution.js';
import { getLibVersion, runShell } from './utils.js';

export function helpTask(args, config = getConfig()) {
    const lines = [
        'ptx — run project commands from anywhere',
        '',
        'Usage:',
        '  ptx <project> <command> [args...]',
        '  ptx <command>',
        '',
        'Commands:',
        '  help, --help, -h         show this help',
        '  version, --version, -v   show version',
        '  list [project]           list projects or a project tasks',
        '  config [--init]          show config path or create it',
        '',
        'Projects:',
    ];

    const projects = Object.keys(config.projects ?? {});
    if (projects.length === 0) {
        lines.push('  (none)');
    } else {
        for (const project of projects) {
            lines.push(`  ${project}`);
        }
    }

    return lines.join('\n');
}

export function versionTask(args, version = getLibVersion()) {
    return version;
}

export function listTask(args, config = getConfig()) {
    const projects = config.projects ?? {};
    const projectName = args[0];

    if (projectName === undefined) {
        const names = Object.keys(projects);
        return names.length === 0 ? 'No projects configured.' : names.join('\n');
    }

    if (!Object.prototype.hasOwnProperty.call(projects, projectName)) {
        throw new ProjectNotFoundError(projectName);
    }

    const tasks = Object.keys(projects[projectName].tasks ?? {});
    return tasks.length === 0 ? `Project "${projectName}" has no tasks.` : tasks.join('\n');
}

export function configTask(args, configPath = getConfigPath(), initConfig = ensureConfigFile) {
    if (args.includes('--init')) {
        return `Config created at ${initConfig(configPath)}`;
    }

    return configPath;
}

export async function runProjectTask(
    projectName,
    taskName,
    args,
    config = getConfig(),
    buildTaskCommand = substitute,
    execute = runShell,
) {
    const project = config.projects?.[projectName];
    if (project === undefined) {
        throw new ProjectNotFoundError(projectName);
    }

    const template = project.tasks?.[taskName];
    if (template === undefined) {
        throw new TaskNotFoundError(projectName, taskName);
    }

    const command = buildTaskCommand(template, args);

    return execute(command, { cwd: project.cwd });
}

export const TASKS = {
    help: { aliases: ['--help', '-h'], run: helpTask },
    version: { aliases: ['--version', '-v'], run: versionTask },
    list: { aliases: [], run: listTask },
    config: { aliases: [], run: configTask },
};

export function resolveTask(token) {
    if (token === undefined || token === null || token === '') {
        return undefined;
    }

    if (Object.prototype.hasOwnProperty.call(TASKS, token)) {
        return { name: token, ...TASKS[token] };
    }

    for (const [name, task] of Object.entries(TASKS)) {
        if (task.aliases.includes(token)) {
            return { name, ...task };
        }
    }

    return undefined;
}
