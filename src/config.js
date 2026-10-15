import path from 'node:path';
import { ensureDir, fileExists, getConfigDir, readFile, writeFile } from './utils.js';
import { ConfigParseError, ConfigValidationError } from './errors.js';

export const CONFIG_FILENAME = 'config.json';
export const DEFAULT_SCHEMA_URL = 'https://raw.githubusercontent.com/dmitrykologrivko/ptx/main/schema.json';

export function getDefaultConfig() {
    return {
        $schema: DEFAULT_SCHEMA_URL,
        projects: {},
    };
}

export function validateConfig(config, configPath = CONFIG_FILENAME) {
    const errors = collectConfigErrors(config);
    if (errors.length > 0) {
        throw new ConfigValidationError(configPath, errors);
    }
    return config;
}

export function createConfig(infra = {}) {
    const {
        fileExists: exists = fileExists,
        ensureDir: mkdir = ensureDir,
        readFile: read = readFile,
        writeFile: write = writeFile,
        getConfigDir: configDir = getConfigDir,
    } = infra;

    let cachedConfig = null;

    function getConfigPath(
        env = process.env,
        platform = process.platform,
        homedir = undefined,
    ) {
        return path.join(configDir(env, platform, homedir), CONFIG_FILENAME);
    }

    function ensureConfigFile(configPath = getConfigPath()) {
        if (exists(configPath)) {
            return configPath;
        }

        mkdir(path.dirname(configPath));
        write(configPath, `${JSON.stringify(getDefaultConfig(), null, 2)}\n`);
        return configPath;
    }

    function loadConfig(configPath = getConfigPath()) {
        ensureConfigFile(configPath);

        const raw = read(configPath);

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (cause) {
            throw new ConfigParseError(configPath, cause);
        }

        return validateConfig(parsed, configPath);
    }

    function getConfig(configPath = getConfigPath()) {
        if (cachedConfig === null) {
            cachedConfig = loadConfig(configPath);
        }
        return cachedConfig;
    }

    function setConfig(newConfig) {
        cachedConfig = newConfig;
    }

    function resetConfig() {
        cachedConfig = null;
    }

    return {
        getConfigPath,
        ensureConfigFile,
        loadConfig,
        getConfig,
        setConfig,
        resetConfig,
    };
}

export const config = createConfig();

export const {
    getConfigPath,
    ensureConfigFile,
    loadConfig,
    getConfig,
    setConfig,
    resetConfig,
} = config;

function collectConfigErrors(config) {
    if (config === null || typeof config !== 'object' || Array.isArray(config)) {
        return ['root must be an object'];
    }

    const errors = [];

    if (config.$schema !== undefined && typeof config.$schema !== 'string') {
        errors.push('"$schema" must be a string');
    }

    if (config.projects === undefined) {
        errors.push('"projects" is required');
    } else if (config.projects === null || typeof config.projects !== 'object' || Array.isArray(config.projects)) {
        errors.push('"projects" must be an object');
    } else {
        for (const [name, project] of Object.entries(config.projects)) {
            errors.push(...collectProjectErrors(name, project));
        }
    }

    return errors;
}

function collectProjectErrors(name, project) {
    const prefix = `projects.${name}`;

    if (project === null || typeof project !== 'object' || Array.isArray(project)) {
        return [`"${prefix}" must be an object`];
    }

    const errors = [];

    if (project.cwd === undefined) {
        errors.push(`"${prefix}.cwd" is required`);
    } else if (typeof project.cwd !== 'string' || project.cwd.trim() === '') {
        errors.push(`"${prefix}.cwd" must be a non-empty string`);
    }

    if (project.commands !== undefined) {
        if (project.commands === null || typeof project.commands !== 'object' || Array.isArray(project.commands)) {
            errors.push(`"${prefix}.commands" must be an object`);
        } else {
            for (const [command, value] of Object.entries(project.commands)) {
                if (typeof value !== 'string') {
                    errors.push(`"${prefix}.commands.${command}" must be a string`);
                }
            }
        }
    }

    return errors;
}
