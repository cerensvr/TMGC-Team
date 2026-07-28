# Production Runbook

## Backend Deploy

The backend is deploy-ready with:

- `backend/Dockerfile`
- `render.yaml`
- public health endpoint: `GET /api/health`

Recommended first target: Render using the checked-in `render.yaml` blueprint.

Required host secrets:

| Variable | Purpose |
| --- | --- |
| `DB_URL` | Supabase pooler JDBC URL, including `sslmode=require&prepareThreshold=0` |
| `DB_USERNAME` | Supabase pooler username: `postgres.PROJECT_REF` |
| `DB_PASSWORD` | Supabase database password |
| `JWT_SECRET` | At least 32 random characters; never use example placeholders |
| `JWT_EXPIRATION_SECONDS` | Session lifetime between 300 and 31536000; default `604800` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated HTTP(S) web client origins; wildcard is rejected |
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Optional model override; default `gemini-3.6-flash` |

The packaged backend reads these values through
`backend/src/main/resources/application.yml`. Missing required database or JWT
variables stop startup with the missing variable name. Gemini can fall back to
static responses when its key is omitted in local development, but the key is
required by the production preflight.

Before entering values in Render, validate the contract locally without printing
the secret values:

```bash
npm run validate:env:backend
```

For Supabase, copy the current transaction/session pooler host and matching
`postgres.PROJECT_REF` username from the project's Connect panel. Do not reuse a
host or username copied from another Supabase project.

Native Android/iOS requests are not controlled by browser CORS. Add only the
actual deployed web frontend origins to `CORS_ALLOWED_ORIGINS`; do not add `*`.

Post-deploy checks:

```bash
curl https://BACKEND_DOMAIN/api/health
API_BASE_URL=https://BACKEND_DOMAIN/api npm run smoke:api
```

## Mobile/Web Production Build

The Expo production setup is deploy-ready with:

- `eas.json`
- Android package: `com.skinshelf.app`
- iOS bundle id: `com.skinshelf.app`
- app icon, adaptive icon and splash configured in `app.json`
- camera permission copy configured for scanner/product-add flow

Before cloud builds, set:

```bash
EXPO_PUBLIC_API_URL=https://skinshelf-backend.onrender.com/api/auth
```

Validate the mobile URL before starting EAS:

```bash
npm run validate:env:mobile
```

Both `preview` and `production` profiles in `eas.json` point to the same
`/api/auth` production contract.

Preview Android build:

```bash
npx eas-cli build --profile preview --platform android
```

Production Android build:

```bash
npx eas-cli build --profile production --platform android
```

Production iOS build:

```bash
npx eas-cli build --profile production --platform ios
```

## Final QA Scope

- Web smoke: login, home, scanner route, manual product add, assistant.
- Android emulator smoke: login/session, home, scanner, manual product add, assistant.
- Real device smoke: same flows plus camera permission and physical barcode scan.
- Failure checks: backend unavailable, unknown barcode, Gemini fallback, DB connection failure.
- Account deletion smoke: register a disposable account, add profile/product/log data, delete from Profile, then verify login fails.

## Secret Rotation and Verification

- Enter `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`,
  `CORS_ALLOWED_ORIGINS`, and `GEMINI_API_KEY` only in Render's environment
  settings.
- Keep only placeholders in `.env.example`, `.env.production.example`, and
  `application.properties.example`.
- Rotate a database password, JWT secret, or Gemini key immediately if it is
  copied into Git, logs, screenshots, or chat output.
- After any rotation, redeploy and run `/api/health` followed by
  `npm run smoke:api`.

## Current Blockers

- Real backend deploy requires a logged-in hosting account and host-level secret entry for all `sync: false` values in `render.yaml`.
- EAS cloud build requires Expo account login and project credentials.
- Real device testing requires a connected physical Android/iOS device.

## Legal Documents

- Privacy policy draft: `docs/privacy-policy.md`
- Terms of use draft: `docs/terms-of-use.md`
- Data deletion instructions: `docs/data-deletion.md`

Publish these documents and use their public URLs in the app store listing before a public release.
