import { z } from "zod";

export const CreateUserSchema = z.object({
    username: z.string().min(3).max(30),
    email: z.string().email(),
});

export const AvailablePlayersQuerySchema = z.object({
    excludeUserId: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    limit: z.coerce
        .number()
        .int()
        .optional()
        .default(50)
        .transform((val) => Math.min(Math.max(val, 1), 200)),
});
