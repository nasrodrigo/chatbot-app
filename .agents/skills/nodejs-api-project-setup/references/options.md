# Options and recipes

Read only the sections that match the user's request. Commands and APIs change between releases; check the
package's own docs when something doesn't match.

## Contents
- Adding a resource (books example)
- Choosing a different framework
- Databases
- Authentication
- Rate limiting and other hardening
- API documentation (OpenAPI)
- Docker
- Deployment notes

## Adding a resource (books example)
`references/example-books/` holds a complete example: a store interface with an in-memory
implementation, an Express router with zod validation and the standard status codes, and an integration test.

```bash
cp references/example-books/book-store.ts    <project>/src/services/book-store.ts
cp references/example-books/books-router.ts  <project>/src/routes/books.ts
cp references/example-books/books.test.ts    <project>/src/routes/books.test.ts
```
Mount it in `src/routes/index.ts`:
```ts
import { createBooksRouter } from './books.js'
import { createInMemoryBookStore } from '../services/book-store.js'
// inside createApiRouter():
router.use('/books', createBooksRouter(createInMemoryBookStore()))
```
Then rename and reshape for the user's actual domain. Keep the pattern:
- **Router** (`routes/<resource>.ts`): HTTP only. Parse input with zod, call the store/service, set status codes.
- **Store/service** (`services/<resource>.ts`): business logic and persistence behind an interface.
- **Errors:** throw `HttpError` (or let zod throw); never build error responses by hand.
- **Status codes:** `200` read/update, `201` + `Location` on create, `204` on delete, `400` invalid input,
  `404` unknown id, `409` conflicts (e.g. duplicate unique value).
- **Lists:** always paginate (`limit`/`offset` or a cursor) and return `{ items, total, limit, offset }`.

## Choosing a different framework
Default is Express 5 because it is the most widely known. Offer alternatives only when the user's needs point there:
- **Fastify**: built-in JSON-schema validation, fast, first-class logging, `app.inject()` for tests without a server. Good for performance-sensitive services.
- **Hono**: tiny, runs on Node, Bun, Deno, and edge runtimes. Good for portability.
- **NestJS**: opinionated, decorator-based, for large teams that want DI and modules.

Switching means rewriting `app.ts`, the middleware, and the routers; the `config.ts`, logger, test approach (start the app, call it with `fetch`), and scripts carry over. Don't hybridize.

## Databases
Don't add one unless the user needs persistence; start with the in-memory store behind the interface and say so.
When asked:
- **PostgreSQL**: `pg` (plain SQL), Drizzle ORM, or Prisma. Put the connection string in `DATABASE_URL` and add it to `config.ts` (`z.string().url()`) and `.env.example`.
- **SQLite**: Node 22 includes `node:sqlite` (experimental); `better-sqlite3` is the established choice.
- **MongoDB**: the official `mongodb` driver or Mongoose.
Implement the new store against the same interface, run migrations through the tool's own CLI, and keep integration tests pointed at a separate database or an ephemeral container.

## Authentication
Ask what the user needs before adding anything. Common shapes:
- **API keys** for service-to-service: compare a hashed key from a header in a small middleware; load valid keys from env or the database.
- **JWT bearer tokens**: verify with `jose` (preferred) or `jsonwebtoken`; read the secret/JWKS URL from env; reject on any verification failure with `401`.
- **Sessions/OAuth** for browser apps: use a maintained library (Passport, Auth.js, or an identity provider) rather than hand-rolling.
Never log tokens or put secrets in code; hash stored passwords with `argon2` or `bcrypt`.

## Rate limiting and other hardening
Already included: `helmet`, a JSON body size limit, CORS off unless configured, a validated environment.
Offer on request: `express-rate-limit` (set `trust proxy` correctly first, or all clients share one IP behind a proxy),
request timeouts, `compression`, and `npm audit` in CI.

## API documentation (OpenAPI)
Offer, don't add by default. Options: generate the spec from zod schemas (e.g. `zod-to-openapi` style libraries) and serve it with Swagger UI or Scalar, or hand-write `openapi.yaml`. Keep the spec in sync with the validators by deriving it from them where possible.

## Docker
Only when the user asks. Multi-stage `Dockerfile` for npm:
```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```
Add a `.dockerignore` with `node_modules`, `dist`, `.env`, `.git`. Adjust install commands for pnpm/yarn. If a container health check is needed, call `GET /health`.
The server already handles `SIGTERM`, which is what orchestrators send on shutdown. If the server runs as PID 1, make sure the runtime forwards signals (Docker's `--init`, or `tini`).

## Deployment notes
- Platforms (Render, Railway, Fly.io, Cloud Run, ECS, etc.) inject `PORT`; the config reads it already.
- Set `NODE_ENV=production` so error details are hidden and logs stay JSON.
- Behind a load balancer, enable `app.set('trust proxy', 1)` (commented in `app.ts`) so client IPs and protocol are correct.
- Run `npm run build` in CI and ship `dist/`; don't run `tsx` in production.
