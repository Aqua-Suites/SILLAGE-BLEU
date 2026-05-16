# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ |
| `develop` branch | ✅ |
| Older releases | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing: **security@sillagebleu.io**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive an acknowledgement within 48 hours and a full response within 7 days.

## Smart Contract Security

All Soroban smart contracts will undergo a full security audit via the **[Soroban Audit Bank](https://communityfund.stellar.org/audit-bank)** program prior to mainnet deployment.

Known security properties of the contracts:
- Role-based access enforced on every state-changing function
- On-chain duplicate guard using Soroban temporary storage
- No upgradeable proxy patterns — contracts are immutable after deployment
- All arithmetic uses Rust's overflow-checked integer types

## Scope

In scope for responsible disclosure:
- All Soroban smart contracts (`/contracts`)
- API gateway authentication and authorization (`/backend/api-gateway/src/middleware/auth.ts`)
- JWT token handling
- Stellar transaction signing logic

Out of scope:
- Third-party dependencies (report to their maintainers)
- Issues requiring physical access to infrastructure
- Social engineering attacks

## Acknowledgements

We will publicly credit researchers who responsibly disclose valid vulnerabilities (with their permission).
