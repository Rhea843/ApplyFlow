import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { afterAll } from '@jest/globals';

const createdCompanyIds = [];

describe('GET /api/companies', () => {
  const userId = '91e19194-0431-4a43-ba1a-7e499ee80c33';
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });

  test('should reject requests without an authentication token', async () => {
    const response = await request(app).get('/api/companies');

    expect(response.status).toBe(401);
  });
  
  test('should allow requests with a valid authentication token', async () => {
    const response = await request(app).get('/api/companies')
    .set({'Authorization': `Bearer ${token}`});

    expect(response.status).toBe(200);
  });

  test('should reject an expired authentication token', async () => {
    const expiredToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const response = await request(app)
      .get('/api/companies')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });
});

describe('POST /api/companies', () => {
  const userId = '91e19194-0431-4a43-ba1a-7e499ee80c33';

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });

  test('should create a company successfully', async () => {
    const companyData = {
      name: `Test Company ${Date.now()}`,
      website: 'https://testcompany.com',
      location: 'Lagos'
    };

    const response = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send(companyData);

    expect(response.status).toBe(201);
    createdCompanyIds.push(response.body.data.id);
    expect(response.body.message).toBe('Company created successfully');
    expect(response.body.data.name).toBe(companyData.name);
    expect(response.body.data.website).toBe(companyData.website);
    expect(response.body.data.location).toBe(companyData.location);
    expect(response.body.data.userid).toBe(userId);
  });

  test('should reject company creation with invalid data', async () => {
    const invalidCompanyData = {
      name: '',
      website: 'not-a-valid-url',
      location: 'Lagos'
    };

    const response = await request(app)
    .post('/api/companies')
    .set('Authorization', `Bearer ${token}`)
    .send(invalidCompanyData);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid company data');
    expect(response.body.errors).toBeDefined();
  });

  test('should reject duplicate company names', async () => {
    const companyData = {
      name: `Duplicate Company ${Date.now()}`,
      website: 'https://duplicate.com',
      location: 'Lagos'
    };

    const firstResponse = await request(app)
    .post('/api/companies')
    .set('Authorization', `Bearer ${token}`)
    .send(companyData);

    expect(firstResponse.status).toBe(201);

    createdCompanyIds.push(firstResponse.body.data.id);

    const response = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send(companyData);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      'You already have a company with this name'
    );
 });
});

afterAll(async () => {
  if (createdCompanyIds.length > 0) {
    await pool.query(
      'DELETE FROM companies WHERE id = ANY($1::uuid[])',
      [createdCompanyIds]
    );
  }

  await pool.end();
});