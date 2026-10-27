import { z } from 'zod';

export const registerValidator = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(8)
});

export const loginValidator = z.object({
  email: z.email(),
  password: z.string().min(1)
});