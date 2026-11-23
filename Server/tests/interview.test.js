import { pool } from '../src/config/db.js';
import request from 'supertest';
import { app } from '../src/app.js';
import jwt from 'jsonwebtoken';


const createdInterviewIds = [];

const userId = '91e19194-0431-4a43-ba1a-7e499ee80c33';
const otherUserId = 'b8e5f7ab-3db2-40b8-a44a-9fa3dd39bbcc';

const token = jwt.sign(
  { userId },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const otherToken = jwt.sign(
  { userId: otherUserId },
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

    expect(savedInterview.rows).toHaveLength(1);
    expect(savedInterview.rows[0].application_id).toBe(
      '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'
    );
    expect(savedInterview.rows[0].status).toBe('Scheduled'); 

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);

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
    createdInterviewIds.push(response.body.data.id);
    expect(response.body.message).toBe('Interview created successfully');
  });

});

describe('GET /api/interviews', () => {

  beforeAll(async () => {
    
    await pool.query(
      `UPDATE applications
      SET status = 'Interview'
      WHERE id = $1`,
      ['75d3fa53-1523-41b4-854e-4315c9cb4033']
    );

    const response = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        application_id: '75d3fa53-1523-41b4-854e-4315c9cb4033',
        interview_date: '2026-12-15',
        interview_time: '11:00',
        timezone: 'Africa/Lagos',
        interview_type: 'Technical Interview'
      });

    expect(response.status).toBe(201);

    createdInterviewIds.push(response.body.data.id);
  });

  test('should return all interviews for the authenticated user', async () => {

    const result = await pool.query(
      `SELECT interviews.id
      FROM interviews
      JOIN applications
      ON interviews.application_id = applications.id
      WHERE applications.userid = $1
      ORDER BY interviews.interview_date ASC,
      interviews.interview_time ASC`,
      [userId]
    );

    const response = await request(app)
      .get('/api/interviews')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const expectedIds = result.rows.map(row => row.id);
    const actualIds = response.body.data.map(interview => interview.id);
    
    
    expect(Array.isArray(response.body.data)).toBe(true);
    
    expect(actualIds).toEqual(expectedIds);

  });

  test('should not return interviews belonging to another user', async () => {

    const result = await pool.query(
      `SELECT interviews.id
      FROM interviews
      JOIN applications
      ON interviews.application_id = applications.id
      WHERE applications.userid = $1
      ORDER BY interviews.interview_date ASC,
      interviews.interview_time ASC`,
      [otherUserId]
    );

    const response = await request(app)
    .get('/api/interviews')
    .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const actualIds = response.body.data.map(
      interview => interview.id
    );

    const otherUserInterviewIds = result.rows.map(
     row => row.id
    );

    expect(otherUserInterviewIds.length).toBeGreaterThan(0);

    for (const id of otherUserInterviewIds) {
      expect(actualIds).not.toContain(id);
    }

  })

});

describe('GET /api/interviews/:id', () => {

  test('should return a specific interview belonging to the authenticated user', async () => {
    
    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);

    const interviewId = response.body.data.id;

    const result = await request(app)
    .get(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)

   expect(result.status).toBe(200); 
   expect(result.body.data.id).toBe(interviewId);
   expect(result.body.data.application_id).toBe(applicationId);


  });

  test('should reject another user accessing interview belonging to another user', async () => {
    const applicationId = '75d3fa53-1523-41b4-854e-4315c9cb4033'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${otherToken}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });
    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);

    const interviewId = response.body.data.id;

    const result = await request(app)
    .get(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)

   expect(result.status).toBe(404); 

  })

  test('should reject non-existent interview', async () => {

    const interviewId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    const result = await request(app)
    .get(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)

   expect(result.status).toBe(404); 

  })

  test('should reject an invalid interview UUID', async () => {

    const result = await request(app)
    .get('/api/interviews/not-a-valid-uuid')
    .set('Authorization', `Bearer ${token}`)

   expect(result.status).toBe(400); 

  })
  
  test('should reject interview without authentication token', async () => {

    const result = await request(app)
    .get('/api/interviews/not-a-valid-uuid')

   expect(result.status).toBe(401); 

  })
  
});

describe('PATCH /api/interviews/:id', () => {
  test('should update only the interview date and other fields remain unchanged', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      interview_date: '2026-12-10'
    })

    expect(result.status).toBe(200);
    expect(result.body.data.interview_date).toBe('2026-12-10');
    expect(result.body.data.timezone).toBe('Africa/Lagos');
    expect(result.body.data.interview_type).toBe('Technical Interview');
    expect(result.body.data.interview_time).toBe('10:00:00');



  })

  test('should update interview_date, interview_time, and interview_type but timezone remains unchanged', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      interview_date: '2026-12-06',
      interview_time: '12:00',
      interview_type: 'HR Interview'
    });

    expect(result.status).toBe(200);
    expect(result.body.data.interview_date).toBe('2026-12-06');
    expect(result.body.data.timezone).toBe('Africa/Lagos');
    expect(result.body.data.interview_type).toBe('HR Interview');
    expect(result.body.data.interview_time).toBe('12:00:00');

  })

  test('should update optional fields with null', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'First round interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      interview_date: '2026-12-06',
      interview_time: '12:00',
      interview_type: 'HR Interview',
      location: null,
      meeting_link: null,
      notes: null
    });

    expect(result.status).toBe(200);
    expect(result.body.data.interview_date).toBe('2026-12-06');
    expect(result.body.data.timezone).toBe('Africa/Lagos');
    expect(result.body.data.interview_type).toBe('HR Interview');
    expect(result.body.data.interview_time).toBe('12:00:00');
    expect(result.body.data.location).toBe(null);
    expect(result.body.data.meeting_link).toBe(null);
    expect(result.body.data.notes).toBe(null);

  })

  test('should reject an empty patch request', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'First round interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({});

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Invalid interview data');

  })

  test('should reject an updating the status field as it is a protected field', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'First round interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      status: 'Completed'
    });

    const check = await pool.query(
      'SELECT status FROM interviews WHERE id = $1',
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Invalid interview data');
    expect(check.rows[0].status).toBe('Scheduled');

  })

  test('should reject user from updating another user application', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${otherToken}`)
    .send({
      interview_date: '2026-12-06',
      interview_time: '12:00',
      interview_type: 'HR Interview'
    });

    const check = await pool.query(
      `SELECT interview_date, interview_time, timezone, interview_type
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(404);
    expect(check.rows[0].interview_date).toBe('2026-12-01');
    expect(check.rows[0].timezone).toBe('Africa/Lagos');
    expect(check.rows[0].interview_type).toBe('Technical Interview');
    expect(check.rows[0].interview_time).toBe('10:00:00');
  })

  test('should reject updates for completed interviews', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'First round interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    await pool.query(
      `UPDATE interviews SET status = 'Completed' WHERE id = $1`,
      [ interviewId ]
    );

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      interview_date: '2026-12-09',
    });

    const check = await pool.query(
      'SELECT status FROM interviews WHERE id = $1',
      [interviewId]
    );

    expect(result.status).toBe(409);
    expect(result.body.message).toBe('Only interviews with the status of scheduled can be updated');
    expect(check.rows[0].status).toBe('Completed');

  })

  test('should reject updates for cancelled interviews', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'First round interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    await pool.query(
      `UPDATE interviews SET status = 'Cancelled' WHERE id = $1`,
      [ interviewId ]
    );

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      interview_date: '2026-12-01',
    });

    const check = await pool.query(
      'SELECT status, interview_date FROM interviews WHERE id = $1',
      [interviewId]
    );

    expect(result.status).toBe(409);
    expect(result.body.message).toBe('Only interviews with the status of scheduled can be updated');
    expect(check.rows[0].status).toBe('Cancelled');
    expect(check.rows[0].interview_date).toBe('2026-12-01');

  })

  test('should reject updates for rescheduled interviews', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-09',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'First round interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    await pool.query(
      `UPDATE interviews SET status = 'Rescheduled' WHERE id = $1`,
      [ interviewId ]
    );

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      interview_date: '2026-12-01',
    });

    const check = await pool.query(
      'SELECT status, interview_date FROM interviews WHERE id = $1',
      [interviewId]
    );

    expect(result.status).toBe(409);
    expect(result.body.message).toBe('Only interviews with the status of scheduled can be updated');
    expect(check.rows[0].status).toBe('Rescheduled');
    expect(check.rows[0].interview_date).toBe('2026-12-09');

  })
  
  test('should reject updates for invalid interview ID', async () => {

    const result = await request(app)
    .patch(`/api/interviews/not-a-valid-uuid`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      interview_date: '2026-12-01',
    });

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Invalid interview ID');
    
  })

  test('should reject updates without authentication token', async () => {

    const result = await request(app)
    .patch('/api/interviews/91e19194-0431-4a43-ba1a-7e499ee80c33')
    .send({
      interview_date: '2026-12-01',
    });

    expect(result.status).toBe(401);
    
  })

  test('should reject updates to application_id', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: '5e731112-e2ee-4bbd-8be4-8ed6dc1d09f5',
    });

    const check = await pool.query(
      `SELECT application_id
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(check.rows[0].application_id).toBe(applicationId);
  })

  test('should reject updates to status', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      status: 'Completed'
    });

    const check = await pool.query(
      `SELECT status
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(check.rows[0].status).toBe('Scheduled');
  })

  test('should reject updates to id', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      id: '91e19194-0431-4a43-ba1a-7e499ee80c33'
    });

    const check = await pool.query(
      `SELECT id
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(check.rows[0].id).toBe(interviewId);
  })

  test('should reject updates to created_at', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;
    const createdAt = response.body.data.created_at

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      created_at: '2026-11-20T10:00:00Z' 
    });

    const check = await pool.query(
      `SELECT created_at
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(new Date(check.rows[0].created_at).toISOString())
   .toBe(new Date(createdAt).toISOString());
  })

  test('should reject invalid interview date', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
     interview_date: '2026-02-30' 
    });

    const check = await pool.query(
      `SELECT interview_date
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(check.rows[0].interview_date).toBe('2026-12-01');
  })

  test('should reject invalid interview time', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
     interview_time: '25:90' 
    });

    const check = await pool.query(
      `SELECT interview_time
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(check.rows[0].interview_time).toBe('10:00:00');
  })

  test('should reject invalid timezone', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
     timezone: 'Africa/Lagos123' 
    });

    const check = await pool.query(
      `SELECT timezone
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(check.rows[0].timezone).toBe('Africa/Lagos');
  })

  test('should reject whitespace-only interview type', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
     interview_type: ' ' 
    });

    const check = await pool.query(
      `SELECT interview_type
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(check.rows[0].interview_type).toBe('Technical Interview');
  })

  test('should reject empty string', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
     interview_type: '' 
    });

    const check = await pool.query(
      `SELECT interview_type
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(400);
    expect(check.rows[0].interview_type).toBe('Technical Interview');
  })

  test('should update location with null', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
     location: null
    });

    const check = await pool.query(
      `SELECT location
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(200);
    expect(check.rows[0].location).toBeNull();
  })

  test('should update meeting_link with null', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
     meeting_link: null
    });

    const check = await pool.query(
      `SELECT meeting_link
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(200);
    expect(check.rows[0].meeting_link).toBeNull();
  })

  test('should update notes with null', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'Prepare technical questions'
    });

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;

    const result = await request(app)
    .patch(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
     notes: null
    });

    const check = await pool.query(
      `SELECT notes
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(result.status).toBe(200);
    expect(result.body.data.notes).toBeNull();
    expect(check.rows[0].notes).toBeNull();
  })

});

describe('POST /api/interviews/:id/reschedule', () => {

  test('should reschedule an interview and preserve the original record', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'Prepare technical questions',
      status: 'Scheduled'
    })

    expect(response.status).toBe(201);
    createdInterviewIds.push(response.body.data.id);
    const interviewId = response.body.data.id;


    const rescheduledResponse = await request(app)
    .post(`/api/interviews/${interviewId}/reschedule`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      interview_date: '2026-12-02',
      interview_time: '11:00'
    })

    expect(rescheduledResponse.status).toBe(201);
    createdInterviewIds.push(rescheduledResponse.body.data.id);
    const interviewId2 = rescheduledResponse.body.data.id;


    // 3. Check original interview in database
    const check = await pool.query(
      `SELECT *
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    // 4. Check new interview in database
    const check2 = await pool.query(
      `SELECT *
      FROM interviews
      WHERE id = $1`,
      [interviewId2]
    );

    // 5. Write assertions
    expect(check.rows[0].status).toBe('Rescheduled');
    expect(check2.rows[0].status).toBe('Scheduled');
    expect(check.rows[0].interview_date).toBe('2026-12-01');
    expect(check.rows[0].interview_time).toBe('10:00:00');
    expect(check2.rows[0].rescheduled_from_interview_id).toBe(interviewId);
    expect(check2.rows[0].interview_date).toBe('2026-12-02');
    expect(check2.rows[0].interview_time).toBe('11:00:00');
    expect(check2.rows[0].timezone).toBe('Africa/Lagos');
    expect(check2.rows[0].interview_type).toBe('Technical Interview');
    expect(check2.rows[0].location).toBe('Lagos, Nigeria');
    expect(check2.rows[0].meeting_link).toBe('https://zoom.us/join');
    expect(check2.rows[0].notes).toBe('Prepare technical questions');
    expect(interviewId2).not.toBe(interviewId);

  });
});

describe('DELETE /api/interviews/:id', () => {
  test('should accept authenticated owner deletes a Scheduled interview', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'Prepare technical questions',
    });

    expect(response.status).toBe(201);
    const interviewId = response.body.data.id;
    createdInterviewIds.push(interviewId);

    const result = await request(app)
    .delete(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${token}`)

    expect(result.status).toBe(200);

    const check = await pool.query(
      `SELECT *
      FROM interviews
      WHERE id = $1`,
      [interviewId]
    );

    expect(check.rows).toHaveLength(0);
  })

  test('should reject a user from deleting another user interview', async () => {
    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'Prepare technical questions',
    });

    expect(response.status).toBe(201);
    const interviewId = response.body.data.id;
    createdInterviewIds.push(interviewId);


    const result = await request(app)
    .delete(`/api/interviews/${interviewId}`)
    .set('Authorization', `Bearer ${otherToken}`);

    expect(result.status).toBe(404);

    // Confirm the interview still exists
    const check = await pool.query(
      'SELECT * FROM interviews WHERE id = $1',
      [interviewId]
    );

    expect(check.rows).toHaveLength(1);
    
  });

 test.each(['Completed', 'Cancelled', 'Rescheduled'])(
    'should reject deletion of an interview with %s status',
    async (status) => {
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

      expect(response.status).toBe(201);

      const interviewId = response.body.data.id;
      createdInterviewIds.push(interviewId);

      // Set the interview to the status being tested
      await pool.query(
        'UPDATE interviews SET status = $1 WHERE id = $2',
        [status, interviewId]
      );

      const result = await request(app)
        .delete(`/api/interviews/${interviewId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(result.status).toBe(409);

      // Confirm the interview still exists with its original status
      const check = await pool.query(
        'SELECT * FROM interviews WHERE id = $1',
        [interviewId]
      );

      expect(check.rows).toHaveLength(1);
      expect(check.rows[0].status).toBe(status);
    }
  );


  test('should reject an invalid interview UUID', async () => {
    const result = await request(app)
      .delete('/api/interviews/invalid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(result.status).toBe(400);
  });

  test('should reject deletion without authentication', async () => {
    const result = await request(app)
      .delete('/api/interviews/91e19194-0431-4a43-ba1a-7e499ee80c33');

    expect(result.status).toBe(401);
  });

  test('should return 404 when deleting a non-existent interview', async () => {
    const result = await request(app)
    .delete(`/api/interviews/00000000-0000-4000-8000-000000000001`)
    .set('Authorization', `Bearer ${token}`)

    expect(result.status).toBe(404);
    expect(result.body.message).toBe('Interview not found');
  })

  test('should delete only the selected interview without affecting its application or sibling interviews', async () => {

    const applicationId = '5e731112-e2ee-4bbd-8be4-8ed6dc1d09e0'

    const response1 = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'Technical Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'Prepare technical questions',
    });

    expect(response1.status).toBe(201);
    const interviewId1 = response1.body.data.id;
    createdInterviewIds.push(interviewId1);


    const response2 = await request(app)
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({
      application_id: applicationId,
      interview_date: '2026-12-01',
      interview_time: '10:00',
      timezone: 'Africa/Lagos',
      interview_type: 'HR Interview',
      location: 'Lagos, Nigeria',
      meeting_link: 'https://zoom.us/join',
      notes: 'Prepare technical questions',
    });

    expect(response2.status).toBe(201);
    const interviewId2 = response2.body.data.id;
    createdInterviewIds.push(interviewId2);

    const result1 = await request(app)
    .delete(`/api/interviews/${interviewId1}`)
    .set('Authorization', `Bearer ${token}`)

     expect(result1.status).toBe(200);

    const check = await pool.query(
      `SELECT *
      FROM interviews
      WHERE id = $1`,
      [interviewId1]
    );

    const check2 = await pool.query(
      `SELECT *
      FROM interviews
      WHERE id = $1`,
      [interviewId2]
    );

    const applicationCheck = await pool.query(
      `SELECT *
      FROM applications
      WHERE id = $1`,
      [applicationId]
    )

    expect(check.rows).toHaveLength(0);
    expect(check2.rows).toHaveLength(1);
    expect(applicationCheck.rows).toHaveLength(1);

  })


})


afterAll(async () => {

  if (createdInterviewIds.length > 0) {
    await pool.query(
    'DELETE FROM interviews WHERE id = ANY($1::uuid[])',
    [[...new Set(createdInterviewIds)]]
  );
  }

  await pool.query(
  `UPDATE applications
   SET status = 'Applied'
   WHERE id = $1`,
  ['75d3fa53-1523-41b4-854e-4315c9cb4033']
);

  await pool.end();
});