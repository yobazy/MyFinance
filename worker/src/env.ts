import { z } from 'zod';

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  WORKER_ID: z.string().default(`worker-${process.pid}`),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  // eslint-disable-next-line no-process-env
  return EnvSchema.parse(process.env);
}

