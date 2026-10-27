# Lurph Backend — Email/Password + Passport Google OAuth

Express 5 + MongoDB/Mongoose authentication API for the Lurph Chrome extension. Email/password auth continues to use Lurph access JWTs and rotating refresh tokens. Google sign-in uses `passport-google-oauth20` with the OAuth 2.0 authorization-code redirect flow.

## Auth endpoints

- `POST /api/auth/register` — register an email/password account and create a session.
- `POST /api/auth/login` — sign in with email/password.
- `GET /api/auth/google` — begin Passport's Google OAuth flow; redirects to Google.
- `GET /api/auth/google/callback` — Google redirects here after consent; Passport validates state and the user profile, then redirects to the extension with a short-lived exchange code.
- `POST /api/auth/google/exchange` — exchange the one-time code for Lurph access/refresh tokens.
- `POST /api/auth/refresh` — rotate refresh token and issue a new access token.
- `GET /api/auth/me` — return the current user (Bearer access token required).
- `POST /api/auth/logout` — revoke the current refresh-token session (Bearer access token required).
- `GET /api/health` — server/database health.

## What Google OAuth does

1. The extension opens `/api/auth/google` through `chrome.identity.launchWebAuthFlow({ interactive: true })`.
2. Passport redirects to Google and validates the OAuth `state` value using a short-lived Express session stored in MongoDB.
3. Google redirects to the backend callback URL configured in Google Cloud Console.
4. Passport obtains the Google profile. Lurph requires a verified email, creates a Google-only user if needed, and links a verified Google identity to an existing Lurph account with the same email. A Google-only user does not need a password hash.
5. The backend creates a cryptographically random, one-time code that expires after 90 seconds and redirects to `GOOGLE_EXTENSION_REDIRECT_URL`. Lurph JWTs are not placed in the URL.
6. The extension posts `{ "code": "..." }` to `/api/auth/google/exchange`. The backend consumes that code atomically and returns the same `{ message, user, tokens }` response shape as email/password login.

The `/api/auth/google` endpoint is now a **GET redirect endpoint**, not the previous `POST` endpoint that accepted a Google access token. The frontend flow will need to use `chrome.identity.launchWebAuthFlow` and call the exchange endpoint after the redirect completes.

## Requirements

- Node.js 20+
- MongoDB
- Google OAuth 2.0 credentials of type **Web application**. The backend uses Passport's redirect-based authorization-code flow, so a Chrome Extension OAuth client by itself is not sufficient for the Passport strategy.

## Setup

1. Extract the backend project and run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` and a random `ACCESS_TOKEN_SECRET` with at least 32 characters. Set `OAUTH_SESSION_SECRET` to a separate random secret with at least 32 characters.
4. In Google Cloud Console, create an OAuth client with application type **Web application**.
5. Add the exact `GOOGLE_CALLBACK_URL` value to the client's **Authorized redirect URIs**. For local development, the example is `http://localhost:4000/api/auth/google/callback`. For production, use your deployed HTTPS API URL.
6. Put that client's ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
7. Set `GOOGLE_EXTENSION_REDIRECT_URL` to the exact URL returned by `chrome.identity.getRedirectURL()` for the extension, usually `https://<extension-id>.chromiumapp.org/`.
8. Set `CORS_ORIGINS` to include the exact `chrome-extension://<extension-id>` origin. Keep `http://localhost:5173` only if you also develop the UI in Vite.
9. Start the API with `npm run dev`.

Never commit `.env`, publish the Google client secret, or place Lurph JWTs in URL parameters. In production, use an HTTPS callback URL and keep `NODE_ENV=production` so the temporary OAuth session cookie is secure.

## Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Express port, default `4000` |
| `MONGODB_URI` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | Signs Lurph access JWTs; 32+ characters |
| `ACCESS_TOKEN_TTL` | Access JWT lifetime, default `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh-token lifetime, default `30` |
| `OAUTH_SESSION_SECRET` | Signs temporary Passport OAuth state sessions; 32+ characters |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call API endpoints |
| `GOOGLE_CLIENT_ID` | Google Web application OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google Web application OAuth client secret; server-side only |
| `GOOGLE_CALLBACK_URL` | Backend callback URL registered in Google Cloud Console |
| `GOOGLE_EXTENSION_REDIRECT_URL` | Extension's `chrome.identity.getRedirectURL()` result |

## Test the backend

### 1. Start Google sign-in

Open this in a browser after Google OAuth is configured:

`http://localhost:4000/api/auth/google`

It should redirect you to Google. A successful sign-in ultimately redirects to your configured `GOOGLE_EXTENSION_REDIRECT_URL` with a temporary `code` query parameter. The redirect endpoint is normally intercepted by `chrome.identity.launchWebAuthFlow`, rather than opened as a regular page.

### 2. Exchange the one-time code

`POST http://localhost:4000/api/auth/google/exchange`

Body → raw → JSON:

```json
{
  "code": "ONE_TIME_CODE_RETURNED_TO_THE_EXTENSION_REDIRECT"
}
```

The code is single-use and expires after 90 seconds. The response includes `user` and `tokens`.

### 3. Existing email/password routes

The existing registration, login, refresh, current-user, and logout routes remain unchanged.

## Notes

- Passport's OAuth `state` is stored in a temporary MongoDB-backed Express session and checked on callback.
- The raw Google tokens are not stored in MongoDB.
- The one-time exchange code is stored only as a SHA-256 hash and is atomically consumed.
- Email/password routes continue to issue the same Lurph access/refresh token shape.
- Frontend OAuth wiring is deliberately not included in this backend change.
