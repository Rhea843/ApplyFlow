import { z } from 'zod';

export const applicationStatusSchema = z.enum([
  'Applied',
  'Interview',
  'Rejected',
  'Offer'
]);

export const applicationValidator = z.object({
  date_applied: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  companyid: z.uuid(),
  position: z.string().trim().min(1),
  location: z.string().trim().min(1),
  status: applicationStatusSchema
});

export const applicationUpdateValidator = z.object({
  date_applied: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  position: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  status: applicationStatusSchema.optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
})

