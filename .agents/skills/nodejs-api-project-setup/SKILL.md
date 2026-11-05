---
name: nodejs-api-project-setup
description: Scaffold and implement a new Node.js REST/HTTP API (Express 5 + TypeScript by default) with validated config, structured logging, consistent JSON errors, security headers, graceful shutdown, tests, linting, and a verified build plus a real start-and-request smoke test. Use this skill whenever the user or agent wants to create, start, bootstrap, or scaffold a Node.js backend, API, REST service, web server, or microservice, or asks for endpoints/routes in a new Node project, even if they only say "set up a backend", "make an API for X", or name a stack like "Express + TypeScript" without saying "scaffold".
---

# Node.js API Project Setup

Create a Node.js API that installs cleanly, type-checks, passes its tests, builds, and actually answers HTTP requests before you call it done. The skill ships a template with the unglamorous parts already solved (config validation, error shape, request ids, logging, security headers, graceful shutdown, test helper), so the effort goes into the user's endpoints rather than boilerplate.

## 1. Decide the stack (ask only what you can't infer)

Check the request and the environment (existing files, `node -v`, lockfiles). Fill in the table, asking about only the choices that are ambiguous and costly to change later:

| Choice | Default | Switch when |
|---|---|---|
| Framework | **Express 5** | Fastify/Hono/NestJS only if the user asks or their needs clearly point there (`references/options.md`) |
| Language | **TypeScript**, ESM | Plain JS only if the user says so |
| Validation | **zod** | The user prefers another library |
| Logging | **pino** | - |
| Tests | **Node's built-in test runner** + `fetch` | Vitest/Jest if the user already uses them |
| Package manager | npm | `--pm pnpm` or `--pm yarn` if requested or a lockfile exists |
| Persistence | **In-memory store behind an interface** | A real database only when the user names one or clearly needs durable data |
| Auth, Docker, OpenAPI, rate limiting | Not included | Add on request (`references/options.md`) |

If the user described what the API should do ("an API for managing books and authors"), write down the resources and endpoints you will build, in one short list, and proceed. If they gave no purpose at all ("make me an API"), ask one question about what it should do. State your assumptions in one line before scaffolding. If the API obviously needs durable data and the user hasn't chosen a database, build against the in-memory store and say so plainly in the hand-off; that is easy to swap, and it avoids guessing at infrastructure.

## 2. Preflight

1. **Node ≥ 22.** `scaffold.sh` checks this and stops with a clear message otherwise.
2. **Directory** must not exist or must be empty (the script refuses otherwise). Never scaffold over someone's project; if one exists, add to it instead and match its conventions.
3. **Network.** Installing dependencies needs the npm registry. If it is blocked, run the script with `--no-install`, and tell the user the exact install commands it prints; say clearly that nothing was installed or verified.

## 3. Scaffold

```bash
bash scripts/scaffold.sh <project-dir>                  # npm
bash scripts/scaffold.sh <project-dir> --pm pnpm        # or yarn
bash scripts/scaffold.sh <project-dir> --no-install     # files only
```
This copies the template, names the package after the directory, creates `.env` from `.env.example`, and installs dependencies at their current versions. Don't hand-write the base files; edit the template output when the user's needs differ.

What you get:

```
src/
├── server.ts            # entry: loadConfig, listen, SIGTERM/SIGINT graceful shutdown
├── app.ts               # createApp({ config, logger }): no listen(), so tests can run it anywhere
├── config.ts            # zod-validated env (NODE_ENV, PORT, LOG_LEVEL, CORS_ORIGIN)
├── routes/              # health.ts (GET /health), index.ts (createApiRouter at /api/v1)
├── middleware/          # request-context (request id + access log), not-found, error-handler
├── lib/                 # logger (pino), HttpError
├── testing/server.ts    # startTestServer(): random port, use with fetch
└── app.test.ts          # health, request id, 404, malformed JSON, security headers
```

## 4. Implement the user's API

Build the endpoints from step 1 following the pattern in `references/options.md` ("Adding a resource") and the example in `references/example-books/`:

- Routers handle HTTP only: parse with zod, call a store/service, set the status code.
- Business logic and persistence go behind an interface in `src/services/`.
- Throw `HttpError` for expected failures; let zod errors propagate (they become `400`). Never hand-build error responses; the error handler owns the shape.
- Use plural nouns, JSON bodies, `201` + `Location` on create, `204` on delete, paginated lists, and the `/api/v1` prefix.
- Add environment variables in **three places**: `config.ts` schema, `.env.example`, and the README. Never read `process.env` outside `config.ts`.
- Write at least one test per endpoint covering success, validation failure, and not-found, using `startTestServer()` and `fetch`.

Keep to what was asked. Don't add auth, a database, Docker, or OpenAPI "just in case"; list them as options at the end.

## 5. Verify before declaring success

```bash
bash scripts/verify.sh <project-dir>
```
It runs `typecheck`, `lint`, `test`, and `build` (whichever scripts exist), then **starts the compiled server and requests `/health`**, so a project that compiles but won't boot fails here. Fix every failure; if something can't be run, say which check was skipped and why.

**Don't run `npm run dev` or `npm start` in the foreground** as a check. They never exit and will hang the session; `verify.sh` already does a bounded start-and-request.

## 6. Hand-off

End with a short summary:
- What was created, the stack, and your assumptions (especially "data is in memory and resets on restart", if applicable)
- The endpoint list with methods and paths
- Commands: `npm run dev`, `npm test`, `npm run build && npm start`
- What was and wasn't verified
- One line of optional next steps (database, auth, rate limiting, OpenAPI docs, Docker, CI) so the user can opt in

## Pitfalls

- **ESM imports need the `.js` extension** for relative files (`import { x } from './x.js'`), even though the source is `.ts`. TypeScript with `NodeNext` requires it, and it's the most common cause of "cannot find module" at runtime.
- **Express 5 differences from older tutorials:** rejected promises and thrown errors in async handlers reach the error middleware automatically (no `try/catch` or wrapper needed); wildcard routes must be named (`/*splat`, not `*`); `req.query` is read-only, so parse it into a new variable rather than reassigning; `req.body` is `undefined` when no body was sent.
- **Don't call `listen()` inside `app.ts`.** Keeping it in `server.ts` is what makes the app testable without port conflicts.
- **The error handler must keep four parameters**, or Express won't treat it as one. Prefix unused ones with `_` (the lint rule allows it).
- **Secrets:** only via environment variables. `.env` is git-ignored; `.env.example` holds names and safe placeholders only.
- **`zod` version differences:** the template sticks to APIs that work in v3 and v4 (e.g. `z.string().uuid()`, `issue.path.map(String)`). Check the installed version's docs before using newer-only helpers.
- **CORS is off by default.** If a browser app on another origin needs access, set `CORS_ORIGIN` rather than allowing `*`.
- **Behind a proxy**, enable `trust proxy` or rate limits and IP logging see the proxy's address.
- **Mixed package managers:** one lockfile per project.
