# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**InGenium Einstein** is a mobile-first Expo/React Native student platform (Expo SDK 54, React 19, TypeScript) for a Brazilian school. It connects to a hosted Supabase backend (PostgreSQL + Auth). PHP endpoints on Hostinger handle payments (Asaas) and AI moderation (OpenAI). There is no local database or Docker setup.

### Running the dev server

```bash
EXPO_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" \
EXPO_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key" \
EXPO_PUBLIC_FEED_MOCK="1" \
npx expo start --web --port 8081
```

- Set `EXPO_PUBLIC_FEED_MOCK=1` to enable mock feed/mural data in dev mode (skips Supabase calls for feed).
- Without real `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` values, the UI renders with fallback/mock data but auth and data fetching will fail.
- If the secrets `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are available as env vars, use them instead of placeholders.

### Node version

The CI uses Node.js 20. Use `nvm use 20` (already set as default).

### Type checking

```bash
npx tsc --noEmit
```

No ESLint config is present in the project; TypeScript is the primary static analysis tool.

### Building (web export)

```bash
npx expo export -p web
```

Output goes to `dist/`.

### Key gotchas

- The `babel.config.js` is inside `app/` (not root). Expo Router expects this location.
- No automated test framework (Jest, Vitest, etc.) is configured. There are no test scripts in `package.json`.
- The project has no `.env` file convention; env vars are passed inline or via CI secrets.
- PHP files under `hostinger/` are deployed to production only (via FTP in CI). They are not needed for local dev.
