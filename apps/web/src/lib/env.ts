import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url(),
  REDIS_URL: z.string().optional(),
  MEILISEARCH_HOST: z.string().optional(),
  MEILISEARCH_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
