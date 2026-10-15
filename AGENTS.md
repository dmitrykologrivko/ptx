# AGENTS.md

Guidance for agents working in this repository.

## Project

`ptx` (project task executor) is a zero-dependency Node.js CLI that runs commands of different projects from any directory:

```bash
ptx <project> <command> [args...]
```

- Package name: `project-task-executor`; bin name: `ptx`.
- ESM (`"type": "module"`), Node.js >= 18.17, **no runtime dependencies**.

## Commands

- Run all tests: `npm test` (executes `node --test`).
- Run the CLI locally: `node bin/ptx.js --help`, `node bin/ptx.js <project> <command>`.
- Use an isolated config while testing:
  `XDG_CONFIG_HOME=/tmp/ptx-home node bin/ptx.js list`.
- Do not commit or push unless explicitly asked.

## File map

- `bin/ptx.js` — executable entry point.
- `src/index.js` — app entry: runs the executor, prints output, handles errors and exit code.
- `src/executor.js` — router: service task or project command.
- `src/tasks.js` — service tasks + project command task + registry.
- `src/config.js` — config path / load / validate / create.
- `src/substitution.js` — `%%` substitution.
- `src/utils.js` — infrastructure (OS/shell, spawn, fs, version).
- `src/errors.js` — error hierarchy with exit codes.
- `schema.json` — config JSON Schema for editor autocomplete.
- `test/*.test.js` — unit + e2e tests.

## Data flow

```
argv -> index.main -> executor.run -> resolveTask (service) | runProjectCommand (project)
     -> substitute(command, args) -> runShell(command, { cwd }) -> exit code
```

## Conventions

- ESM; 4-space indent; single quotes; semicolons. **No comments in code** unless asked.
- Dependency injection:
  - Stateful modules use a factory/provider (`createConfig`, `createExecutor`) that returns an API and exports a default singleton for app use.
  - Pure/stateless helpers take dependencies as trailing params with defaults, e.g. `fn(a, b, dep = realDep())`.
  - Inject only effectful edges (fs, spawn, env, platform, clock). Import pure helpers directly.
- Infrastructure/IO lives in `utils.js`; `config.js` only orchestrates.
- Throw subclasses of `PtxError` with a correct `exitCode`.

## Exit codes

- `0` success
- `1` command execution failure / unexpected error
- `2` usage or config errors (all `UsageError` subclasses)

## Config and substitution semantics (non-obvious)

- Config path: `$XDG_CONFIG_HOME/ptx/config.json` or `~/.config/ptx/config.json`; Windows `%APPDATA%\ptx\config.json`. Created empty if missing.
- `projects.<name>.cwd` is required; `commands` is a map of name -> **string** (no per-shell variants).
- `%%` rules:
  - single `%%` at the end -> all args
  - single `%%` not at the end -> first arg only (extras dropped)
  - several `%%` -> one arg each positionally; extras dropped; `%%{{default}}` used when an arg is missing
  - no placeholder -> args ignored
  - `\%%` -> literal `%%`
  - spaces/tabs are normalized (collapsed + trimmed)
- Real templates include the subcommand literally (per §3.1), e.g. `python manage.py runserver %%{{0.0.0.0}}`.
- Shell selection: `win32` -> `cmd` (or `powershell` when `PSModulePath` is set), otherwise `bash`. `stdio: 'inherit'`; child exit code propagated; `SIGINT`/`SIGTERM` forwarded to the child.
- `cwd` is validated before spawn; missing/not-a-directory -> `WorkingDirectoryError` (exit 2).

## Testing rules

- Use `node:test` (`describe`/`it`) with `node:assert/strict`.
- Unit tests must inject dependencies (in-memory fs, fake `spawn`); avoid real OS/shell calls.
- e2e tests spawn `bin/ptx.js` with a temporary `XDG_CONFIG_HOME`; skipped on Windows.
- Compare filesystem paths with `fs.realpathSync` (macOS `/var` -> `/private/var`).

## Do not

- Add runtime dependencies (zero-dependency constraint).
- Use `shell: true`; always spawn an explicit shell (`spawn('bash', ['-c', ...])`, etc.).
- Add comments to source files unless requested.
