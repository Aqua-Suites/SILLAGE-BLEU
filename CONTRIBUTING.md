# Contributing to Sillage Bleu

Thank you for your interest in contributing to Sillage Bleu! This project is part of the Stellar ecosystem and welcomes contributions from the community.

## Getting Started

1. Fork the repository and create a feature branch: `git checkout -b feature/your-feature`
2. Follow the [Developer Onboarding guide](docs/developer-onboarding.md) to set up your environment
3. Make your changes with tests
4. Open a PR against `develop` (not `main`)

## Issue Labels

| Label | Description |
|-------|-------------|
| `good-first-issue` | Small, well-scoped tasks — great for new contributors |
| `enhancement` | New features or improvements |
| `bug` | Something is broken |
| `contracts` | Soroban smart contract work (Rust) |
| `backend` | API gateway, workers, services |
| `frontend` | Next.js dashboards |
| `sdk` | TypeScript SDK |
| `docs` | Documentation improvements |
| `infra` | Docker, CI/CD, deployment |

## Contributor Task Categories

All issues are tagged with one of: `FE` `BE` `SC` `INFRA` `DOCS`

## PR Requirements

- CI must pass (contracts build + test, backend test, frontend lint)
- Include a description of what changed and why
- Reference the issue number: `Closes #123`
- For contract changes: include updated tests
- No secrets in commits

## Smart Contract Contributions

Soroban contracts are in `/contracts` (Rust). Before submitting:

```bash
cd contracts
cargo test          # all tests must pass
cargo clippy        # no warnings
cargo fmt --check   # formatted
```

Signed commits are recommended for contract changes: `git commit -S`

## Code Style

- **Rust**: `cargo fmt` + `cargo clippy`
- **TypeScript**: ESLint + Prettier (`npm run lint && npm run format`)
- **Commits**: conventional commits preferred (`feat:`, `fix:`, `docs:`, `test:`)

## Community

- Join the [Stellar Dev Discord](https://discord.gg/stellardev) — `#scf-general` and `#soroban-dev`
- Open an issue before starting large changes to discuss the approach

## Drips Wave

This repository is registered on [Drips Wave (Stellar)](https://www.drips.network/wave/stellar/repos). Contributors can earn XLM rewards by solving labelled issues during active wave periods.
