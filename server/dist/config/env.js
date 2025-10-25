import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().transform((value) => {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed <= 0) {
            throw new Error('PORT must be a positive integer');
        }
        return parsed;
    }),
    CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
    TOKEN_ROTATION_SECRET: z
        .string()
        .min(32, 'TOKEN_ROTATION_SECRET should be at least 32 characters for entropy')
});
const result = envSchema.safeParse(process.env);
if (!result.success) {
    console.error('Invalid environment configuration', result.error.flatten().fieldErrors);
    throw new Error('Failed to parse environment variables');
}
export const env = result.data;
