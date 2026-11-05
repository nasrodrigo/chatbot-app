import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Comma-separated allowed origins. Unset means CORS is not enabled. */
  CORS_ORIGIN: z.string().optional(),
})

export type Config = z.infer<typeof schema>

/** Parses and validates environment variables, failing fast with a readable message. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env)
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.map(String).join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${problems}`)
  }
  return result.data
}
