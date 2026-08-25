# HIMTI Election

Public frontend for HIMTI Election. It uses the existing HIMTI
backend, Better Auth session cookies, user profiles, and Outlook verification.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The default local URLs are:

```text
Election frontend:    http://localhost:3002
Registration frontend: http://localhost:3000
Backend API:          http://localhost:8000/api
```

## Environment

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_URL=http://localhost:3002
VITE_REGISTRATION_APP_URL=http://localhost:3000
```

The backend must trust the exact election origin for credentialed CORS and
Better Auth callbacks.

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
