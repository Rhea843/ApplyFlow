
import { z } from 'zod';
import { dateSchema } from './application.validator.js';

// Validate time in HH:MM or HH:MM:SS format
export const timeSchema = z.string()
    .regex(
        /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
        'Invalid time format'
    );

// Validate IANA timezone identifiers
export const timezoneSchema = z.string()
    .trim()
    .min(1, 'Timezone is required')
    .refine((value) => {
        try {
            new Intl.DateTimeFormat('en-US', {
                timeZone: value
            });
            return true;
        } catch {
            return false;
        }
    }, {
        message: 'Invalid timezone'
    });

export const interviewValidator = z.object({
    application_id: z.uuid(),
    interview_date: dateSchema,
    interview_time: timeSchema,
    timezone: timezoneSchema,
    interview_type: z.string().trim().min(1),
    location: z.string().trim().min(1).nullable().optional(),
    meeting_link: z.string().trim().min(1).nullable().optional(),
    notes: z.string().trim().min(1).nullable().optional()
});
