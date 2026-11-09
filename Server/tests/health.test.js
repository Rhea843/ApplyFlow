import request from 'supertest';
import { app } from '../src/app.js';

describe('GET /health', () => {
  test('should return status 200', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.message).toBe(
      'Job Application Tracker API is running'
    );
  
  });
});