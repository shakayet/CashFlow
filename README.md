# CashFlowIQ API

Production-oriented Node.js/TypeScript API for cash-flow tracking, reports, OCR receipt scanning, chat, authentication, and Apple subscription verification.

## Local development

Requires Node.js 20–24 and MongoDB.

```bash
npm ci
copy .env.example .env
npm run dev
```

Fill every required value in `.env`. Optional Google OAuth and Apple subscriptions remain unavailable until their feature flags and credentials are configured.

## Quality gates

```bash
npm run verify
npm audit --omit=dev --audit-level=high
```

`verify` runs the TypeScript build, ESLint, Prettier, and the Jest regression suite. CI runs the same gates on pull requests and pushes to `main`.

## Production

Build and start directly:

```bash
npm ci
npm run verify
npm run build
npm run production:prepare
npm start
```

The database preflight is mandatory before the first deployment of a release. It is idempotent and should run as a single deployment job, not from every replica.

Container builds are supported with the included `Dockerfile`. See [Production operations](docs/PRODUCTION.md) for environment, deployment, health-check, OAuth migration, monitoring, and rollback details.

Health endpoints:

- `GET /health/live`
- `GET /health/ready`
