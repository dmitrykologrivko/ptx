# ptx

Yet another small project task executor — run project commands from anywhere via a single CLI.

```bash
ptx <project> <command> [args...]
```

## Install

```bash
npm install -g project-task-executor
```

On first run ptx creates a config at `~/.config/ptx/config.json` (macOS/Linux) or `%APPDATA%\ptx\config.json` (Windows).

## Config

Creates a default config file

```bash
ptx config --init
```

Example of a simple config

```json
{
  "$schema": "https://raw.githubusercontent.com/dmitrykologrivko/ptx/main/schema.json",
  "projects": {
    "myapp": {
      "cwd": "/path/to/myapp",
      "tasks": {
        "runserver": "python manage.py runserver %%{{0.0.0.0}} --settings=%%{{production}}",
        "migrate": "python manage.py migrate %%",
        "frontend-test": "npm test -- %%",
        "frontend-build": "npm run build -- --mode %%{{production}}"
      }
    }
  }
}
```

Placeholders:

- `%%` alone at the end — all arguments.
- `%%` alone in the middle — the first argument.
- several `%%` — one argument each, in order; `%%{{default}}` is used when an argument is missing.

## Usage

```bash
ptx myapp runserver                 # python manage.py runserver 0.0.0.0 --settings=production
ptx myapp runserver 127.0.0.1 dev   # python manage.py runserver 127.0.0.1 --settings=dev
ptx myapp migrate --makemigrations
ptx myapp frontend-test --watch
ptx myapp frontend-build
```

## Commands

| Command | Description |
|---|---|
| `ptx` / `ptx --help` / `ptx -h` | help and project list |
| `ptx --version` / `ptx -v` | version |
| `ptx list [project]` | list projects or a project's tasks |
| `ptx config [--init]` | show config path or create it |
