# ANWALIVE

AnwaLive is an original social livestreaming platform foundation with mobile, admin, API, and database workspaces.

## Current repository scope

This change introduces a production-oriented baseline:
- monorepo folder layout for mobile/admin/api/packages
- strict TypeScript backend API scaffold (`apps/api`)
- security-focused HTTP baseline (helmet, CORS, payload limits)
- username normalization/validation endpoint
- foundational Supabase/PostgreSQL migration for core entities
- environment variable template and repository safety docs

## Structure

- `apps/api` - TypeScript Express API scaffold
- `apps/mobile` - mobile app workspace placeholder
- `apps/admin` - admin app workspace placeholder
- `packages/*` - shared packages placeholders
- `supabase/migrations` - schema migrations
- `docs/*` - architecture/security/API/realtime/video/testing/moderation placeholders

## Quick start

```bash
npm install
npm run test
npm run build
```

Run API locally:

```bash
npm run dev -w apps/api
```

Health endpoint:
- `GET /health`

Username validation endpoint:
- `POST /v1/usernames/validate`
- request body: `{ "username": "Creator_01" }`

## Environment

Copy `.env.example` to `.env` and set values.
All sensitive values must remain server-side and never be embedded in mobile/admin clients.

## Security baseline

- strict server-side input validation with Zod
- reserved username protection
- no trust of client-provided security decisions
- DB schema uses UUID primary keys and timestamps

## Next implementation phases

1. Supabase RLS policies and scoped service modules
2. Auth integration (Clerk mapping + sessions)
3. social graph, livestream/party/PK services, wallets, messaging
4. mobile and admin feature delivery with shared API contracts
5. CI/CD expansion, integration tests, e2e coverage
