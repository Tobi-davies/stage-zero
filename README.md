# Insighta Labs+ — Backend

## System Architecture

```
CLI ─────────────┐
                 ├──► Express API ──► MongoDB
Web Portal ──────┘
```

- **Runtime**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **Auth**: GitHub OAuth 2.0 with PKCE
- **Tokens**: JWT (access: 3min, refresh: 5min)

## Authentication Flow

1. Client visits `GET /auth/github`
2. Backend generates PKCE pair + state, redirects to GitHub
3. GitHub redirects to `GET /auth/github/callback`
4. Backend exchanges code + verifier with GitHub
5. Backend upserts user, issues access + refresh tokens
6. **Web**: tokens set as HTTP-only cookies, redirect to dashboard
7. **CLI**: tokens returned as JSON via redirect to local server

## Token Handling

- Access token expires in **3 minutes**
- Refresh token expires in **5 minutes**
- Refresh tokens are **single-use** — rotated on every refresh
- Tokens are stored hashed in MongoDB

## Role Enforcement

| Role    | Permissions                   |
| ------- | ----------------------------- |
| admin   | Full CRUD on profiles         |
| analyst | Read-only (list, get, search) |

Default role on signup: `analyst`

Enforcement is centralized in `src/middleware/auth.js`:

- `authenticate` — verifies JWT, attaches user to request
- `requireRole(...roles)` — checks user role
- `requireApiVersion` — enforces `X-API-Version: 1` header

## API Endpoints

### Auth

| Method | Endpoint              | Description          |
| ------ | --------------------- | -------------------- |
| GET    | /auth/github          | Start OAuth flow     |
| GET    | /auth/github/callback | OAuth callback (web) |
| POST   | /auth/github/callback | OAuth callback (CLI) |
| POST   | /auth/refresh         | Refresh tokens       |
| POST   | /auth/logout          | Logout               |
| GET    | /auth/me              | Current user         |

### Profiles

All require `X-API-Version: 1` header and authentication.

| Method | Endpoint             | Role  | Description    |
| ------ | -------------------- | ----- | -------------- |
| GET    | /api/profiles        | any   | List profiles  |
| GET    | /api/profiles/:id    | any   | Get profile    |
| GET    | /api/profiles/search | any   | NL search      |
| GET    | /api/profiles/export | any   | Export CSV     |
| POST   | /api/profiles        | admin | Create profile |
| DELETE | /api/profiles/:id    | admin | Delete profile |

## Natural Language Parsing

Queries like "young males from Nigeria" are parsed into MongoDB filters
using keyword matching in `src/utils/naturalLang.js`.

## Rate Limiting

| Scope    | Limit           |
| -------- | --------------- |
| /auth/\* | 10 req/min      |
| /api/\*  | 60 req/min/user |

## Setup

```bash
npm install
cp .env.example .env   # fill in values
npm run dev
```

## Environment Variables

```
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
CLIENT_URL=
PORT=4000
```
