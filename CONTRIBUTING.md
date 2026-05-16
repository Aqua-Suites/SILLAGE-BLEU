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

## Good First Issues

These are well-scoped tasks that don't require deep knowledge of the full system. Each has a clear acceptance criterion.

| # | Title | Label | Skills | Effort |
|---|---|---|---|---|
| 1 | **Add `GET /api/vessels/:id` endpoint** — return vessel details + compliance score from DB | `good-first-issue` `BE` | TypeScript, Express, PostgreSQL | ~2h |
| 2 | **Add `estimateCredits()` unit tests for edge cases** — 0 kg, exactly 100 kg, score boundary at 60 and 80 | `good-first-issue` `sdk` | TypeScript, Vitest | ~1h |
| 3 | **Fisher dashboard: add catch history table** — paginated list of past catches with status badges | `good-first-issue` `FE` | React, Next.js, TanStack Query | ~3h |
| 4 | **Add `cargo clippy` step to CI** — run `cargo clippy -- -D warnings` in the contracts job | `good-first-issue` `INFRA` | GitHub Actions, YAML | ~30min |
| 5 | **Document `.env.example` variables** — add inline comments explaining each env var | `good-first-issue` `DOCS` | Markdown | ~30min |
| 6 | **Add `GET /api/credits/fisher/:address` route** — proxy to `CreditsClient.listByFisher()` | `good-first-issue` `BE` | TypeScript, Express | ~2h |

To claim an issue, comment on it in GitHub. Issues are labelled [`good-first-issue`](https://github.com/Aqua-Suites/SILLAGE-BLEU/labels/good-first-issue).

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
