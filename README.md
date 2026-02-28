<h1 align="center">Scaled</h1>
<p align="center">
    <a href="https://github.com/rios0rios0/scaled/releases/latest">
        <img src="https://img.shields.io/github/release/rios0rios0/scaled.svg?style=for-the-badge&logo=github" alt="Latest Release"/></a>
    <a href="https://github.com/rios0rios0/scaled/blob/main/LICENSE">
        <img src="https://img.shields.io/github/license/rios0rios0/scaled.svg?style=for-the-badge&logo=github" alt="License"/></a>
    <a href="https://github.com/rios0rios0/scaled/actions/workflows/default.yaml">
        <img src="https://img.shields.io/github/actions/workflow/status/rios0rios0/scaled/default.yaml?branch=main&style=for-the-badge&logo=github" alt="Build Status"/></a>
</p>

A TypeScript CLI tool (codename "Silent") for orchestrating security scanning tools like Nmap, Nikto, and SQLMap, with support for parsing scan reports and distributing jobs via AWS SQS.

## Features

- Orchestrates multiple security scanning tools (Nmap, Nikto, SQLMap)
- Parses and transforms scan reports into readable formats
- Dockerized tool execution for isolated and reproducible scans
- AWS SQS integration for distributed job processing
- Built with oclif CLI framework for extensible command structure

## Architecture

```
src/
  commands/start.ts                             # CLI entry point
  domain/
    entities/nmap-readable-report.ts            # Report entity
    services/report-service.ts                  # Report service contract
  infrastructure/
    services/nmap-report-service.ts             # Nmap report implementation
  resolver/
    strategy/                                   # Execution strategy (local, etc.)
    service-builder.ts                          # Service builder
  manager/                                      # Job management
  helpers/
    display.ts                                  # Display utilities
    sqs.ts                                      # AWS SQS integration
tools/
  nmap/docker-compose.yml                       # Dockerized Nmap
```

## Installation

```bash
git clone https://github.com/rios0rios0/scaled.git
cd scaled
yarn install
yarn prepack
```

## Usage

```bash
./bin/run start
```

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
