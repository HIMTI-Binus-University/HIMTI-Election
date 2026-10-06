# HIMTI Election

Public frontend for HIMTI Election. It uses the existing HIMTI
backend, Better Auth session cookies, user profiles, and Outlook verification.

## Local Setup

```bash
cd /home/joshua/code/himti/himti-election/fe
npm install
cp .env.example .env
npm run dev
```

The default local URLs are:

```text
Election frontend:    http://localhost:3002
Registration frontend: http://localhost:3001
Internal frontend:     http://localhost:3000
Backend API:          http://localhost:8000/api
```

## Environment

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_URL=http://localhost:3002
VITE_REGISTRATION_APP_URL=http://localhost:3001
FRONTEND_PORT=3002
```

The backend must trust the exact election origin for credentialed CORS and
Better Auth callbacks.

## Docker

Run each repository separately; there is no workspace-level Compose stack.
The backend is shared and is not started by this frontend's Compose file:

```bash
cd /home/joshua/code/himti/himti-internal/backend
docker compose up --build -d

cd /home/joshua/code/himti/himti-election/fe
cp .env.example .env # first setup only; keep an existing .env
docker compose up --build -d
```

The backend automatically runs migrations and its seed service. It serves port
8000; the internal, registration, and election frontends intentionally use
3000, 3001, and 3002 respectively. Start the other frontends from their own
repositories as described in their READMEs.

Normal `docker compose up --build -d` runs Vite with source bind-mounted for
HMR. `docker compose build` only builds the image; it does not start services.
After changing `.env`, restart with `docker compose up -d --force-recreate`.
After changing dependencies or the lockfile, refresh the anonymous dependency
volume with `docker compose up --build -d --renew-anon-volumes`.

The optional dev file also works independently:

```bash
cd /home/joshua/code/himti/himti-election/fe
docker compose down
docker compose -f docker-compose.dev.yml up --build -d
```

Do not run the default, optional dev, and production services simultaneously:
they use the same host port. For production-style local Nginx serving:

```bash
cd /home/joshua/code/himti/himti-election/fe
docker compose down
docker compose -f docker-compose.dev.yml down # if previously started
docker compose -f docker-compose.prod.yml up --build -d
```

Production has no HMR or source mounts. Its `VITE_*` values are compiled into
the bundle: rebuild with the production command after changing them. The VPS
deployment workflow still builds the Dockerfile's final Nginx stage directly;
it does not use the default development Compose file.

For normal admin access, sign in with Google first, then explicitly grant the
seeded Admin role and required registration fields via backend Prisma Studio.
There is no system-account password. The backend README documents its opt-in
development-only auto-login (`ENABLE_DEV_AUTO_LOGIN=true` with
`NODE_ENV=development`); this is not the normal Google sign-in flow.

## Routes

```text
/                         Current election and candidates
/candidates               Candidate selector, profiles, and videos
/candidates/:candidateId  Candidate profile
/vote                     Protected ballot
/status                   Protected ballot receipt
/results                  Published results
/auth/callback             Better Auth callback
```

Incomplete or unverified BINUS profiles are redirected to the Registration
Frontend. Election eligibility and vote submission are always rechecked by the
backend.

## Checks

```bash
npm test
npm run lint
npm run build
```
