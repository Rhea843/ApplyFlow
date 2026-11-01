import { z } from 'zod';

export const createCompanyValidator = z.object({
  name: z.string().trim().min(1, 'Company name is required'),
  website: z.string().trim().optional(),
  location : z.string().trim().optional(),
});

export const updateCompanyValidator = z.object({
  name: z.string().trim().min(1).optional(),
  website: z.string().trim().optional(),
  location : z.string().trim().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});