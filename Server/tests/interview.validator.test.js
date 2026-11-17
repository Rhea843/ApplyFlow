import { interviewValidator } from '../src/validators/interview.validator.js';

describe('Interview Validator', () => {
  test('should accept valid interview data', () => {
    const interviewData = {
      application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    };

    const result = interviewValidator.safeParse(interviewData);

    expect(result.success).toBe(true);
  });

  test('should reject an invalid application UUID', () => {
    const interviewData = {
        application_id: 'not-a-uuid',
        interview_date: '2026-12-01',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
    };

    const result = interviewValidator.safeParse(interviewData);

    expect(result.success).toBe(false);
  });

  test('should reject an invalid calendar date', () => {
    const interviewData = {
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-02-30',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
    };

    const result = interviewValidator.safeParse(interviewData);

    expect(result.success).toBe(false);
  });

  test('should reject an invalid interview time', () => {
    const interviewData = {
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-12-01',
        interview_time: '25:90',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
    };

    const result = interviewValidator.safeParse(interviewData);

    expect(result.success).toBe(false);
  });

  test('should reject an invalid timezone', () => {
    const interviewData = {
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-12-01',
        interview_time: '10:00',
        timezone: 'Invalid/Timezone',
        interview_type: 'Technical Interview'
    };

    const result = interviewValidator.safeParse(interviewData);

    expect(result.success).toBe(false);
  })

  test('should reject an empty interview type', () => {
    const interviewData = {
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-12-01',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: '   '
    };

    const result = interviewValidator.safeParse(interviewData);

    expect(result.success).toBe(false);
 });

 test('should accept interview data without optional fields', () => {
    const interviewData = {
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-12-01',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
    };

    const result = interviewValidator.safeParse(interviewData);

    expect(result.success).toBe(true);
 });

 test('should reject whitespace-only optional fields', () => {
    const interviewData = {
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-12-01',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview',
        location: '   '
    };

    const result = interviewValidator.safeParse(interviewData);

    expect(result.success).toBe(false);
  });


});






