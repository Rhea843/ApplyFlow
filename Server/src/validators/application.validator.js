import { z } from 'zod';

export const applicationStatusSchema = z.enum([
  'Applied',
  'Interview',
  'Rejected',
  'Offer'
]);
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, {
  message: 'Invalid calendar date'
});

export const applicationValidator = z.object({
  dateapplied: dateSchema,
  companyid: z.uuid(),
  position: z.string().trim().min(1),
  location: z.string().trim().min(1),
  status: applicationStatusSchema
});

export const applicationUpdateValidator = z.object({
  dateapplied: dateSchema.optional(),
  companyid: z.uuid().optional(),
  position: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  status: applicationStatusSchema.optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
})

