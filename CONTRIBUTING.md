# Contributing

Contributions are welcome. By participating, you agree to maintain a respectful and constructive environment.

For coding standards, testing patterns, architecture guidelines, commit conventions, and all
development practices, refer to the **[Development Guide](https://github.com/rios0rios0/guide/wiki)**.

## Prerequisites

- [Node.js](https://nodejs.org/) v8.0+
- [Yarn](https://yarnpkg.com/) v1.x
- [TypeScript](https://www.typescriptlang.org/) v3.3+ (installed via Yarn)

## Development Workflow

1. Fork and clone the repository
2. Create a branch: `git checkout -b feat/my-change`
3. Install dependencies:
   ```bash
   yarn install
   ```
4. Build the project (compile TypeScript and generate oclif manifest):
   ```bash
   yarn prepack
   ```
5. Run the linter:
   ```bash
   yarn lint
   ```
6. Fix lint issues automatically:
   ```bash
   yarn lint:fix
   ```
7. Run tests with coverage:
   ```bash
   yarn test
   ```
8. Run the CLI locally:
   ```bash
   ./bin/run start
   ```
9. Commit following the [commit conventions](https://github.com/rios0rios0/guide/wiki/Life-Cycle/Git-Flow)
10. Open a pull request against `main`
