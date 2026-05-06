# Healthcheck and probes examples

Ready-to-use examples for Message2 `messaging` service health and readiness checks.

## Docker Compose healthcheck

Use `/health/ready` so the container is considered healthy only when crypto keys are initialized.

```yaml
services:
  messaging:
    image: node:22
    working_dir: /app
    volumes:
      - ../..:/app
    command: sh -c "corepack enable && pnpm install && pnpm --filter @message2/messaging dev"
    ports:
      - "4001:4001"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:4001/health/ready >/dev/null || exit 1"]
      interval: 15s
      timeout: 3s
      retries: 5
      start_period: 20s
```

If your runtime image does not include `wget`, use `curl` instead:

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:4001/health/ready >/dev/null || exit 1"]
```

## Kubernetes probes

Recommended baseline:

- `livenessProbe`: `/health` (process alive)
- `readinessProbe`: `/health/ready` (ready for traffic, including crypto key readiness)
- optional startup gating: `startupProbe` on `/health/ready`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: messaging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: messaging
  template:
    metadata:
      labels:
        app: messaging
    spec:
      containers:
        - name: messaging
          image: your-registry/message2-messaging:latest
          ports:
            - containerPort: 4001
          livenessProbe:
            httpGet:
              path: /health
              port: 4001
            initialDelaySeconds: 20
            periodSeconds: 15
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 4001
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /health/ready
              port: 4001
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 24
```

## Monitoring tip

- Use `GET /health/crypto` for diagnostics.
- Use `/metrics` and alert on `message2_key_provider_ready == 0`.

## Compose startup order

Recommended startup dependency chain in this repository:

1. `postgres`, `redis`, `minio`
2. `messaging` (waits for healthy `postgres`)
3. `media`, `notifications`, `access-audit`
4. `api-gateway` (waits for all backend services to become healthy)

This keeps gateway from accepting traffic before internal targets are actually ready.

## Troubleshooting unhealthy services

- Check service state:
  - `docker compose -f infra/docker/docker-compose.yml ps`
- Inspect failing service logs:
  - `docker compose -f infra/docker/docker-compose.yml logs <service-name> --tail 200`
- Restart one service after config fix:
  - `docker compose -f infra/docker/docker-compose.yml up -d --force-recreate <service-name>`

Quick checks by service:

- `postgres`: validate `MESSAGE2_POSTGRES_PORT` is free and credentials match compose env.
- `messaging`: validate `DATABASE_URL`, `MESSAGE2_JWT_SECRET`, `MESSAGE2_DATA_ENCRYPTION_MASTER_KEY`.
- `api-gateway`: ensure internal URLs point to compose service names (`http://messaging:4001`, etc.).
- `minio`: ensure ports `9000/9001` are free and health endpoint responds.
