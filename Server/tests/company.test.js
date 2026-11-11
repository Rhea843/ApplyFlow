import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { afterAll } from '@jest/globals';

const createdCompanyIds = [];
const createdApplicationIds = [];
const userId = '91e19194-0431-4a43-ba1a-7e499ee80c33';
const anotherUserId = '449bf7f3-1a84-4d49-a17f-671652a2df45';
const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
  expiresIn: '1h'
});

describe('GET /api/companies', () => {

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

  test('should return 404 when company does not exist', async () => {
    const response = await request(app)
      .get('/api/companies/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Company not found');
  });

  test('should retrieve a company successfully', async () => {
    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Lookup Company ${Date.now()}`,
        website: 'https://lookupcompany.com',
        location: 'Lagos'
      });

    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const response = await request(app)
      .get(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(companyId);
    expect(response.body.data.name).toContain('Lookup Company');
  });

  test('should prevent users from retrieving another user\'s company', async () => {
    // User B's token
    const anotherUserToken = jwt.sign(
      { userId: anotherUserId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

  
    const createResponse = await request(app)
    .post('/api/companies')
    .set('Authorization', `Bearer ${anotherUserToken}`)
    .send({
      name: `Private Company ${Date.now()}`,
      website: 'https://privatecompany.com',
      location: 'Lagos'
    });

    expect(createResponse.status).toBe(201);
    const companyId = createResponse.body.data.id;

  
    createdCompanyIds.push(companyId);

    // User A attempts to retrieve User B's company
    const response = await request(app)
      .get(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Company not found');
  });
});

describe('POST /api/companies', () => {

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

describe('PATCH /api/companies/:id', () => {

  test('should update a company successfully', async () => {

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
      name: `Update Company ${Date.now()}`,
      website: 'https://updatecompany.com',
      location: 'Lagos'
    });

    expect(createResponse.status).toBe(201);
    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const updatedData = {
      name: `Updated Company ${Date.now()}`,
      website: 'https://updatedcompany.com',
      location: 'Abuja'
    };

    const updateResponse = await request(app)
      .patch(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedData);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.message).toBe('Company updated successfully');
    expect(updateResponse.body.data.name).toBe(updatedData.name);
    expect(updateResponse.body.data.website).toBe(updatedData.website);
    expect(updateResponse.body.data.location).toBe(updatedData.location);
  });

  test('should update a company with partial data', async () => {

    const updateData = {
      name: `Update Company ${Date.now()}`,
      website: 'https://updatecompany.com',
      location: 'Lagos'
    }

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send(updateData);

    expect(createResponse.status).toBe(201);
    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const updatedData = {
      name: `Updated Company ${Date.now()}`,
      website: 'https://updatecompany.com',
      location: 'Lagos'
    };

    const updateResponse = await request(app)
      .patch(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: updatedData.name });  
    
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.message).toBe('Company updated successfully');
    expect(updateResponse.body.data.name).toBe(updatedData.name);
    expect(updateResponse.body.data.website).toBe(createResponse.body.data.website);
    expect(updateResponse.body.data.location).toBe(createResponse.body.data.location);
  });

  test('should reject company update with invalid data', async () => {
    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Update Company ${Date.now()}`,
        website: 'https://updatecompany.com',
        location: 'Lagos'
      });

    expect(createResponse.status).toBe(201);
    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const updateResponse = await request(app)
      .patch(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        "name": "",
        "website": "not-a-url",
        "location": "Lagos"
      });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body.message).toBe('Invalid company data');
    expect(updateResponse.body.errors).toBeDefined();
  });

  test('should reject user from updating company that does not exist', async () => {
    const updateResponse = await request(app)
      .patch('/api/companies/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Non-existent Company',
        website: 'https://nonexistent.com',
        location: 'Lagos'
      });

    expect(updateResponse.status).toBe(404);
    expect(updateResponse.body.message).toBe('Company not found');
  });

  test('should prevent users from updating another user\'s company', async () => {
   const anotherUserToken = jwt.sign(
      { userId: anotherUserId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${anotherUserToken}`)
      .send({
        name: `Private Company ${Date.now()}`,
        website: 'https://privatecompany.com',
        location: 'Lagos'
      });

    expect(createResponse.status).toBe(201);
    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const updateResponse = await request(app)
      .patch(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Unauthorized Update',
        website: 'https://unauthorized.com',
        location: 'Lagos'
      });

    expect(updateResponse.status).toBe(404);
    expect(updateResponse.body.message).toBe('Company not found');
  })

  test('should reject duplicate company names on update', async () => {
    const companyData1 = {
      name: `Tech Solutions ${Date.now()}`,
      website: 'https://techsolutions.com',
      location: 'Lagos'
    };

    const createResponse1 = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send(companyData1);

    expect(createResponse1.status).toBe(201);
    const companyId1 = createResponse1.body.data.id;
    createdCompanyIds.push(companyId1);

    const companyData2 = {
      name: `Code Labs ${Date.now()}`,
      website: 'https://codelabs.com',
      location: 'Abuja'
    };

    const createResponse2 = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send(companyData2);

    expect(createResponse2.status).toBe(201);
    const companyId2 = createResponse2.body.data.id;
    createdCompanyIds.push(companyId2);

    const updateResponse = await request(app)
      .patch(`/api/companies/${companyId2}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: companyData1.name });

    expect(updateResponse.status).toBe(409);
    expect(updateResponse.body.message).toBe(
      'You already have a company with this name'
    );
  });

  test('should reject company update with null data', async () => {
    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Update Company ${Date.now()}`,
        website: 'https://updatecompany.com',
        location: 'Lagos'
      });

    expect(createResponse.status).toBe(201);
    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const updateResponse = await request(app)
      .patch(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ "website": null });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body.message).toBe('Invalid company data');
    expect(updateResponse.body.errors).toBeDefined();
  });
});

describe('DELETE /api/companies/:id', () => {
  test('should delete a company successfully', async () => {
    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Delete Company ${Date.now()}`,
        website: 'https://deletecompany.com',
        location: 'Lagos'
      });

    expect(createResponse.status).toBe(201);
    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const response = await request(app)
      .delete(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Company deleted successfully');

    const verifyResponse = await request(app)
      .get(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(verifyResponse.status).toBe(404);
    expect(response.body.data.id).toBe(companyId);
  });

  test('should reject unauthenticated deletion requests', async () => {
    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Delete Company ${Date.now()}`,
        website: 'https://deletecompany.com',
        location: 'Lagos'
      });

    expect(createResponse.status).toBe(201);
    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const response = await request(app)
      .delete(`/api/companies/${companyId}`);

    expect(response.status).toBe(401);
  });

  test('should prevent users from deleting another user\'s company', async () => {
    const anotherUserToken = jwt.sign(
      { userId: anotherUserId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${anotherUserToken}`)
      .send({
        name: `Private Company ${Date.now()}`,
        website: 'https://privatecompany.com',
        location: 'Lagos'
      });

    expect(createResponse.status).toBe(201);
    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const response = await request(app)
      .delete(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Company not found');

    const verifyResponse = await request(app)
    .get(`/api/companies/${companyId}`)
    .set('Authorization', `Bearer ${anotherUserToken}`);

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data.id).toBe(companyId);
  });


  test('should prevent deleting a company that has an existing application', async () => {
    const createCompanyResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Company With Application ${Date.now()}`,
        website: 'https://companywithapplication.com',
        location: 'Lagos'
      });

    expect(createCompanyResponse.status).toBe(201);
    const companyId = createCompanyResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const createApplicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Software Engineer',
        location: 'Lagos',
        status: 'Applied'
      });

    expect(createApplicationResponse.status).toBe(201);
    const applicationId = createApplicationResponse.body.id;
    createdApplicationIds.push(applicationId);   

    const deleteResponse = await request(app)
      .delete(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(409);
    expect(deleteResponse.body.message).toBe(
      'Cannot delete company because it has existing applications'
    );

    const verifyDeleteResponse = await request(app)
      .get(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${token}`);

      expect(verifyDeleteResponse.status).toBe(200);
      expect(verifyDeleteResponse.body.data.id).toBe(companyId); 
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