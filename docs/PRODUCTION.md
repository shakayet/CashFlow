# Production operations

CashFlowIQ expects Node.js 20–24, MongoDB, an SMTP service, and an S3-compatible AWS bucket. Node.js 22 is the deployment baseline used by CI and the container image.

## Release sequence

1. Supply every required value documented in `.env.example` through the platform's secret manager. Never ship a `.env` file.
2. Keep `GOOGLE_OAUTH_ENABLED` and `APPLE_SUBSCRIPTIONS_ENABLED` false until their complete credentials and HTTPS callback/webhook endpoints are configured.
3. Run `npm ci`, `npm run verify`, and `npm audit --omit=dev --audit-level=high` on the release artifact.
4. Build with `npm run build`.
5. Back up MongoDB and run `npm run production:prepare` once against the target database. The preflight checks ownership conflicts, backfills subscription ownership, repairs TTL indexes, and creates critical indexes. It stops without creating unsafe unique indexes when conflicting data exists.
6. Start the service with `npm start`, or build and run the included Dockerfile. Run a single preflight job before rolling out multiple application replicas.

## Runtime configuration

- Production startup rejects wildcard or non-HTTPS CORS origins, short/shared JWT secrets, an insecure administrator password, invalid ports, and incomplete enabled integrations.
- `TRUST_PROXY_HOPS` must match the exact number of trusted reverse-proxy hops. An incorrect value can undermine IP-based rate limiting.
- Set `OCR_LANGUAGE_DATA_PATH` to the directory containing the uncompressed `eng.traineddata`. The container uses `/app` by default and includes this file.
- AWS credentials should be injected through the workload identity/instance role. Uploaded objects use S3 server-side encryption. Use a private bucket and CloudFront access controls appropriate to the data.
- Rotate JWT, SMTP, AWS, Google, and Apple credentials through the secret manager. Restart all replicas after JWT rotation.

## Health and rollout

- `GET /health/live` confirms the process can serve requests.
- `GET /health/ready` returns 200 only after MongoDB is connected and while the process is accepting traffic.
- Use readiness for load-balancer membership and liveness for process restart decisions.
- Deploy with rolling replacement. The service handles SIGTERM/SIGINT by failing readiness, closing Socket.IO and HTTP listeners, terminating OCR workers, and disconnecting MongoDB.

## OAuth migration

Google callbacks now redirect with a five-minute, single-use `code` only. The frontend must POST `{ "code": "..." }` to `/api/v1/oauth/exchange`; access and refresh tokens are returned in the JSON response. Do not restore tokens to redirect query parameters or browser logs.

Refresh responses now expose the correctly named `accessToken`; the legacy `createToken` alias remains temporarily for client compatibility and should be retired after clients migrate.

## Monitoring and rollback

Production logs are structured JSON and include request IDs. Alert on sustained 5xx/429 rates, readiness failures, MongoDB saturation, SMTP failures, OCR queue pressure, and Apple webhook processing failures. Keep logs free of tokens and user-provided query strings.

For rollback, retain the previous immutable image and database backup. Application rollback is safe after this preflight because the new collections/indexes are additive; restore the database only if a separately reviewed data migration requires it.
