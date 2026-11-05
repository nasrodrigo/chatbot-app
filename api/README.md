# api

A chatbot HTTP API built with Express 5 and TypeScript. Conversations and messages are stored in memory and reset when the server restarts.

## Getting started

```bash
cp .env.example .env   # if .env doesn't exist yet
npm install
npm run dev            # http://localhost:3000/health
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm test` | Run tests (Node's built-in test runner) |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` / `npm run format` | ESLint / Prettier |

## Configuration

Environment variables are validated at startup (`src/config.ts`). See `.env.example`.

## API

All resource endpoints are under `/api/v1`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/conversations` | List conversations |
| `POST` | `/api/v1/conversations` | Create a conversation |
| `GET` | `/api/v1/conversations/:id` | Get a conversation |
| `DELETE` | `/api/v1/conversations/:id` | Delete a conversation |
| `POST` | `/api/v1/conversations/:id/messages` | Add a user message and receive an assistant message |

## Layout

```
src/
├── server.ts          # entry point: config, listen, graceful shutdown
├── app.ts             # createApp(): builds the Express app (no listen, easy to test)
├── config.ts          # env parsing and validation
├── routes/            # routers; /health and /api/v1/*
├── middleware/        # request context, 404, error handler
├── lib/               # logger, HttpError
└── testing/           # test helpers (excluded from the build)
```

## Errors

Every error response has the same shape:

```json
{ "error": { "code": "not_found", "message": "...", "details": null, "requestId": "..." } }
```

Throw `HttpError(status, message, { code })` from any handler; validation errors from zod become `400`.
