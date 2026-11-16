import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { afterAll } from '@jest/globals';


const createdCompanyIds = [];
const createdApplicationIds = [];

const userId = '91e19194-0431-4a43-ba1a-7e499ee80c33';
const anotherUserId = '449bf7f3-1a84-4d49-a17f-671652a2df45';

const token = jwt.sign(
  { userId },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const anotherUserToken = jwt.sign(
  { userId: anotherUserId },
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

describe('GET /api/applications', () => {
  test('should reject requests without an authentication token', async () => {
    const response = await request(app)
      .get('/api/applications');

    expect(response.status).toBe(401);
  });

  test('should retrieve applications successfully', async () => {

    const companyName = `Lookup Company ${Date.now()}`;

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: companyName,
      });

    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Frontend Developer',
        location: 'Lagos',
        status: 'Applied'
      });
    const applicationId = applicationResponse.body.id;
    createdApplicationIds.push(applicationId);
    
    const response = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${token}`); 

    expect(applicationResponse.status).toBe(201);
    expect(Array.isArray(response.body.data)).toBe(true); 

    const foundApplication = response.body.data.find(
      application => application.id === applicationId
    );

    expect(foundApplication).toBeDefined();
    expect(foundApplication.company_name).toContain(companyName);
  });

  test('should not retrieve another user applications', async () => {

    const companyName = `Amazon Company ${Date.now()}`;

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: companyName,
      });

    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });
    const applicationId = applicationResponse.body.id;
    createdApplicationIds.push(applicationId);

    expect(createResponse.status).toBe(201);
    expect(applicationResponse.status).toBe(201);

    const response = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${anotherUserToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  test('should filter applications by status', async () => {
    const companyName = `Filter Company ${Date.now()}`;

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: companyName,
     });

     const companyId = createResponse.body.data.id;
     createdCompanyIds.push(companyId);

     // Create an application with status 'Applied'
     const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });
    const applicationId = applicationResponse.body.id;
    createdApplicationIds.push(applicationId);

    expect(createResponse.status).toBe(201);
    expect(applicationResponse.status).toBe(201);

    //create another application with status 'Interview'
    const anotherApplicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-12',
        companyid: companyId,
        position: 'Frontend Developer',
        location: 'Lagos',
        status: 'Interview'
      });
    const anotherApplicationId = anotherApplicationResponse.body.id;
    createdApplicationIds.push(anotherApplicationId);

    expect(anotherApplicationResponse.status).toBe(201);

    // Retrieve applications filtered by status 'Applied'
    const response = await request(app)
      .get('/api/applications?status=Applied')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);

    
    expect(
      response.body.data.every(application => application.status === 'Applied')
    ).toBe(true);

    const foundApplied = response.body.data.find(
      application => application.id === applicationId
    );

    const foundInterview = response.body.data.find(
      application => application.id === anotherApplicationId
    );

    expect(foundApplied).toBeDefined();
    expect(foundInterview).toBeUndefined();
  });

  test('should reject invalid status filter', async () => {
    const response = await request(app)
      .get('/api/applications?status=Pending')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid status value');
  });

  test('should filter applications by company name', async () => {
    //company 1
    const companyName1 = `Filter Company 1 ${Date.now()}`;

    const createResponse1 = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: companyName1,
      });

    const companyId1 = createResponse1.body.data.id;
    createdCompanyIds.push(companyId1);

    // Create an application for company 1
    const applicationResponse1 = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId1,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });
    const applicationId1 = applicationResponse1.body.id;
    createdApplicationIds.push(applicationId1);

    expect(createResponse1.status).toBe(201);
    expect(applicationResponse1.status).toBe(201);

    //company 2
    const companyName2 = `Filter Company 2 ${Date.now()}`;

    const createResponse2 = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: companyName2,
      });

    const companyId2 = createResponse2.body.data.id;
    createdCompanyIds.push(companyId2);

    // Create an application for company 2
    const applicationResponse2 = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-12',
        companyid: companyId2,
        position: 'Frontend Developer',
        location: 'Lagos',
        status: 'Interview'
      });
    const applicationId2 = applicationResponse2.body.id;
    createdApplicationIds.push(applicationId2);

    expect(createResponse2.status).toBe(201);
    expect(applicationResponse2.status).toBe(201);

    // Retrieve applications filtered by company name
    const response = await request(app)
      .get(`/api/applications?company=${encodeURIComponent(companyName1)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(
      response.body.data.every(application => application.company_name === companyName1)
    ).toBe(true);

    const foundApplication1 = response.body.data.find(
      application => application.id === applicationId1
    );

    const foundApplication2 = response.body.data.find(
      application => application.id === applicationId2
    );

    expect(foundApplication1).toBeDefined();
    expect(foundApplication2).toBeUndefined();  
  })

  test('should reject invalid company filter', async () => {

    const companyName = `NonExistentCompany-${Date.now()}`;

    const response = await request(app)
      .get(`/api/applications?company=${encodeURIComponent(companyName)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Company not found');
  }); 

  test('should apply pagination correctly', async () => {
    const companyName = `Pagination Company 1 ${Date.now()}`;
    

   // company
    const createResponse1 = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: companyName,
      });

    const companyId = createResponse1.body.data.id;
    createdCompanyIds.push(companyId);

    expect(createResponse1.status).toBe(201);

    //application 1

    const applicationResponse1 = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });
    const applicationId1 = applicationResponse1.body.id;
    createdApplicationIds.push(applicationId1);

    expect(applicationResponse1.status).toBe(201);

    //  application 2
    const applicationResponse2 = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-12',
        companyid: companyId,
        position: 'Frontend Developer',
        location: 'Lagos',
        status: 'Interview'
      });
    const applicationId2 = applicationResponse2.body.id;
    createdApplicationIds.push(applicationId2);

    expect(applicationResponse2.status).toBe(201);

    // application 3
    const applicationResponse3 = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-13',
        companyid: companyId,
        position: 'Fullstack Developer',
        location: 'Lagos',
        status: 'Offer'
      });
    const applicationId3 = applicationResponse3.body.id;
    createdApplicationIds.push(applicationId3);

    expect(applicationResponse3.status).toBe(201);

    // Retrieve applications with pagination 
    const response1 = await request(app)
      .get(`/api/applications?company=${encodeURIComponent(companyName)}&page=1&limit=2`)
      .set('Authorization', `Bearer ${token}`);

    expect(response1.status).toBe(200);
    expect(Array.isArray(response1.body.data)).toBe(true);
    expect(response1.body.data).toHaveLength(2);

    // Ensure that the applications returned are the correct ones based on pagination
    const applicationIds = response1.body.data.map(app => app.id);
    expect(applicationIds).toContain(applicationId2);
    expect(applicationIds).toContain(applicationId3);
    expect(applicationIds).not.toContain(applicationId1);

    // Retrieve the second page of applications
    const response2 = await request(app)
      .get(`/api/applications?company=${encodeURIComponent(companyName)}&page=2&limit=2`)
      .set('Authorization', `Bearer ${token}`);

    const applicationIdsPage2 = response2.body.data.map(app => app.id);

    expect(response2.status).toBe(200);
    expect(Array.isArray(response2.body.data)).toBe(true);
    expect(applicationIdsPage2).toEqual([applicationId1]);

  })

  test('should reject zero as page or limit', async () => {
      
    const pageResponse = await request(app)
      .get('/api/applications?page=0')
      .set('Authorization', `Bearer ${token}`);

    expect(pageResponse.status).toBe(400);
    expect(pageResponse.body.message).toBe('Page must be a positive integer and limit must be between 1 and 100');

    const limitResponse = await request(app)
      .get('/api/applications?limit=0')
      .set('Authorization', `Bearer ${token}`);

    expect(limitResponse.status).toBe(400);
    expect(limitResponse.body.message).toBe('Page must be a positive integer and limit must be between 1 and 100');
  });

  test('should reject decimal and non-numeric pagination values', async () => {
    
    const decimalResponse = await request(app)
      .get('/api/applications?page=1.5')
      .set('Authorization', `Bearer ${token}`);

    expect(decimalResponse.status).toBe(400);
    expect(decimalResponse.body.message).toBe('Page must be a positive integer and limit must be between 1 and 100');

    const nonNumericResponse = await request(app)
      .get('/api/applications?limit=abc')
      .set('Authorization', `Bearer ${token}`);

    expect(nonNumericResponse.status).toBe(400);
    expect(nonNumericResponse.body.message).toBe('Page must be a positive integer and limit must be between 1 and 100');

    const partiallyNumericResponse = await request(app)
      .get('/api/applications?limit=2abc')
      .set('Authorization', `Bearer ${token}`);

    expect(partiallyNumericResponse.status).toBe(400);
    expect(partiallyNumericResponse.body.message).toBe(
     'Page must be a positive integer and limit must be between 1 and 100'
    );
    
  });

  test('should reject a limit greater than 100', async () => {
    const response = await request(app)
      .get('/api/applications?limit=101')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Page must be a positive integer and limit must be between 1 and 100');
  });

  test('should accept a limit of 100', async () => {
    const response = await request(app)
      .get('/api/applications?limit=100')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  }); 
  
  test('should return pagination metadata for the first page', async () => {
    const companyName = `Pagination Company ${Date.now()}`;

    // company
    const createResponse = await request(app)
    .post('/api/companies')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: companyName,
    });

    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);
    expect(createResponse.status).toBe(201);

    // calculate the expected total applications and expected pages
    const initialCount = await pool.query(
      'SELECT COUNT(*) FROM applications WHERE userid = $1',
      [userId]
    );

    const existingApplications = Number(initialCount.rows[0].count);

    const expectedTotalApplications = existingApplications + 150;

    const expectedTotalPages = Math.ceil(expectedTotalApplications / 10);

    // 150 applications from the same company using a loop
    for (let i = 0; i < 150; i++) {
      const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: `Backend Developer ${i + 1}`,
        location: 'Lagos',
        status: 'Applied'
      });

      expect(applicationResponse.status).toBe(201);

      createdApplicationIds.push(applicationResponse.body.id);
    }

    const response = await request(app)
    .get('/api/applications?page=1&limit=10')
    .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(10);
    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        totalApplications: expectedTotalApplications,
        currentPage: 1,
        limit: 10,
        totalPages: expectedTotalPages,
        hasNextPage: true,
        hasPreviousPage: false
      })
    );
  });

  test('should return correct pagination metadata when filtering by status', async () => {

    const initialCount = await pool.query(
      `SELECT COUNT(*)
      FROM applications
      WHERE userid = $1 AND status = $2`,
      [userId, 'Applied']
    );

    const existingApplied = Number(initialCount.rows[0].count);

    const companyName = `Google Company ${Date.now()}`;

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: companyName,
     });

     const companyId = createResponse.body.data.id;
     createdCompanyIds.push(companyId);

     // Create an application with status 'Applied'
     const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });
    const applicationId = applicationResponse.body.id;
    createdApplicationIds.push(applicationId);

    expect(createResponse.status).toBe(201);
    expect(applicationResponse.status).toBe(201);

    const anotherApplicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-12',
        companyid: companyId,
        position: 'Frontend Developer',
        location: 'Lagos',
        status: 'Interview'
      });
    const anotherApplicationId = anotherApplicationResponse.body.id;
    createdApplicationIds.push(anotherApplicationId);

    expect(anotherApplicationResponse.status).toBe(201);
    // Retrieve applications filtered by status 'Applied'
    const response = await request(app)
      .get('/api/applications?status=Applied&page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);

    const expectedTotalApplications = existingApplied + 1;
    const expectedTotalPages = Math.ceil(expectedTotalApplications / 10);
    const expectedHasNextPage = expectedTotalPages > 1;


    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        totalApplications: expectedTotalApplications,
        currentPage: 1,
        limit: 10,
        totalPages: expectedTotalPages,
        hasNextPage: expectedHasNextPage,
        hasPreviousPage: false
      })
    );

    expect(
      response.body.data.every(application => application.status === 'Applied')
    ).toBe(true);
  });

  test('should return the correct applications on a later page', async () => {
    const companyName = `Later Page Company ${Date.now()}`;

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: companyName,
    });

    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    expect(createResponse.status).toBe(201);

    //create 3 applications for the same company

    const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-10',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });
    const applicationId = applicationResponse.body.id;
    createdApplicationIds.push(applicationId);

    expect(applicationResponse.status).toBe(201);


    const applicationResponse2 = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Interview'
      });
    const applicationId2 = applicationResponse2.body.id;
    createdApplicationIds.push(applicationId2);

    expect(applicationResponse2.status).toBe(201);


    const applicationResponse3 = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-13',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Offer'
      });
    const applicationId3 = applicationResponse3.body.id;
    createdApplicationIds.push(applicationId3);

    expect(applicationResponse3.status).toBe(201);

    const response = await request(app)
    .get(`/api/applications?company=${encodeURIComponent(companyName)}&page=2&limit=2`)
    .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].id).toBe(applicationId);

    expect(
      response.body.data.every(application => application.status === 'Applied')
    ).toBe(true);

    const beyondLastPage = await request(app)
    .get(`/api/applications?company=${encodeURIComponent(companyName)}&page=3&limit=2`)
    .set('Authorization', `Bearer ${token}`);

    expect(beyondLastPage.status).toBe(200);
    expect(beyondLastPage.body.data).toEqual([]);

    expect(beyondLastPage.body.pagination).toEqual(
      expect.objectContaining({
        totalApplications: 3,
        currentPage: 3,
        limit: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true
      })
    );
  });

 test('should filter applications by date range', async () => {

  const companyName = `Spotify ${Date.now()}`;

    const createResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: companyName,
     });

     const companyId = createResponse.body.data.id;
     createdCompanyIds.push(companyId);

     // Create an application with status 'Applied'
     const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-05',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });
    const applicationId = applicationResponse.body.id;
    createdApplicationIds.push(applicationId);

    expect(createResponse.status).toBe(201);
    expect(applicationResponse.status).toBe(201);

    const applicationResponse2 = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-10',
        companyid: companyId,
        position: 'Frontend Developer',
        location: 'Lagos',
        status: 'Interview'
      });
    const applicationId2 = applicationResponse2.body.id;
    createdApplicationIds.push(applicationId2);

    expect(applicationResponse2.status).toBe(201);

    const applicationResponse3 = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-20',
        companyid: companyId,
        position: 'Software Engineer',
        location: 'Lagos',
        status: 'Offer'
      });
    const applicationId3 = applicationResponse3.body.id;
    createdApplicationIds.push(applicationId3);

    expect(applicationResponse3.status).toBe(201);

    const response = await request(app)
    .get(`/api/applications?company=${encodeURIComponent(companyName)}&startDate=2026-11-06&endDate=2026-11-15`)
    .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(applicationId2);
 })

 test('should return 400 for invalid start date', async () => {
    const response = await request(app)
      .get('/api/applications?startDate=2026-02-30')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid start date');
  });

  test('should return 400 for an invalid end date', async () => {
    const response = await request(app)
      .get('/api/applications?endDate=2026-02-30')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid end date');
 });

 test('should return 400 when start date is later than end date', async () => {
    const response = await request(app)
      .get('/api/applications?startDate=2026-11-20&endDate=2026-11-10')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Start date cannot be later than end date'
    );
 });

  test('should filter applications by position using partial, case-insensitive matching', async () => {
    
    const companyName = `Test Company ${Date.now()}`;

    const createResponse = await request(app)
    .post('/api/companies')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: companyName,
    });

    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    // Create an application with status 'Applied'
    const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Backend Developer',
        location: 'Lagos',
        status: 'Applied'
      });

    const applicationId = applicationResponse.body.id;
    createdApplicationIds.push(applicationId);

    expect(createResponse.status).toBe(201);
    expect(applicationResponse.status).toBe(201);
    
    //second application
    
    const anotherApplicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: 'Frontend Developer',
        location: 'Lagos',
        status: 'Applied'
      });
    const anotherApplicationId = anotherApplicationResponse.body.id;
    createdApplicationIds.push(anotherApplicationId);

    expect(createResponse.status).toBe(201);
    expect(anotherApplicationResponse.status).toBe(201);

    const response = await request(app)
    .get(`/api/applications?company=${encodeURIComponent(companyName)}&position=backend`)
    .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(applicationId);

    expect(
      response.body.data.every((application) =>
        application.position.toLowerCase().includes('backend')
      )
    ).toBe(true);
  });

  test('should search applications by position, company name, and application location', async () => {
    const uniqueId = Date.now();
    
    const companyName1 = `Tech Company ${Date.now()}`;
    const companyName2 = `Paystack${uniqueId} Company`;
    const companyName3 = `Shell Company ${Date.now()}`;

    const expectSearchResult = async (term, expectedId) => {
      const response = await request(app)
        .get(`/api/applications?search=${term}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(expectedId);

      return response.body.data[0];
    };

    //first company
    const createResponse = await request(app)
    .post('/api/companies')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: companyName1,
    });

    const companyId = createResponse.body.data.id;
    createdCompanyIds.push(companyId);

    //second company
    const createResponse2 = await request(app)
    .post('/api/companies')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: companyName2,
    });

    const companyId2 = createResponse2.body.data.id;
    createdCompanyIds.push(companyId2);

    //third company
    const createResponse3 = await request(app)
    .post('/api/companies')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: companyName3,
    });

    const companyId3 = createResponse3.body.data.id;
    createdCompanyIds.push(companyId3);
    

    // Create an application with position 'Backend'
    const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId,
        position: `Backend${uniqueId} Developer`,
        location: 'Enugu',
        status: 'Applied'
      });

    const applicationId = applicationResponse.body.id;
    createdApplicationIds.push(applicationId);

    expect(createResponse.status).toBe(201);
    expect(applicationResponse.status).toBe(201);
    
    //second application with company name Paystack
    const anotherApplicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId2,
        position: 'Frontend Developer',
        location: 'Abuja',
        status: 'Applied'
      });
    const anotherApplicationId = anotherApplicationResponse.body.id;
    createdApplicationIds.push(anotherApplicationId);

    expect(createResponse2.status).toBe(201);
    expect(anotherApplicationResponse.status).toBe(201);

    //third application with company locaton lagos
    const thirdApplicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dateapplied: '2026-11-11',
        companyid: companyId3,
        position: 'Software Engineer',
        location: `Lagos${uniqueId}`,
        status: 'Applied'
      });
    const thirdApplicationId = thirdApplicationResponse.body.id;
    createdApplicationIds.push(thirdApplicationId);

    expect(createResponse3.status).toBe(201);
    expect(thirdApplicationResponse.status).toBe(201);

    //backend search response
    const backendResult = await expectSearchResult(
     `BACKEND${uniqueId}`,
      applicationId
    ); 

    //Paystack search response
    const paystackResult = await expectSearchResult(
      `PAYSTACK${uniqueId}`,
      anotherApplicationId
    );

    //Lagos search response
    const locationResult = await expectSearchResult(
      `LAGOS${uniqueId}`,
      thirdApplicationId
    );

    expect(backendResult.position.toLowerCase()).toContain(`backend${uniqueId}`.toLowerCase());

    expect(paystackResult.company_name.toLowerCase()).toContain(`paystack${uniqueId}`.toLowerCase());

    expect(locationResult.application_location.toLowerCase()).toContain(`lagos${uniqueId}`.toLowerCase());
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