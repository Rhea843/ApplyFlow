import { pool } from '../src/config/db.js';
import request from 'supertest';
import { app } from '../src/app.js';
import jwt from 'jsonwebtoken';

const userId = '91e19194-0431-4a43-ba1a-7e499ee80c33';

const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

describe('POST /api/interviews', () => {

  test('should reject requests without an authentication token', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .send({});

    expect(response.status).toBe(401);
  });

  test('should create an interview for an application owned by the authenticated user', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
          application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
          interview_date: '2026-12-01',
          interview_time: '10:00',
          timezone: 'Africa/Lagos',
          interview_type: 'Technical Interview'
      });

    const savedInterview = await pool.query(
      'SELECT * FROM interviews WHERE id = $1',
      [response.body.data.id]
    );

    await pool.query(
      'DELETE FROM interviews WHERE id = $1',
      [response.body.data.id]
    );

    expect(savedInterview.rows).toHaveLength(1);
    expect(savedInterview.rows[0].application_id).toBe(
      '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'
    );
    expect(savedInterview.rows[0].status).toBe('Scheduled'); 

    expect(response.status).toBe(201);

    expect(response.body.message).toBe('Interview created successfully');

    expect(response.body.data.application_id).toBe(
      '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'
    );

    expect(response.body.data.status).toBe('Scheduled');

    expect(response.body.data.interview_type).toBe('Technical Interview');

    expect(response.body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    expect(new Date(response.body.data.created_at).toString())
    .not.toBe('Invalid Date');

  });

  test('should reject requests with missing required fields', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(400);
  });

  test('should reject interview creation when application status is not Interview', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        application_id: '18b69e10-0155-43d0-b171-d8f31fb50eb5',
        interview_date: '2026-12-01',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(409);

  });

  test('should reject interview creation for another user application', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        application_id: '39798afa-846d-4379-a134-a260a7898659',
        interview_date: '2026-12-01',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Application not found');
  });

  test('should reject an invalid application UUID with 400', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        application_id: 'not-a-uuid',
        interview_date: '2026-12-10',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid interview data');
  });

  test('should reject an application that does not exist with 404', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        application_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        interview_date: '2026-12-10',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Application not found');
  });

  test('should reject an interview application with invalid date with 400', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-02-30',
        interview_time: '10:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid interview data');
  });

  test('should reject an interview application with invalid time with 400', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-12-10',
        interview_time: '25:90',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid interview data');
  });

  test('should reject an interview application with invalid timezone with 400', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-12-10',
        interview_time: '20:10',
        timezone: 'Invalid/Timezone',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid interview data');
  });

  test('should accept interview application without location, meeting_link, or notes ', async () => {
    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0',
        interview_date: '2026-12-10',
        interview_time: '20:10',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Interview created successfully');
  });



});

afterAll(async () => {
  await pool.end();
});