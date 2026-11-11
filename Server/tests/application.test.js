import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { afterAll } from '@jest/globals';
import { id } from 'zod/v4/locales';

const createdCompanyIds = [];
const createdApplicationIds = [];

const userId = '91e19194-0431-4a43-ba1a-7e499ee80c33';
const anotherUserId = '449bf7f3-1a84-4d49-a17f-671652a2df45';

const token = jwt.sign(
  { userId },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('POST /api/applications', () => {
  test('should reject requests without an authentication token', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send({});

    expect(response.status).toBe(401);
  });

  test('should create an application successfully', async () => {
    // Create a company for the authenticated user.
    const companyResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Application Test Company ${Date.now()}`
      });

    expect(companyResponse.status).toBe(201);

    const companyId = companyResponse.body.data.id;
    createdCompanyIds.push(companyId);

    // Create an application using that company.
    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.companyid).toBe(companyId);
    expect(response.body.position).toBe('Backend Developer');
    expect(response.body.status).toBe('Applied');

    createdApplicationIds.push(response.body.id);
 }); 

  test('should reject application creation with invalid data', async () => {
    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: 'invalid-date',
        position: '',
        location: 'Lagos',
        status: 'Pending'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid application data');
    expect(response.body.errors).toBeDefined();
  });

  test('should prevent users from creating applications for another user\'s company', async () => {

    const anotherUserToken = jwt.sign(
      { userId: anotherUserId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const companyResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${anotherUserToken}`)
      .send({
        name: `Another User Company ${Date.now()}`
      });

    expect(companyResponse.status).toBe(201);

    const companyId = companyResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Company not found');
  });

  test('should reject application creation for non-existent company', async () => {

    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: '00000000-0000-4000-8000-000000000001', // Non-existent company ID
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Company not found');

    ;
  });
});

afterAll(async () => {
  if (createdApplicationIds.length > 0) {
    await pool.query(
      'DELETE FROM applications WHERE id = ANY($1::uuid[])',
      [createdApplicationIds]
    );
  }

  if (createdCompanyIds.length > 0) {
    await pool.query(
      'DELETE FROM companies WHERE id = ANY($1::uuid[])',
      [createdCompanyIds]
    );
  }

  await pool.end();
});