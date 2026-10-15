export class PtxError extends Error {
    constructor(message, exitCode = 1, options = {}) {
        super(message, options);
        this.name = new.target.name;
        this.exitCode = exitCode;
    }
}

export class UsageError extends PtxError {
    constructor(message, options = {}) {
        super(message, 2, options);
    }
}

export class ProjectNotFoundError extends UsageError {
    constructor(project) {
        super(`Unknown project "${project}".`);
        this.project = project;
    }
}

export class TaskNotFoundError extends UsageError {
    constructor(project, command) {
        super(`Project "${project}" has no task "${command ?? ''}".`);
        this.project = project;
        this.command = command;
    }
}

export class WorkingDirectoryError extends UsageError {
    constructor(cwd, cause) {
        super(`Working directory "${cwd}" does not exist or is not a directory.`, { cause });
        this.cwd = cwd;
    }
}

export class ConfigError extends UsageError {
    constructor(message, options = {}) {
        super(message, options);
    }
}

export class ConfigParseError extends ConfigError {
    constructor(configPath, cause) {
        super(`Cannot parse config file "${configPath}": ${cause.message}`, { cause });
        this.configPath = configPath;
    }
}

export class ConfigValidationError extends ConfigError {
    constructor(configPath, errors) {
        super(`Invalid config file "${configPath}":\n  - ${errors.join('\n  - ')}`);
        this.configPath = configPath;
        this.errors = errors;
    }
}
