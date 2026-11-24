import { z } from 'zod';

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    MONGODB_URI: z
      .string()
      .min(1)
      .default('mongodb://127.0.0.1:27017/franchise_crm?replicaSet=rs0'),
    MONGODB_MIGRATION_URI: z.string().default(''),
    REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
    SESSION_SECRET: z
      .string()
      .min(32)
      .default('local-development-session-secret-change-before-deploy'),
    FIELD_ENCRYPTION_KEY: z
      .string()
      .min(32)
      .default('local-development-field-encryption-key-change-before-deploy'),
    APP_BASE_URL: z.string().url().default('http://localhost'),
    SMTP_URL: z.string().default(''),
    MAIL_FROM: z.string().email().default('no-reply@example.test'),
    ADMIN_BOOTSTRAP_EMAIL: z.string().email().default('admin@example.test'),
    ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).default('change-me-before-use'),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(100).default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(30).max(86400).default(900),
    LOGIN_RATE_LIMIT_IP_MAX_REQUESTS: z.coerce.number().int().min(1).max(10000).default(60),
    LOGIN_RATE_LIMIT_ACCOUNT_MAX_REQUESTS: z.coerce.number().int().min(1).max(1000).default(10),
    PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(86400)
      .default(900),
    PASSWORD_RESET_RATE_LIMIT_IP_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .default(30),
    PASSWORD_RESET_RATE_LIMIT_ACCOUNT_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(3),
    ADMIN_SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(300)
      .default(4 * 60 * 60),
    PARTNER_SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(300)
      .default(12 * 60 * 60),
  })
  .superRefine((config, context) => {
    if (config.NODE_ENV !== 'production') return;
    if (!/^[a-f\d]{64}$/i.test(config.FIELD_ENCRYPTION_KEY)) {
      context.addIssue({
        code: 'custom',
        path: ['FIELD_ENCRYPTION_KEY'],
        message: 'Production requires 32 bytes encoded as 64 hexadecimal characters.',
      });
    }
    if (config.SESSION_SECRET.includes('local-development') || config.SESSION_SECRET.length < 48) {
      context.addIssue({
        code: 'custom',
        path: ['SESSION_SECRET'],
        message: 'Production requires a high-entropy session secret.',
      });
    }
    if (config.ADMIN_BOOTSTRAP_PASSWORD === 'change-me-before-use') {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_BOOTSTRAP_PASSWORD'],
        message: 'Set a unique bootstrap password before production.',
      });
    }
    if (!config.MONGODB_MIGRATION_URI) {
      context.addIssue({
        code: 'custom',
        path: ['MONGODB_MIGRATION_URI'],
        message: 'Production requires a separate migration database identity.',
      });
    } else {
      try {
        const runtime = new URL(config.MONGODB_URI);
        const migration = new URL(config.MONGODB_MIGRATION_URI);
        if (
          !runtime.username ||
          !runtime.password ||
          !migration.username ||
          !migration.password ||
          config.MONGODB_URI === config.MONGODB_MIGRATION_URI
        ) {
          context.addIssue({
            code: 'custom',
            path: ['MONGODB_MIGRATION_URI'],
            message:
              'Runtime and migration database identities must be separate authenticated users.',
          });
        }
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['MONGODB_MIGRATION_URI'],
          message: 'MongoDB connection strings must be valid URLs.',
        });
      }
    }
  });

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }
  return parsed.data;
}
