import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    CONFIG_FILENAME,
    DEFAULT_SCHEMA_URL,
    createConfig,
    getDefaultConfig,
} from '../src/config.js';
import { ConfigParseError, ConfigValidationError } from '../src/errors.js';

function createMemoryFs(initial = {}) {
    const files = new Map(Object.entries(initial));
    const dirs = new Set();
    let mkdirCalls = 0;

    return {
        files,
        dirs,
        get mkdirCalls() {
            return mkdirCalls;
        },
        fileExists(filePath) {
            return files.has(filePath) || dirs.has(filePath);
        },
        ensureDir(dir) {
            mkdirCalls += 1;
            dirs.add(dir);
        },
        readFile(filePath) {
            if (!files.has(filePath)) {
                const error = new Error(`ENOENT: ${filePath}`);
                error.code = 'ENOENT';
                throw error;
            }
            return files.get(filePath);
        },
        writeFile(filePath, content) {
            files.set(filePath, content);
        },
    };
}

function build(initialFiles = {}) {
    const fs = createMemoryFs(initialFiles);
    const config = createConfig({
        fileExists: fs.fileExists.bind(fs),
        ensureDir: fs.ensureDir.bind(fs),
        readFile: fs.readFile.bind(fs),
        writeFile: fs.writeFile.bind(fs),
        getConfigDir: () => '/fake',
    });
    return { fs, config };
}

describe('getConfigPath', () => {
    it('joins the config dir with the config filename', () => {
        const { config } = build();
        assert.equal(config.getConfigPath(), `/fake/${CONFIG_FILENAME}`);
    });
});

describe('ensureConfigFile', () => {
    it('creates the default config file when missing', () => {
        const { fs, config } = build();
        const configPath = config.getConfigPath();

        const result = config.ensureConfigFile();

        assert.equal(result, configPath);
        assert.equal(fs.mkdirCalls, 1);
        assert.deepEqual(JSON.parse(fs.files.get(configPath)), getDefaultConfig());
    });

    it('does not touch an existing file', () => {
        const { fs, config } = build({ [`/fake/${CONFIG_FILENAME}`]: '{}' });

        config.ensureConfigFile();

        assert.equal(fs.mkdirCalls, 0);
    });
});

describe('loadConfig', () => {
    it('reads and validates the config from disk', () => {
        const raw = { $schema: DEFAULT_SCHEMA_URL, projects: { a: { cwd: '/a' } } };
        const { config } = build({ [`/fake/${CONFIG_FILENAME}`]: JSON.stringify(raw) });

        assert.deepEqual(config.loadConfig(), raw);
    });

    it('throws ConfigParseError on invalid JSON', () => {
        const { config } = build({ [`/fake/${CONFIG_FILENAME}`]: '{ nope' });

        assert.throws(() => config.loadConfig(), ConfigParseError);
    });

    it('throws ConfigValidationError on an invalid shape', () => {
        const { config } = build({ [`/fake/${CONFIG_FILENAME}`]: JSON.stringify({ projects: { a: {} } }) });

        assert.throws(() => config.loadConfig(), ConfigValidationError);
    });
});

describe('getConfig', () => {
    it('caches the config across calls', () => {
        const { fs, config } = build({ [`/fake/${CONFIG_FILENAME}`]: JSON.stringify({ projects: {} }) });

        const first = config.getConfig();
        fs.files.set(`/fake/${CONFIG_FILENAME}`, JSON.stringify({ projects: { b: { cwd: '/b' } } }));
        const second = config.getConfig();

        assert.equal(first, second);
    });

    it('reloads after resetConfig', () => {
        const { fs, config } = build({ [`/fake/${CONFIG_FILENAME}`]: JSON.stringify({ projects: {} }) });

        config.getConfig();
        config.resetConfig();
        fs.files.set(`/fake/${CONFIG_FILENAME}`, JSON.stringify({ projects: { b: { cwd: '/b' } } }));

        assert.deepEqual(config.getConfig(), { projects: { b: { cwd: '/b' } } });
    });

    it('returns the config set via setConfig', () => {
        const { config } = build();
        const replacement = { projects: { c: { cwd: '/c' } } };

        config.setConfig(replacement);

        assert.equal(config.getConfig(), replacement);
    });
});
