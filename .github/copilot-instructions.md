# Copilot Instructions for Scaled

## Project Overview

**Scaled** (codename "scaled") is a TypeScript CLI tool built with the [oclif](https://oclif.io/) framework.
It orchestrates security scanning tools (Nmap, Nikto, SQLMap) by running them inside Docker containers,
parsing the resulting scan reports, and optionally distributing jobs via AWS SQS.

The npm package name is `@rios0rios0/scaled` and the CLI binary is `scaled`.

---

## Repository Structure

```
.github/
  workflows/
    default.yaml          # CI/CD pipeline (delegates to rios0rios0/pipelines)
bin/
  run                     # CLI entry-point script
src/
  commands/
    start.ts              # The only CLI command; entry-point for `scaled start`
  domain/
    entities/             # Domain entities (e.g. NmapReadableReport)
    repositories/         # Repository contracts/interfaces
    services/             # Service contracts/interfaces (e.g. ReportService)
  infrastructure/
    repositories/         # Concrete repository implementations
    services/             # Concrete service implementations (e.g. NmapReportService)
  resolver/
    strategy/             # Execution strategies (e.g. local)
    index.ts              # Resolver entry-point
    service-builder.ts    # Builds ServiceDefinition objects
  manager/
    index.ts              # ServiceManager: start / stop / report lifecycle
  helpers/
    display.ts            # Terminal display utilities
    sqs.ts                # AWS SQS integration helpers
  index.ts                # Library exports
  types.ts                # Shared TypeScript types (ServiceDefinition, NMAPReport, …)
tools/
  nmap/
    docker-compose.yml    # Dockerised Nmap configuration
  nikto/                  # Dockerised Nikto configuration
  sqlmap/                 # Dockerised SQLMap configuration
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.x |
| CLI framework | oclif v1 (`@oclif/command`, `@oclif/config`) — note: v1 is deprecated; consider migrating to oclif v3 |
| Task runner | Listr |
| HTTP client | Axios |
| Cloud | AWS SDK (SQS) |
| Process execution | execa |
| User prompts | Inquirer |
| Report rendering | marked + marked-terminal |
| Terminal UI | terminal-kit |
| Config parsing | yaml, xml2js |
| Utilities | lodash, rxjs |
| Runtime | Node.js ≥ 8.0 (as declared in `package.json`; Node.js 8 is EOL — upgrade recommended) |
| Package manager | Yarn 4.x (Berry, `node-modules` linker) |

---

## Build, Test, Lint, and Run Commands

```bash
# Install dependencies
yarn install

# Build: compile TypeScript → lib/, generate oclif manifest and update README
yarn prepack           # ~10-20 s

# Lint (ESLint with airbnb-typescript rules)
yarn lint              # ~5 s
yarn lint:fix          # auto-fix lint issues

# Test (mocha + nyc coverage)
yarn test              # ~5-10 s

# Run the CLI locally after building
./bin/run start <service> [--build] [--containers <n>] [--set-env KEY=VALUE]
```

> **Note:** `yarn prepack` must be run before `./bin/run` because the compiled output lives in `lib/`.

---

## Architecture and Design Patterns

- **Domain-Driven Design (DDD):** Code is split into `domain/` (entities, repository & service contracts) and `infrastructure/` (concrete implementations). This keeps business logic decoupled from I/O.
- **Strategy pattern:** `src/resolver/strategy/` contains pluggable execution strategies (e.g. running tools locally vs. remotely).
- **Service Builder:** `src/resolver/service-builder.ts` constructs `ServiceDefinition` objects which carry the name and file-system path of a tool.
- **Listr task lists:** Long-running operations are presented as an ordered list of observable tasks in the terminal.
- **Docker-first tool execution:** Each supported scanner (Nmap, Nikto, SQLMap) has its own `docker-compose.yml` under `tools/`, ensuring isolated and reproducible runs.

---

## CI/CD Pipeline

The workflow file `.github/workflows/default.yaml` delegates all steps to the shared reusable workflow at `rios0rios0/pipelines/.github/workflows/yarn-library.yaml@main`.

Triggers:
- Push to `main`
- Any git tag
- Pull requests targeting `main`
- Manual (`workflow_dispatch`)

Required permissions: `security-events: write`, `contents: write`.

---

## Development Workflow

1. Fork and clone the repository.
2. Create a feature branch: `git checkout -b feat/my-change`
3. `yarn install`
4. Make code changes in `src/`.
5. `yarn lint` — fix any lint errors (`yarn lint:fix` for auto-fixable ones).
6. `yarn test` — ensure all tests pass.
7. `yarn prepack` — verify the project builds cleanly.
8. Test the CLI manually: `./bin/run start <service>`
9. Commit following [Conventional Commits](https://www.conventionalcommits.org/) as described in the [Development Guide](https://github.com/rios0rios0/guide/wiki/Life-Cycle/Git-Flow).
10. Open a pull request against `main`.

---

## Coding Conventions

- **ESLint config:** `airbnb-typescript/base` extended in `.eslintrc`. Project-specific overrides:
  - `class-methods-use-this`: off
  - `no-await-in-loop`: off
  - `no-restricted-syntax`: off
  - `no-continue`: off
- **TypeScript:** Strict mode is enabled (`"strict": true` in `tsconfig.json`). Target is ES2017, output to `lib/`.
- **Imports:** Use named imports where possible. Avoid default re-exports unless the oclif convention requires it.
- **Types:** Shared types and domain types live in `src/types.ts` and domain entities respectively. Avoid `any`.
- **README:** Auto-generated by `oclif-dev readme` during `prepack` and `version` scripts — do **not** edit it manually.
- **Commit messages:** Follow the project's [Git Flow guide](https://github.com/rios0rios0/guide/wiki/Life-Cycle/Git-Flow) (Conventional Commits style).

---

## Common Tasks

### Adding a new scanner tool

1. Create `tools/<tool-name>/docker-compose.yml` with the Docker Compose configuration.
2. Implement a `ServiceDefinition` builder in `src/resolver/service-builder.ts`.
3. Add a new strategy under `src/resolver/strategy/` if needed.
4. Add a report service interface under `src/domain/services/` and an implementation under `src/infrastructure/services/`.

### Adding a new CLI flag

Edit `src/commands/start.ts` — flags are declared in the `static flags` block using the oclif `flags` helpers.

### Updating dependencies

Use `yarn add <package>` / `yarn add -D <package>`. Re-run `yarn prepack` to verify the build still succeeds.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `./bin/run` reports missing module | Run `yarn prepack` to compile TypeScript |
| ESLint errors on TypeScript files | Run `yarn lint:fix`; check `parserOptions.project` points to `tsconfig.json` |
| Docker tool not found | Ensure Docker and Docker Compose are installed and the daemon is running |
| AWS SQS errors | Verify AWS credentials are set (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) |
